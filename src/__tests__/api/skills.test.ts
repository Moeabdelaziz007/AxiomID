/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    skill: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    anonymous: { windowMs: 60000, maxRequests: 30 },
    authenticated: { windowMs: 60000, maxRequests: 100 },
  },
}));

jest.mock('@/lib/ip', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
}));

import { GET, POST } from '@/app/api/skills/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

const sampleSkill = {
  id: 'skill-1',
  slug: 'agent-memory',
  name: 'Agent Memory',
  description: 'Persistent memory for agents',
  tier: 'BASIC_TOOL',
  pricePi: 0,
  version: '1.0.0',
  installCount: 42,
  avgRating: 4.5,
  ratingCount: 10,
  authorId: null,
  createdAt: new Date('2024-01-01'),
};

function mockGetRequest(url: string) {
  return new Request(url, { method: 'GET' }) as any;
}

function mockPostRequest(body: unknown) {
  return new Request('http://localhost/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('GET /api/skills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it('returns list of published skills', async () => {
    (mockPrisma.skill.findMany as jest.Mock).mockResolvedValue([sampleSkill]);
    (mockPrisma.skill.count as jest.Mock).mockResolvedValue(1);

    const req = mockGetRequest('http://localhost/api/skills');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.skills).toHaveLength(1);
    expect(data.skills[0].slug).toBe('agent-memory');
    expect(data.total).toBe(1);
    expect(data.hasMore).toBe(false);
  });

  it('filters by tier when ?tier= param is provided', async () => {
    (mockPrisma.skill.findMany as jest.Mock).mockResolvedValue([sampleSkill]);
    (mockPrisma.skill.count as jest.Mock).mockResolvedValue(1);

    const req = mockGetRequest('http://localhost/api/skills?tier=BASIC_TOOL');
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tier: 'BASIC_TOOL' }),
      })
    );
  });

  it('adds OR search when ?q= param is provided', async () => {
    (mockPrisma.skill.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.skill.count as jest.Mock).mockResolvedValue(0);

    const req = mockGetRequest('http://localhost/api/skills?q=memory');
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { name: { contains: 'memory', mode: 'insensitive' } },
          ]),
        }),
      })
    );
  });

  it('clamps limit to 100 even if caller asks for more', async () => {
    (mockPrisma.skill.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.skill.count as jest.Mock).mockResolvedValue(0);

    const req = mockGetRequest('http://localhost/api/skills?limit=999');
    const res = await GET(req);
    const data = await res.json();

    expect(data.limit).toBe(100);
    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it('applies pagination with offset parameter', async () => {
    (mockPrisma.skill.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.skill.count as jest.Mock).mockResolvedValue(200);

    const req = mockGetRequest('http://localhost/api/skills?offset=50&limit=50');
    const res = await GET(req);
    const data = await res.json();

    expect(data.offset).toBe(50);
    expect(data.hasMore).toBe(true); // 50 + 50 < 200
  });

  it('sets hasMore=false when all results are returned', async () => {
    (mockPrisma.skill.findMany as jest.Mock).mockResolvedValue([sampleSkill]);
    (mockPrisma.skill.count as jest.Mock).mockResolvedValue(1);

    const req = mockGetRequest('http://localhost/api/skills?limit=50&offset=0');
    const res = await GET(req);
    const data = await res.json();

    expect(data.hasMore).toBe(false);
  });

  it('only queries isPublished=true and status=PUBLISHED skills', async () => {
    (mockPrisma.skill.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.skill.count as jest.Mock).mockResolvedValue(0);

    const req = mockGetRequest('http://localhost/api/skills');
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPublished: true,
          status: 'PUBLISHED',
        }),
      })
    );
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockGetRequest('http://localhost/api/skills');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 500 on database error', async () => {
    (mockPrisma.skill.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = mockGetRequest('http://localhost/api/skills');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('returns empty skills array when no published skills exist', async () => {
    (mockPrisma.skill.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.skill.count as jest.Mock).mockResolvedValue(0);

    const req = mockGetRequest('http://localhost/api/skills');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.skills).toEqual([]);
    expect(data.total).toBe(0);
  });
});

describe('POST /api/skills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it('creates a skill with valid payload and returns 201', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.skill.create as jest.Mock).mockResolvedValue({
      id: 'new-skill-id',
      slug: 'my-skill',
      name: 'My Skill',
      tier: 'BASIC_TOOL',
      version: '1.0.0',
      status: 'PUBLISHED',
    });

    const req = mockPostRequest({
      slug: 'my-skill',
      name: 'My Skill',
      manifestMd: '# My Skill\nDoes things.',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.skillId).toBe('new-skill-id');
    expect(data.slug).toBe('my-skill');
    expect(data.status).toBe('PUBLISHED');
  });

  it('returns 409 when slug already exists', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(sampleSkill as any);

    const req = mockPostRequest({
      slug: 'agent-memory',
      name: 'Duplicate',
      manifestMd: '# Dup',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe('CONFLICT');
    expect(data.error).toContain('agent-memory');
  });

  it('returns 400 when slug is missing', async () => {
    const req = mockPostRequest({ name: 'No Slug', manifestMd: '# test' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when slug contains invalid characters (uppercase)', async () => {
    const req = mockPostRequest({
      slug: 'My-Skill',
      name: 'Bad Slug',
      manifestMd: '# test',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/slug must be lowercase/i);
  });

  it('returns 400 when slug contains spaces', async () => {
    const req = mockPostRequest({
      slug: 'my skill',
      name: 'Bad Slug',
      manifestMd: '# test',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when name is missing', async () => {
    const req = mockPostRequest({ slug: 'my-skill', manifestMd: '# test' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/name is required/i);
  });

  it('returns 400 when manifestMd is missing', async () => {
    const req = mockPostRequest({ slug: 'my-skill', name: 'My Skill' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/manifestMd is required/i);
  });

  it('returns 400 on invalid JSON body', async () => {
    const req = new Request('http://localhost/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    }) as any;
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('defaults tier to BASIC_TOOL when not provided', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.skill.create as jest.Mock).mockResolvedValue({
      id: 'skill-2',
      slug: 'free-skill',
      name: 'Free Skill',
      tier: 'BASIC_TOOL',
      version: '1.0.0',
      status: 'PUBLISHED',
    });

    const req = mockPostRequest({
      slug: 'free-skill',
      name: 'Free Skill',
      manifestMd: '# Free',
    });
    await POST(req);

    expect(mockPrisma.skill.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tier: 'BASIC_TOOL',
          pricePi: 0,
          version: '1.0.0',
          status: 'PUBLISHED',
          isPublished: true,
        }),
      })
    );
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ slug: 'x', name: 'x', manifestMd: 'x' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 500 on database error during create', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.skill.create as jest.Mock).mockRejectedValue(new Error('DB write failed'));

    const req = mockPostRequest({
      slug: 'new-skill',
      name: 'New Skill',
      manifestMd: '# New',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('sets pricePi from request body when provided as number', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.skill.create as jest.Mock).mockResolvedValue({
      id: 'skill-paid',
      slug: 'paid-skill',
      name: 'Paid Skill',
      tier: 'PRO',
      version: '2.0.0',
      status: 'PUBLISHED',
    });

    const req = mockPostRequest({
      slug: 'paid-skill',
      name: 'Paid Skill',
      manifestMd: '# Paid',
      pricePi: 5.5,
      tier: 'PRO',
      version: '2.0.0',
    });
    await POST(req);

    expect(mockPrisma.skill.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pricePi: 5.5,
          tier: 'PRO',
          version: '2.0.0',
        }),
      })
    );
  });
});