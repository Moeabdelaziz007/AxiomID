 
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
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

import { GET } from '@/app/api/user/status/route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function mockGet(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const url = `http://localhost/api/user/status?${qs}`;
  return new Request(url, { method: 'GET' }) as any;
}

describe('GET /api/user/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns user status for valid userId', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      walletAddress: '0x' + 'a'.repeat(40),
      piUid: 'pi-123',
      piUsername: 'testuser',
      did: 'did:axiom:test',
      kycStatus: 'VERIFIED',
      xp: 150,
      tier: 'Citizen',
      lastActive: new Date(),
      createdAt: new Date(),
      agent: { id: 'agent-1', publicId: 'ag_123', name: 'My Agent', status: 'ACTIVE', mode: 'AUTONOMOUS', personaId: null },
      actions: [],
      stamps: [],
      xpLedger: [],
      _count: { actions: 5, xpLedger: 10 },
    } as any);

    const req = mockGet({ userId: '550e8400-e29b-41d4-a716-446655440000' });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.userId).toBe('user-1');
    expect(data.tier).toBe('Citizen');
    expect(data.levelProgress).toBeGreaterThan(0);
    expect(typeof data.computedTrustScore).toBe('number');
  });

  it('returns 404 for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = mockGet({ userId: '550e8400-e29b-41d4-a716-446655440000' });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('calculates tier correctly for Sovereign user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'sovereign',
      walletAddress: '0x' + 'b'.repeat(40),
      piUid: null,
      piUsername: null,
      did: null,
      kycStatus: 'NONE',
      xp: 1500,
      tier: 'Sovereign',
      lastActive: null,
      createdAt: new Date(),
      agent: null,
      actions: [],
      stamps: [],
      xpLedger: [],
      _count: { actions: 0, xpLedger: 0 },
    } as any);

    const req = mockGet({ userId: '550e8400-e29b-41d4-a716-446655440000' });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tier).toBe('Sovereign');
    expect(data.levelProgress).toBe(100);
    expect(typeof data.computedTrustScore).toBe('number');
  });
});
