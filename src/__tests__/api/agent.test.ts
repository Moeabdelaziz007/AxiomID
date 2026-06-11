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

import { POST } from '@/app/api/agent/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

function mockPostRequest(body: unknown) {
  return new Request('http://localhost/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('POST /api/agent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it('creates an agent for an existing user with default name', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', walletAddress: '0xabc' } as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
    mockPrisma.userAgent.create.mockResolvedValue({
      id: 'agent-1',
      publicId: 'pub-agent-1',
      name: 'My Agent',
      status: 'INACTIVE',
    } as any);

    const req = mockPostRequest({ walletAddress: '0xabc' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.agentId).toBe('agent-1');
    expect(data.name).toBe('My Agent');
    expect(data.status).toBe('INACTIVE');
  });

  it('creates an agent with custom name and description', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2', walletAddress: '0xdef' } as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
    mockPrisma.userAgent.create.mockResolvedValue({
      id: 'agent-2',
      publicId: 'pub-agent-2',
      name: 'Custom Agent',
      status: 'INACTIVE',
    } as any);

    const req = mockPostRequest({ walletAddress: '0xdef', name: 'Custom Agent', description: 'My custom description' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.name).toBe('Custom Agent');
  });

  it('returns 400 when walletAddress is missing', async () => {
    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on invalid JSON body', async () => {
    const req = new Request('http://localhost/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    }) as any;
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({ walletAddress: '0xnotfound' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 409 when user already has an agent', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-3', walletAddress: '0xexists' } as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue({ id: 'existing-agent' } as any);

    const req = mockPostRequest({ walletAddress: '0xexists' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe('CONFLICT');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ walletAddress: '0xabc' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 500 on database error', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', walletAddress: '0xabc' } as any);
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
    mockPrisma.userAgent.create.mockRejectedValue(new Error('DB error'));

    const req = mockPostRequest({ walletAddress: '0xabc' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});