/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    skill: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userAgent: {
      findUnique: jest.fn(),
    },
    skillInstallation: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    authenticated: { windowMs: 60000, maxRequests: 100 },
  },
}));

jest.mock('@/lib/ip', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
}));

import { POST, DELETE } from '@/app/api/skills/[slug]/install/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireAuth } from '@/lib/auth-middleware';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockRequireAuth = requireAuth as jest.Mock;

const mockUser = {
  id: 'user-1',
  walletAddress: 'pi:uid1',
  piUid: 'pi-uid-1',
  piUsername: 'testuser',
  xp: 50,
  tier: 'Visitor',
};

const publishedSkill = {
  id: 'skill-1',
  slug: 'agent-memory',
  name: 'Agent Memory',
  isPublished: true,
  status: 'PUBLISHED',
  version: '1.0.0',
  tier: 'BASIC_TOOL',
  installCount: 5,
};

const mockAgent = {
  id: 'agent-1',
  name: 'TestBot',
  userId: 'user-1',
};

function mockPostRequest(slug: string) {
  return new Request(`http://localhost/api/skills/${slug}/install`, { method: 'POST' }) as any;
}

function mockDeleteRequest(slug: string) {
  return new Request(`http://localhost/api/skills/${slug}/install`, { method: 'DELETE' }) as any;
}

