 
/**
 * @jest-environment node
 */

import { apiError } from '@/lib/errors';

jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    userAgent: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));

jest.mock('@/lib/ip', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
}));

import { POST } from '@/app/api/agent/pause/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireAuth } from '@/lib/auth-middleware';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockRequireAuth = requireAuth as jest.Mock;

function mockPostRequest(body: unknown) {
  return new Request('http://localhost/api/agent/pause', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as any;
}

describe('POST /api/agent/pause', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({
      error: null,
      user: {
        id: 'mock-user-id',
        walletAddress: '0xabc',
        piUid: 'mock-pi-uid',
        piUsername: 'mockuser',
        xp: 0,
        tier: 'Beginner',
      },
    });
  });

  it('pauses an ACTIVE agent successfully', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'agent-1', userId: 'mock-user-id', status: 'ACTIVE' } as any);
    mockPrisma.userAgent.update.mockResolvedValue({
      id: 'agent-1',
      publicId: 'pub-agent-1',
      status: 'PAUSED',
    } as any);

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.agentId).toBe('agent-1');
    expect(data.status).toBe('PAUSED');
  });

  it('returns 401 when authentication fails', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      error: apiError('UNAUTHORIZED', 'Unauthorized'),
      user: null,
    });

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 when agent is not found', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 409 when agent is not currently active (INACTIVE)', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'agent-3', userId: 'mock-user-id', status: 'INACTIVE' } as any);

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe('CONFLICT');
  });

  it('returns 409 when agent is already paused', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'agent-4', userId: 'mock-user-id', status: 'PAUSED' } as any);

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe('CONFLICT');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 500 on database error', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'agent-1', userId: 'mock-user-id', status: 'ACTIVE' } as any);
    mockPrisma.userAgent.update.mockRejectedValue(new Error('Database unavailable'));

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});
