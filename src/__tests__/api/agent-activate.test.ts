 
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
    $queryRaw: jest.fn(),
    userAgent: {
      findUnique: jest.fn(),
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

import { NextRequest } from "next/server";
import { POST } from '@/app/api/agent/activate/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireAuth } from '@/lib/auth-middleware';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockRequireAuth = requireAuth as jest.Mock;

function mockPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/agent/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}


import { UserAgent } from '@prisma/client';

describe('POST /api/agent/activate', () => {

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

  it('activates an INACTIVE agent successfully', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{
      id: 'agent-1',
      publicId: 'pub-agent-1',
      status: 'ACTIVE',
    }]);

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.agentId).toBe('agent-1');
    expect(data.status).toBe('ACTIVE');
  });

  it('activates a PAUSED agent successfully', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{
      id: 'agent-2',
      publicId: 'pub-agent-2',
      status: 'ACTIVE',
    }]);

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('ACTIVE');
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
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 409 when agent is already active', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'agent-4', userId: 'mock-user-id', status: 'ACTIVE' } as unknown as UserAgent);

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
    mockPrisma.$queryRaw.mockRejectedValue(new Error('DB connection failed'));

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});
