/**
 * @jest-environment node
 */

import { apiError } from '@/lib/errors';
import { UserAgent, AgentLog } from '@prisma/client';
import { NextRequest } from 'next/server';

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
    agentLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
  },
}));

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));

jest.mock('@/lib/ip', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
}));

import { POST } from '@/app/api/agent/main/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireAuth } from '@/lib/auth-middleware';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockRequireAuth = requireAuth as jest.Mock;

function mockPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/agent/main', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/agent/main', () => {
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

  it('executes an action for an active agent', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: 'agent-1',
      userId: 'mock-user-id',
      status: 'ACTIVE',
      name: 'Test Agent',
      publicId: 'pub-agent-1',
    } as unknown as UserAgent);
    mockPrisma.userAgent.update.mockResolvedValue({
      id: 'agent-1',
      status: 'ACTIVE',
      publicId: 'pub-agent-1',
    } as unknown as UserAgent);
    mockPrisma.agentLog.create.mockResolvedValue({ id: 'log-1' } as unknown as AgentLog);

    const req = mockPostRequest({ action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.agentId).toBe('agent-1');
    expect(data.action).toBe('scan');
    expect(data.result).toContain('scan');
    expect(data.timestamp).toBeDefined();
  });

  it('executes an action with params', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: 'agent-1',
      userId: 'mock-user-id',
      status: 'ACTIVE',
      name: 'Test Agent',
      publicId: 'pub-agent-1',
    } as unknown as UserAgent);
    mockPrisma.userAgent.update.mockResolvedValue({
      id: 'agent-1',
      status: 'ACTIVE',
      publicId: 'pub-agent-1',
    } as unknown as UserAgent);
    mockPrisma.agentLog.create.mockResolvedValue({ id: 'log-2' } as unknown as AgentLog);

    const req = mockPostRequest({
      action: 'transfer',
      params: { amount: 100, recipient: 'addr' },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.action).toBe('transfer');
    expect(mockPrisma.agentLog.create).toHaveBeenCalled();
  });

  it('returns 400 when action is missing', async () => {
    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/agent/main', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when authentication fails', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      error: apiError('UNAUTHORIZED', 'Unauthorized'),
      user: null,
    });

    const req = mockPostRequest({ action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 when agent is not found', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({ action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 403 when agent is not active (INACTIVE)', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: 'agent-3',
      userId: 'mock-user-id',
      status: 'INACTIVE',
    } as unknown as UserAgent);

    const req = mockPostRequest({ action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe('FORBIDDEN');
  });

  it('returns 403 when agent is paused', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: 'agent-4',
      userId: 'mock-user-id',
      status: 'PAUSED',
    } as unknown as UserAgent);

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

  it('returns 500 on database error', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: 'agent-1',
      userId: 'mock-user-id',
      status: 'ACTIVE',
      name: 'Test Agent',
      publicId: 'pub-agent-1',
    } as unknown as UserAgent);
    mockPrisma.userAgent.update.mockRejectedValue(new Error('DB error'));

    const req = mockPostRequest({ action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});
