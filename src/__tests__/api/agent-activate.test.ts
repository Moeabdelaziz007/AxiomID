/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
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
jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    error: null,
    user: {
      id: 'user-1',
      walletAddress: 'pi:testuser',
      piUid: 'pi-uid-1',
      piUsername: 'testuser',
      xp: 0,
      tier: 'Visitor',
    },
  }),
}));

import { POST } from '@/app/api/agent/activate/route';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { checkRateLimit } from '@/lib/rate-limiter';
import { DEFAULT_AUTH_USER, makeAuthError } from '@/__tests__/helpers/api-test-helpers';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

function mockPostRequest() {
  return new Request('http://localhost/api/agent/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-pi-token',
    },
    body: JSON.stringify({}),
  }) as any;
}

describe('POST /api/agent/activate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: DEFAULT_AUTH_USER });
  });

  it('activates an INACTIVE agent successfully', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'agent-1', userId: 'user-1', status: 'INACTIVE' } as any);
    mockPrisma.userAgent.update.mockResolvedValue({
      id: 'agent-1',
      publicId: 'pub-agent-1',
      status: 'ACTIVE',
    } as any);

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.agentId).toBe('agent-1');
    expect(data.status).toBe('ACTIVE');
    expect(data.publicId).toBe('pub-agent-1');
  });

  it('activates a PAUSED agent successfully', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'agent-2', userId: 'user-1', status: 'PAUSED' } as any);
    mockPrisma.userAgent.update.mockResolvedValue({
      id: 'agent-2',
      publicId: 'pub-agent-2',
      status: 'ACTIVE',
    } as any);

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('ACTIVE');
  });

  it('updates lastActive and lastHeartbeat timestamps on activation', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'agent-1', userId: 'user-1', status: 'INACTIVE' } as any);
    mockPrisma.userAgent.update.mockResolvedValue({
      id: 'agent-1',
      publicId: 'pub-agent-1',
      status: 'ACTIVE',
    } as any);

    const req = mockPostRequest();
    await POST(req);

    expect(mockPrisma.userAgent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ACTIVE',
          lastActive: expect.any(Date),
          lastHeartbeat: expect.any(Date),
        }),
      })
    );
  });

  it('returns 401 when Authorization token is missing', async () => {
    mockRequireAuth.mockResolvedValue({ error: makeAuthError(), user: null });

    const res = await POST(mockPostRequest());
    expect(res.status).toBe(401);
  });

  it('returns 404 when agent is not found for this user', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 409 when agent is already active', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'agent-4', userId: 'user-1', status: 'ACTIVE' } as any);

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe('CONFLICT');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 500 on database error during update', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'agent-1', userId: 'user-1', status: 'INACTIVE' } as any);
    mockPrisma.userAgent.update.mockRejectedValue(new Error('DB connection failed'));

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 on database error during findUnique', async () => {
    mockPrisma.userAgent.findUnique.mockRejectedValue(new Error('DB connection error'));

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('looks up agent by user.id from auth token (not from request body)', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'agent-1', userId: 'user-1', status: 'INACTIVE' } as any);
    mockPrisma.userAgent.update.mockResolvedValue({ id: 'agent-1', publicId: 'pub-1', status: 'ACTIVE' } as any);

    const req = mockPostRequest();
    await POST(req);

    expect(mockPrisma.userAgent.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });
});