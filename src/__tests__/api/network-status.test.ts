 
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      count: jest.fn(),
      aggregate: jest.fn(),
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

describe('GET /api/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it('returns network stats successfully', async () => {
    (mockPrisma.user.count as jest.Mock)
      .mockResolvedValueOnce(1247) // registeredUsers
      .mockResolvedValueOnce(14);   // activeUsers
    (mockPrisma.userAgent.count as jest.Mock)
      .mockResolvedValueOnce(856) // total agents
      .mockResolvedValueOnce(312); // active agents
    mockPrisma.piPayment.count.mockResolvedValue(8934);
    (mockPrisma.user.aggregate as jest.Mock).mockResolvedValue({ _sum: { xp: 456789 } } as any);

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
    (mockPrisma.user.count as jest.Mock)
      .mockResolvedValueOnce(0) // registeredUsers
      .mockResolvedValueOnce(0);   // activeUsers
    (mockPrisma.userAgent.count as jest.Mock)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockPrisma.piPayment.count.mockResolvedValue(0);
    (mockPrisma.user.aggregate as jest.Mock).mockResolvedValue({ _sum: { xp: null } } as any);

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
    (mockPrisma.user.count as jest.Mock)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(1);
    (mockPrisma.userAgent.count as jest.Mock)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2);
    mockPrisma.piPayment.count.mockResolvedValue(0);
    (mockPrisma.user.aggregate as jest.Mock).mockResolvedValue({ _sum: { xp: 100 } } as any);

    const req = mockGetRequest();
    await GET(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining('status:'),
      expect.anything()
    );
  });

  it('timestamp is a valid ISO date string', async () => {
    (mockPrisma.user.count as jest.Mock)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1);
    (mockPrisma.userAgent.count as jest.Mock)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    mockPrisma.piPayment.count.mockResolvedValue(2);
    (mockPrisma.user.aggregate as jest.Mock).mockResolvedValue({ _sum: { xp: 500 } } as any);

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(() => new Date(data.timestamp)).not.toThrow();
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
  });
});