/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

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

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

function mockPostRequest(body: unknown) {
  return new Request('http://localhost/api/agent/main', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('POST /api/agent/main', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it('executes an action for an active agent', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', walletAddress: '0xabc' } as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: 'agent-1',
      userId: 'user-1',
      status: 'ACTIVE',
      name: 'Test Agent',
      publicId: 'pub-agent-1',
    } as any);
    mockPrisma.userAgent.update.mockResolvedValue({
      id: 'agent-1',
      status: 'ACTIVE',
      publicId: 'pub-agent-1',
    } as any);
    mockPrisma.agentLog.create.mockResolvedValue({ id: 'log-1' } as any);

    const req = mockPostRequest({ walletAddress: '0xabc', action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.agentId).toBe('agent-1');
    expect(data.action).toBe('scan');
    expect(data.result).toContain('scan');
    expect(data.timestamp).toBeDefined();
  });

  it('executes an action with params', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', walletAddress: '0xabc' } as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: 'agent-1',
      userId: 'user-1',
      status: 'ACTIVE',
      name: 'Test Agent',
      publicId: 'pub-agent-1',
    } as any);
    mockPrisma.userAgent.update.mockResolvedValue({
      id: 'agent-1',
      status: 'ACTIVE',
      publicId: 'pub-agent-1',
    } as any);
    mockPrisma.agentLog.create.mockResolvedValue({ id: 'log-2' } as any);

    const req = mockPostRequest({
      walletAddress: '0xabc',
      action: 'transfer',
      params: { amount: 100, recipient: 'addr' },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.action).toBe('transfer');
    // Verify that agentLog.create was called with params metadata
    expect(mockPrisma.agentLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          message: 'Executed action: transfer',
        }),
      })
    );
  });

  it('returns 400 when walletAddress is missing', async () => {
    const req = mockPostRequest({ action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when action is missing', async () => {
    const req = mockPostRequest({ walletAddress: '0xabc' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on invalid JSON body', async () => {
    const req = new Request('http://localhost/api/agent/main', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    }) as any;
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({ walletAddress: '0xnotfound', action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 404 when agent is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2', walletAddress: '0xnoagent' } as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({ walletAddress: '0xnoagent', action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 403 when agent is not active (INACTIVE)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-3', walletAddress: '0xinactive' } as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: 'agent-3',
      userId: 'user-3',
      status: 'INACTIVE',
    } as any);

    const req = mockPostRequest({ walletAddress: '0xinactive', action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe('FORBIDDEN');
  });

  it('returns 403 when agent is paused', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-4', walletAddress: '0xpaused' } as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: 'agent-4',
      userId: 'user-4',
      status: 'PAUSED',
    } as any);

    const req = mockPostRequest({ walletAddress: '0xpaused', action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe('FORBIDDEN');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ walletAddress: '0xabc', action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 500 on database error', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', walletAddress: '0xabc' } as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: 'agent-1',
      userId: 'user-1',
      status: 'ACTIVE',
      name: 'Test Agent',
      publicId: 'pub-agent-1',
    } as any);
    mockPrisma.userAgent.update.mockRejectedValue(new Error('DB error'));

    const req = mockPostRequest({ walletAddress: '0xabc', action: 'scan' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});