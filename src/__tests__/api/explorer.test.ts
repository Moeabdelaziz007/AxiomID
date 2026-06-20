/**
 * @jest-environment node
 *
 * Tests for src/app/api/explorer/route.ts (new in this PR)
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    userAgent: {
      count: jest.fn(),
    },
    piPayment: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 29, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { anonymous: { windowMs: 60000, maxRequests: 30 } },
}));

jest.mock('@/lib/ip', () => ({
  getClientIp: jest.fn(() => '10.0.0.1'),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { GET } from '@/app/api/explorer/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

function mockGetRequest() {
  return new Request('http://localhost/api/explorer', { method: 'GET' }) as any;
}

describe('GET /api/explorer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 29, resetAt: Date.now() + 60000 });

    // Default happy-path mocks
    (mockPrisma.user.count as jest.Mock).mockResolvedValue(500);
    (mockPrisma.userAgent.count as jest.Mock)
      .mockResolvedValueOnce(120)  // total agents
      .mockResolvedValueOnce(45);  // active agents
    (mockPrisma.piPayment.count as jest.Mock).mockResolvedValue(2345);
    (mockPrisma.user.aggregate as jest.Mock).mockResolvedValue({ _sum: { xp: 987654 } });
    (mockPrisma.piPayment.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.user.groupBy as jest.Mock).mockResolvedValue([]);
  });

  it('returns 200 with all required top-level fields', async () => {
    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('stats');
    expect(data).toHaveProperty('recentPayments');
    expect(data).toHaveProperty('activeNodes');
    expect(data).toHaveProperty('tierDistribution');
  });

  it('returns correct stats aggregates', async () => {
    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(data.stats.registeredUsers).toBe(500);
    expect(data.stats.totalAgents).toBe(120);
    expect(data.stats.activeAgents).toBe(45);
    expect(data.stats.totalPayments).toBe(2345);
    expect(data.stats.totalXpEarned).toBe(987654);
  });

  it('defaults totalXpEarned to 0 when aggregate returns null', async () => {
    (mockPrisma.user.aggregate as jest.Mock).mockResolvedValue({ _sum: { xp: null } });

    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.stats.totalXpEarned).toBe(0);
  });

  it('returns tierDistribution with all four tiers initialised to 0 when empty', async () => {
    (mockPrisma.user.groupBy as jest.Mock).mockResolvedValue([]);

    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(data.tierDistribution).toEqual({
      Visitor: 0,
      Citizen: 0,
      Validator: 0,
      Sovereign: 0,
    });
  });

  it('correctly maps tier group counts from the database', async () => {
    (mockPrisma.user.groupBy as jest.Mock).mockResolvedValue([
      { tier: 'Visitor',   _count: { id: 300 } },
      { tier: 'Citizen',   _count: { id: 150 } },
      { tier: 'Validator', _count: { id: 40 } },
      { tier: 'Sovereign', _count: { id: 10 } },
    ]);

    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(data.tierDistribution.Visitor).toBe(300);
    expect(data.tierDistribution.Citizen).toBe(150);
    expect(data.tierDistribution.Validator).toBe(40);
    expect(data.tierDistribution.Sovereign).toBe(10);
  });

  it('ignores unknown tier labels in the group-by result', async () => {
    (mockPrisma.user.groupBy as jest.Mock).mockResolvedValue([
      { tier: 'Visitor', _count: { id: 10 } },
      { tier: 'UNKNOWN_TIER', _count: { id: 99 } },
    ]);

    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(data.tierDistribution.Visitor).toBe(10);
    // Unknown tier should not appear on the response
    expect(data.tierDistribution).not.toHaveProperty('UNKNOWN_TIER');
  });

  it('returns recent payments in the response', async () => {
    const mockPayments = [
      {
        id: 'pay-1',
        amount: 3.14,
        status: 'COMPLETED',
        memo: 'Test payment',
        createdAt: new Date('2024-06-01'),
        user: { piUsername: 'alice', walletAddress: 'pi:alice' },
      },
    ];
    (mockPrisma.piPayment.findMany as jest.Mock).mockResolvedValue(mockPayments);

    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(Array.isArray(data.recentPayments)).toBe(true);
    expect(data.recentPayments).toHaveLength(1);
    expect(data.recentPayments[0].id).toBe('pay-1');
    expect(data.recentPayments[0].amount).toBe(3.14);
  });

  it('returns active nodes in the response', async () => {
    const mockNodes = [
      {
        id: 'user-1',
        piUsername: 'validator1',
        walletAddress: 'pi:validator1',
        did: 'did:axiom:v1',
        tier: 'Validator',
        xp: 800,
        agent: { name: 'Agent Alpha', status: 'ACTIVE' },
      },
    ];
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockNodes);

    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(Array.isArray(data.activeNodes)).toBe(true);
    expect(data.activeNodes).toHaveLength(1);
    expect(data.activeNodes[0].piUsername).toBe('validator1');
    expect(data.activeNodes[0].xp).toBe(800);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('uses explorer:<ip> as the rate limit key', async () => {
    await GET(mockGetRequest());

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      'explorer:10.0.0.1',
      expect.anything()
    );
  });

  it('returns 500 INTERNAL_ERROR on database failure', async () => {
    (mockPrisma.user.count as jest.Mock).mockRejectedValue(new Error('DB down'));

    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(data.error).toContain('Failed to retrieve network explorer datasets');
  });

  it('partial database failure (groupBy) still returns 500', async () => {
    (mockPrisma.user.groupBy as jest.Mock).mockRejectedValue(new Error('groupBy failed'));

    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});