describe('POST /api/skills/[slug]/install', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it('creates a new installation and increments installCount', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(publishedSkill as any);
    (mockPrisma.userAgent.findUnique as jest.Mock).mockResolvedValue(mockAgent as any);
    (mockPrisma.skillInstallation.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.skillInstallation.create as jest.Mock).mockResolvedValue({
      id: 'install-1',
      skillId: 'skill-1',
      agentId: 'agent-1',
      status: 'active',
    });
    (mockPrisma.skill.update as jest.Mock).mockResolvedValue({ ...publishedSkill, installCount: 6 });

    const req = mockPostRequest('agent-memory');
    const res = await POST(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.installed).toBe(true);
    expect(data.skillSlug).toBe('agent-memory');
    expect(data.agentId).toBe('agent-1');
    expect(mockPrisma.skillInstallation.create).toHaveBeenCalled();
    expect(mockPrisma.skill.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { installCount: { increment: 1 } },
      })
    );
  });

  it('reactivates a disabled installation instead of creating a new one', async () => {
    const disabledInstallation = { id: 'install-disabled', status: 'disabled' };
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(publishedSkill as any);
    (mockPrisma.userAgent.findUnique as jest.Mock).mockResolvedValue(mockAgent as any);
    (mockPrisma.skillInstallation.findFirst as jest.Mock).mockResolvedValue(disabledInstallation as any);
    (mockPrisma.skillInstallation.update as jest.Mock).mockResolvedValue({
      ...disabledInstallation,
      status: 'active',
    });
    (mockPrisma.skill.update as jest.Mock).mockResolvedValue({ ...publishedSkill, installCount: 6 });

    const req = mockPostRequest('agent-memory');
    const res = await POST(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.installed).toBe(true);
    // Should update existing, not create new
    expect(mockPrisma.skillInstallation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'install-disabled' },
        data: { status: 'active', installedAt: expect.any(Date) },
      })
    );
    expect(mockPrisma.skillInstallation.create).not.toHaveBeenCalled();
  });

  it('returns 409 when skill is already installed and active', async () => {
    const activeInstallation = { id: 'install-active', status: 'active' };
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(publishedSkill as any);
    (mockPrisma.userAgent.findUnique as jest.Mock).mockResolvedValue(mockAgent as any);
    (mockPrisma.skillInstallation.findFirst as jest.Mock).mockResolvedValue(activeInstallation as any);

    const req = mockPostRequest('agent-memory');
    const res = await POST(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe('CONFLICT');
    expect(data.error).toMatch(/already installed/i);
  });

  it('returns 404 when skill is not found', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockPostRequest('nonexistent-skill');
    const res = await POST(req, { params: Promise.resolve({ slug: 'nonexistent-skill' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 403 when skill is not published', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue({
      ...publishedSkill,
      isPublished: false,
      status: 'DRAFT',
    } as any);

    const req = mockPostRequest('draft-skill');
    const res = await POST(req, { params: Promise.resolve({ slug: 'draft-skill' }) });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe('FORBIDDEN');
    expect(data.error).toMatch(/not available/i);
  });

  it('returns 403 when skill status is DRAFT (even if isPublished=true)', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue({
      ...publishedSkill,
      isPublished: true,
      status: 'DRAFT',
    } as any);

    const req = mockPostRequest('draft-skill');
    const res = await POST(req, { params: Promise.resolve({ slug: 'draft-skill' }) });
    const data = await res.json();

    expect(res.status).toBe(403);
  });

  it('returns 404 when user has no agent', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(publishedSkill as any);
    (mockPrisma.userAgent.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockPostRequest('agent-memory');
    const res = await POST(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/No agent found/i);
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest('agent-memory');
    const res = await POST(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 401 when not authenticated', async () => {
    const { apiError } = await import('@/lib/errors');
    mockRequireAuth.mockResolvedValue({
      error: apiError('UNAUTHORIZED', 'Not authenticated'),
      user: null,
    });

    const req = mockPostRequest('agent-memory');
    const res = await POST(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    expect(res.status).toBe(401);
  });

  it('returns 500 on database error', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = mockPostRequest('agent-memory');
    const res = await POST(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});

describe('DELETE /api/skills/[slug]/install', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it('deletes the installation and decrements installCount', async () => {
    const existingInstallation = { id: 'install-1', skillId: 'skill-1', agentId: 'agent-1', status: 'active' };
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(publishedSkill as any);
    (mockPrisma.userAgent.findUnique as jest.Mock).mockResolvedValue(mockAgent as any);
    (mockPrisma.skillInstallation.findFirst as jest.Mock).mockResolvedValue(existingInstallation as any);
    (mockPrisma.skillInstallation.delete as jest.Mock).mockResolvedValue(existingInstallation as any);
    (mockPrisma.skill.update as jest.Mock).mockResolvedValue({ ...publishedSkill, installCount: 4 });

    const req = mockDeleteRequest('agent-memory');
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.uninstalled).toBe(true);
    expect(data.skillSlug).toBe('agent-memory');
    expect(mockPrisma.skillInstallation.delete).toHaveBeenCalledWith({ where: { id: 'install-1' } });
    expect(mockPrisma.skill.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { installCount: { decrement: 1 } },
      })
    );
  });

  it('returns 404 when skill is not found', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockDeleteRequest('nonexistent');
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'nonexistent' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 404 when agent is not found', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(publishedSkill as any);
    (mockPrisma.userAgent.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockDeleteRequest('agent-memory');
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/No agent found/i);
  });

  it('returns 404 when skill is not installed', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(publishedSkill as any);
    (mockPrisma.userAgent.findUnique as jest.Mock).mockResolvedValue(mockAgent as any);
    (mockPrisma.skillInstallation.findFirst as jest.Mock).mockResolvedValue(null);

    const req = mockDeleteRequest('agent-memory');
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not installed/i);
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockDeleteRequest('agent-memory');
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 500 on database error', async () => {
    (mockPrisma.skill.findUnique as jest.Mock).mockRejectedValue(new Error('DB delete error'));

    const req = mockDeleteRequest('agent-memory');
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('returns 401 when not authenticated', async () => {
    const { apiError } = await import('@/lib/errors');
    mockRequireAuth.mockResolvedValue({
      error: apiError('UNAUTHORIZED', 'Not authenticated'),
      user: null,
    });

    const req = mockDeleteRequest('agent-memory');
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'agent-memory' }) });
    expect(res.status).toBe(401);
  });
});