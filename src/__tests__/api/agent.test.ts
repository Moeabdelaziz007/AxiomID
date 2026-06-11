/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    userAgent: {
      findUnique: jest.fn(),
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

import { POST } from '@/app/api/agent/route';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { checkRateLimit } from '@/lib/rate-limiter';
import { DEFAULT_AUTH_USER, makeAuthError } from '@/__tests__/helpers/api-test-helpers';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

function mockPostRequest(body: unknown = {}) {
  return new Request('http://localhost/api/agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-pi-token',
    },
    body: JSON.stringify(body),
  }) as any;
}

describe('POST /api/agent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: DEFAULT_AUTH_USER });
  });

  it('creates an agent for an existing user with default name', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
    mockPrisma.userAgent.create.mockResolvedValue({
      id: 'agent-1',
      publicId: 'pub-agent-1',
      name: 'My Agent',
      status: 'INACTIVE',
    } as any);

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.agentId).toBe('agent-1');
    expect(data.name).toBe('My Agent');
    expect(data.status).toBe('INACTIVE');
    expect(data.publicId).toBe('pub-agent-1');
  });

  it('creates an agent with custom name and description', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
    mockPrisma.userAgent.create.mockResolvedValue({
      id: 'agent-2',
      publicId: 'pub-agent-2',
      name: 'Custom Agent',
      status: 'INACTIVE',
    } as any);

    const req = mockPostRequest({ name: 'Custom Agent', description: 'My custom description' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.name).toBe('Custom Agent');
  });

  it('creates agent with INACTIVE status and AUTONOMOUS mode', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
    mockPrisma.userAgent.create.mockResolvedValue({
      id: 'agent-1',
      publicId: 'pub-1',
      name: 'My Agent',
      status: 'INACTIVE',
    } as any);

    const req = mockPostRequest();
    await POST(req);

    expect(mockPrisma.userAgent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        status: 'INACTIVE',
        mode: 'AUTONOMOUS',
      }),
    });
  });

  it('uses default name "My Agent" when name not provided', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
    mockPrisma.userAgent.create.mockResolvedValue({
      id: 'agent-1',
      publicId: 'pub-1',
      name: 'My Agent',
      status: 'INACTIVE',
    } as any);

    const req = mockPostRequest();
    await POST(req);

    expect(mockPrisma.userAgent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'My Agent',
      }),
    });
  });

  it('returns 400 on invalid JSON body', async () => {
    const req = new Request('http://localhost/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-pi-token',
      },
      body: 'not-json',
    }) as any;
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when Authorization token is missing', async () => {
    mockRequireAuth.mockResolvedValue({ error: makeAuthError(), user: null });

    const res = await POST(mockPostRequest());
    expect(res.status).toBe(401);
  });

  it('returns 409 when user already has an agent', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'existing-agent' } as any);

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

  it('returns 500 on database error during create', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
    mockPrisma.userAgent.create.mockRejectedValue(new Error('DB error'));

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 on database error during findUnique', async () => {
    mockPrisma.userAgent.findUnique.mockRejectedValue(new Error('DB error'));

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('looks up agent by user.id from auth token', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
    mockPrisma.userAgent.create.mockResolvedValue({
      id: 'agent-1',
      publicId: 'pub-1',
      name: 'My Agent',
      status: 'INACTIVE',
    } as any);

    const req = mockPostRequest();
    await POST(req);

    expect(mockPrisma.userAgent.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });
});