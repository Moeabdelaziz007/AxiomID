 
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    userAgent: {
      count: jest.fn(),
    },
    piPayment: {
      count: jest.fn(),
    },
  },
}));
jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { anonymous: { windowMs: 60000, maxRequests: 30 } },
}));
jest.mock('@/lib/ip', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
}));

import { GET } from '@/app/api/status/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

function mockGetRequest() {
  return new Request('http://localhost/api/status', { method: 'GET' }) as any;
}

function setupDbMocks({
  userCounts = [0, 0, 0],
  findMany = [] as unknown[],
  agentCounts = [0, 0],
  paymentCount = 0,
  xpSum = 0,
}: {
  userCounts?: [number, number, number];
  findMany?: unknown[];
  agentCounts?: [number, number];
  paymentCount?: number;
  xpSum?: number | null;
} = {}) {
  (mockPrisma.user.count as jest.Mock)
    .mockResolvedValueOnce(userCounts[0])
    .mockResolvedValueOnce(userCounts[1])
    .mockResolvedValueOnce(userCounts[2]);
  (mockPrisma.user.findMany as jest.Mock).mockResolvedValueOnce(findMany);
  (mockPrisma.userAgent.count as jest.Mock)
    .mockResolvedValueOnce(agentCounts[0])
    .mockResolvedValueOnce(agentCounts[1]);
  mockPrisma.piPayment.count.mockResolvedValue(paymentCount);
  (mockPrisma.user.aggregate as jest.Mock).mockResolvedValue({ _sum: { xp: xpSum } });
}

describe('GET /api/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it('returns network stats successfully', async () => {
    setupDbMocks({
      userCounts: [1247, 14, 89],
      findMany: [{ xp: 50, stamps: [{ id: '1' }] }],
      agentCounts: [856, 312],
      paymentCount: 8934,
      xpSum: 456789,
    });

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.network).toBe('axiomid');
    expect(data.version).toBe('1.0.0');
    expect(data.timestamp).toBeDefined();
    expect(data.stats.registeredUsers).toBe(1247);
    expect(data.stats.totalAgents).toBe(856);
    expect(data.stats.activeAgents).toBe(312);
    expect(data.stats.totalPayments).toBe(8934);
    expect(data.stats.totalXpEarned).toBe(456789);
    expect(data.stats.activeUsers).toBe(14);
  });

  it('handles null xpLedger sum gracefully (defaults to 0)', async () => {
    setupDbMocks({ xpSum: null });

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.stats.totalXpEarned).toBe(0);
    expect(data.stats.registeredUsers).toBe(0);
    expect(data.stats.activeUsers).toBe(1); // defaults to Math.max(1, 0)
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 500 on database error', async () => {
    mockPrisma.user.count.mockRejectedValue(new Error('DB connection failed'));

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('uses anonymous rate limit key (not authenticated)', async () => {
    setupDbMocks({ userCounts: [10, 1, 2], agentCounts: [5, 2], xpSum: 100 });

    const req = mockGetRequest();
    await GET(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining('status:'),
      expect.anything()
    );
  });

  it('timestamp is a valid ISO date string', async () => {
    setupDbMocks({ userCounts: [5, 1, 1], agentCounts: [3, 1], paymentCount: 2, xpSum: 500 });

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(() => new Date(data.timestamp)).not.toThrow();
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
  });
});