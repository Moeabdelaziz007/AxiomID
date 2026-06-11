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
    agentLog: {
      create: jest.fn(),
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

import { POST } from '@/app/api/agent/main/route';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

const DEFAULT_AUTH_USER = {
  id: 'user-1',
  walletAddress: 'pi:testuser',
  piUid: 'pi-uid-1',
  piUsername: 'testuser',
  xp: 0,
  tier: 'Visitor',
};

const ACTIVE_AGENT = {
  id: 'agent-1',
  userId: 'user-1',
  status: 'ACTIVE',
  name: 'Test Agent',
  publicId: 'pub-agent-1',
};

function mockPostRequest(body: unknown) {
  return new Request('http://localhost/api/agent/main', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-pi-token',
    },
    body: JSON.stringify(body),
  }) as any;
}

describe('POST /api/agent/main', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: DEFAULT_AUTH_USER });
  });

  it('executes an action for an active agent', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(ACTIVE_AGENT as any);
    mockPrisma.userAgent.update.mockResolvedValue({
      id: 'agent-1',
      status: 'ACTIVE',
      publicId: 'pub-agent-1',
    } as any);
    mockPrisma.agentLog.create.mockResolvedValue({ id: 'log-1' } as any);

    const req = mockPostRequest({ action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.agentId).toBe('agent-1');
    expect(data.action).toBe('scan');
    expect(data.result).toContain('scan');
    expect(data.result).toContain('Test Agent');
    expect(data.timestamp).toBeDefined();
  });

  it('executes an action with params and logs metadata', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(ACTIVE_AGENT as any);
    mockPrisma.userAgent.update.mockResolvedValue({
      id: 'agent-1',
      status: 'ACTIVE',
      publicId: 'pub-agent-1',
    } as any);
    mockPrisma.agentLog.create.mockResolvedValue({ id: 'log-2' } as any);

    const req = mockPostRequest({
      action: 'transfer',
      params: { amount: 100, recipient: 'addr' },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.agentLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          message: 'Executed action: transfer',
          metadata: JSON.stringify({ amount: 100, recipient: 'addr' }),
        }),
      })
    );
  });

  it('creates an agentLog with correct fields', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(ACTIVE_AGENT as any);
    mockPrisma.userAgent.update.mockResolvedValue({ id: 'agent-1', status: 'ACTIVE', publicId: 'pub-1' } as any);
    mockPrisma.agentLog.create.mockResolvedValue({ id: 'log-1' } as any);

    const req = mockPostRequest({ action: 'ping' });
    await POST(req);

    expect(mockPrisma.agentLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        agentId: 'agent-1',
        level: 'info',
        source: 'agent',
        message: 'Executed action: ping',
      }),
    });
  });

  it('updates lastActive timestamp on action execution', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(ACTIVE_AGENT as any);
    mockPrisma.userAgent.update.mockResolvedValue({ id: 'agent-1', status: 'ACTIVE', publicId: 'pub-1' } as any);
    mockPrisma.agentLog.create.mockResolvedValue({ id: 'log-1' } as any);

    const req = mockPostRequest({ action: 'check' });
    await POST(req);

    expect(mockPrisma.userAgent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lastActive: expect.any(Date),
        }),
      })
    );
  });

  it('returns 400 when action is missing from body', async () => {
    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on invalid JSON body', async () => {
    const req = new Request('http://localhost/api/agent/main', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-pi-token',
      },
      body: 'not-valid-json',
    }) as any;
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when Authorization token is missing', async () => {
    mockRequireAuth.mockResolvedValue({
      error: { json: async () => ({ error: 'UNAUTHORIZED', code: 'UNAUTHORIZED' }), status: 401 } as any,
      user: null,
    });

    const req = new Request('http://localhost/api/agent/main', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'scan' }),
    }) as any;

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 404 when agent is not found', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({ action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 403 when agent is INACTIVE', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: 'agent-3',
      userId: 'user-1',
      status: 'INACTIVE',
    } as any);

    const req = mockPostRequest({ action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe('FORBIDDEN');
  });

  it('returns 403 when agent is PAUSED', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: 'agent-4',
      userId: 'user-1',
      status: 'PAUSED',
    } as any);

    const req = mockPostRequest({ action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe('FORBIDDEN');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 500 on database error during update', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(ACTIVE_AGENT as any);
    mockPrisma.userAgent.update.mockRejectedValue(new Error('DB error'));

    const req = mockPostRequest({ action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 on database error during findUnique', async () => {
    mockPrisma.userAgent.findUnique.mockRejectedValue(new Error('DB error'));

    const req = mockPostRequest({ action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('logs metadata as null when no params provided', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(ACTIVE_AGENT as any);
    mockPrisma.userAgent.update.mockResolvedValue({ id: 'agent-1', status: 'ACTIVE', publicId: 'pub-1' } as any);
    mockPrisma.agentLog.create.mockResolvedValue({ id: 'log-1' } as any);

    const req = mockPostRequest({ action: 'noop' });
    await POST(req);

    expect(mockPrisma.agentLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: null,
        }),
      })
    );
  });
});