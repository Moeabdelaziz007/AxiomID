/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    skill: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

import { GET, PATCH, DELETE } from '@/app/api/skills/[slug]/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

const sampleSkill = {
  id: 'skill-1',
  slug: 'agent-memory',
  name: 'Agent Memory',
  description: 'Persistent memory for agents',
  manifestMd: '# Agent Memory\n<skill name="agent-memory"></skill>',
  agentScript: null,
  testSuite: null,
  tier: 'BASIC_TOOL' as const,
  pricePi: 0,
  version: '1.0.0',
  status: 'PUBLISHED' as const,
  isPublished: true,
  installCount: 42,
  avgRating: 4.5,
  ratingCount: 10,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-06-01'),
  _count: { installations: 42, reviews: 10 },
};

function mockRequest(method: string, slug: string, body?: unknown) {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  return new Request(`http://localhost/api/skills/${slug}`, init) as any;
}

describe('GET /api/skills/[slug]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it('returns full skill detail including manifest and counts', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(sampleSkill);

    const req = mockRequest('GET', 'agent-memory');
    const res = await GET(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.slug).toBe('agent-memory');
    expect(data.name).toBe('Agent Memory');
    expect(data.manifestMd).toContain('agent-memory');
    expect(data.installationCount).toBe(42);
    expect(data.reviewCount).toBe(10);
  });

  it('returns 404 when skill slug is not found', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockRequest('GET', 'nonexistent');
    const res = await GET(req, { params: Promise.resolve({ slug: 'nonexistent' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
    expect(data.error).toContain('nonexistent');
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockRequest('GET', 'any-skill');
    const res = await GET(req, { params: Promise.resolve({ slug: 'any-skill' }) });
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 500 on database error', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = mockRequest('GET', 'error-skill');
    const res = await GET(req, { params: Promise.resolve({ slug: 'error-skill' }) });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('includes all expected fields in response', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(sampleSkill);

    const req = mockRequest('GET', 'agent-memory');
    const res = await GET(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('slug');
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('tier');
    expect(data).toHaveProperty('pricePi');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('isPublished');
    expect(data).toHaveProperty('avgRating');
    expect(data).toHaveProperty('ratingCount');
    expect(data).toHaveProperty('installationCount');
    expect(data).toHaveProperty('reviewCount');
  });
});

describe('PATCH /api/skills/[slug]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it('updates allowed fields and returns updated skill', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(sampleSkill);
    (mockPrisma.skill.update as jest.Mock).mockResolvedValue({
      ...sampleSkill,
      name: 'Updated Name',
      version: '1.1.0',
    });

    const req = mockRequest('PATCH', 'agent-memory', { name: 'Updated Name', version: '1.1.0' });
    const res = await PATCH(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe('Updated Name');
    expect(data.version).toBe('1.1.0');
  });

  it('only sends allowed fields to the database update', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(sampleSkill);
    (mockPrisma.skill.update as jest.Mock).mockResolvedValue(sampleSkill);

    const req = mockRequest('PATCH', 'agent-memory', {
      name: 'New Name',
      id: 'injected-id',           // not allowed
      installCount: 9999,          // not allowed
      someRandomField: 'hacked',   // not allowed
    });
    await PATCH(req, { params: Promise.resolve({ slug: 'agent-memory' }) });

    const updateCall = (mockPrisma.skill.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data).toHaveProperty('name', 'New Name');
    expect(updateCall.data).not.toHaveProperty('id');
    expect(updateCall.data).not.toHaveProperty('installCount');
    expect(updateCall.data).not.toHaveProperty('someRandomField');
  });

  it('returns 404 when skill does not exist', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockRequest('PATCH', 'missing-skill', { name: 'Update' });
    const res = await PATCH(req, { params: Promise.resolve({ slug: 'missing-skill' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 400 when body is invalid JSON', async () => {
    const req = new Request('http://localhost/api/skills/agent-memory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad-json',
    }) as any;
    const res = await PATCH(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when body is null/non-object', async () => {
    const req = mockRequest('PATCH', 'agent-memory', null);
    const res = await PATCH(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockRequest('PATCH', 'agent-memory', { name: 'x' });
    const res = await PATCH(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(429);
  });

  it('returns 500 on database error', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(sampleSkill);
    (mockPrisma.skill.update as jest.Mock).mockRejectedValue(new Error('DB write error'));

    const req = mockRequest('PATCH', 'agent-memory', { name: 'New' });
    const res = await PATCH(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});

describe('DELETE /api/skills/[slug]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it('deletes skill and returns { deleted: true, slug }', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(sampleSkill);
    (mockPrisma.skill.delete as jest.Mock).mockResolvedValue(sampleSkill);

    const req = mockRequest('DELETE', 'agent-memory');
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.deleted).toBe(true);
    expect(data.slug).toBe('agent-memory');
  });

  it('returns 404 when skill does not exist', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockRequest('DELETE', 'ghost-skill');
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'ghost-skill' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
    expect(data.error).toContain('ghost-skill');
  });

  it('calls prisma.skill.delete with the correct slug', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(sampleSkill);
    (mockPrisma.skill.delete as jest.Mock).mockResolvedValue(sampleSkill);

    const req = mockRequest('DELETE', 'agent-memory');
    await DELETE(req, { params: Promise.resolve({ slug: 'agent-memory' }) });

    expect(mockPrisma.skill.delete).toHaveBeenCalledWith({ where: { slug: 'agent-memory' } });
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockRequest('DELETE', 'agent-memory');
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 500 on database error during delete', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(sampleSkill);
    (mockPrisma.skill.delete as jest.Mock).mockRejectedValue(new Error('DB delete failed'));

    const req = mockRequest('DELETE', 'agent-memory');
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});