/* eslint-disable @typescript-eslint/no-explicit-any */
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
      updateManyAndReturn: jest.fn(),
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

import { POST } from '@/app/api/agent/activate/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireAuth } from '@/lib/auth-middleware';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockRequireAuth = requireAuth as jest.Mock;

function mockPostRequest(body: unknown) {
  return new Request('http://localhost/api/agent/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as any;
}

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
    mockPrisma.userAgent.updateManyAndReturn.mockResolvedValue([{
      id: 'agent-1',
      publicId: 'pub-agent-1',
      status: 'ACTIVE',
    }] as any);

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.agentId).toBe('agent-1');
    expect(data.status).toBe('ACTIVE');
  });

  it('activates a PAUSED agent successfully', async () => {
    mockPrisma.userAgent.updateManyAndReturn.mockResolvedValue([{
      id: 'agent-2',
      publicId: 'pub-agent-2',
      status: 'ACTIVE',
    }] as any);

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
    mockPrisma.userAgent.updateManyAndReturn.mockResolvedValue([] as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 409 when agent is already active', async () => {
    mockPrisma.userAgent.updateManyAndReturn.mockResolvedValue([] as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'agent-4', userId: 'mock-user-id', status: 'ACTIVE' } as any);

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
    mockPrisma.userAgent.updateManyAndReturn.mockRejectedValue(new Error('DB connection failed'));

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('includes publicId in success response', async () => {
    mockPrisma.userAgent.updateManyAndReturn.mockResolvedValue([{
      id: 'agent-1',
      publicId: 'pub-agent-1',
      status: 'ACTIVE',
    }] as any);

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.publicId).toBe('pub-agent-1');
    expect(data.agentId).toBe('agent-1');
    expect(data.status).toBe('ACTIVE');
  });

  it('calls updateManyAndReturn with correct where clause excluding ACTIVE status', async () => {
    mockPrisma.userAgent.updateManyAndReturn.mockResolvedValue([{
      id: 'agent-1',
      publicId: 'pub-agent-1',
      status: 'ACTIVE',
    }] as any);

    const req = mockPostRequest({});
    await POST(req);

    expect(mockPrisma.userAgent.updateManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'mock-user-id',
          status: { not: 'ACTIVE' },
        },
      })
    );
  });

  it('sets status, lastActive, and lastHeartbeat in the update data', async () => {
    mockPrisma.userAgent.updateManyAndReturn.mockResolvedValue([{
      id: 'agent-1',
      publicId: 'pub-agent-1',
      status: 'ACTIVE',
    }] as any);

    const req = mockPostRequest({});
    await POST(req);

    const callArgs = (mockPrisma.userAgent.updateManyAndReturn as jest.Mock).mock.calls[0][0];
    expect(callArgs.data.status).toBe('ACTIVE');
    expect(callArgs.data.lastActive).toBeInstanceOf(Date);
    expect(callArgs.data.lastHeartbeat).toBeInstanceOf(Date);
  });

  it('does not call findUnique when updateManyAndReturn returns results', async () => {
    mockPrisma.userAgent.updateManyAndReturn.mockResolvedValue([{
      id: 'agent-1',
      publicId: 'pub-agent-1',
      status: 'ACTIVE',
    }] as any);

    const req = mockPostRequest({});
    await POST(req);

    expect(mockPrisma.userAgent.findUnique).not.toHaveBeenCalled();
  });

  it('calls findUnique as fallback when updateManyAndReturn returns empty array', async () => {
    mockPrisma.userAgent.updateManyAndReturn.mockResolvedValue([] as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({});
    await POST(req);

    expect(mockPrisma.userAgent.findUnique).toHaveBeenCalledWith({
      where: { userId: 'mock-user-id' },
    });
  });

  it('uses only the first agent when updateManyAndReturn returns multiple records', async () => {
    mockPrisma.userAgent.updateManyAndReturn.mockResolvedValue([
      { id: 'agent-first', publicId: 'pub-first', status: 'ACTIVE' },
      { id: 'agent-second', publicId: 'pub-second', status: 'ACTIVE' },
    ] as any);

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.agentId).toBe('agent-first');
    expect(data.publicId).toBe('pub-first');
  });

  it('returns 500 when fallback findUnique throws a database error', async () => {
    mockPrisma.userAgent.updateManyAndReturn.mockResolvedValue([] as any);
    mockPrisma.userAgent.findUnique.mockRejectedValue(new Error('DB timeout'));

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('returns 404 error message directing user to create an agent', async () => {
    mockPrisma.userAgent.updateManyAndReturn.mockResolvedValue([] as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
    expect(data.error).toContain('POST /api/agent');
  });

  it('returns 409 error message indicating agent is already active', async () => {
    mockPrisma.userAgent.updateManyAndReturn.mockResolvedValue([] as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'agent-4', userId: 'mock-user-id', status: 'ACTIVE' } as any);

    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe('CONFLICT');
    expect(data.error).toContain('already active');
  });

  it('invokes updateManyAndReturn before the findUnique fallback (not in parallel)', async () => {
    const callOrder: string[] = [];
    mockPrisma.userAgent.updateManyAndReturn.mockImplementation(async () => {
      callOrder.push('updateManyAndReturn');
      return [];
    });
    mockPrisma.userAgent.findUnique.mockImplementation(async () => {
      callOrder.push('findUnique');
      return null;
    });

    const req = mockPostRequest({});
    await POST(req);

    expect(callOrder).toEqual(['updateManyAndReturn', 'findUnique']);
  });
});
