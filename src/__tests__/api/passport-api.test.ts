/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
    userAgent: {
      findUnique: jest.fn(),
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

jest.mock('@/lib/did', () => ({
  createUserDid: jest.fn((id: string) => `did:axiom:axiomid.app:user:${id}`),
}));

jest.mock('@/lib/trust', () => ({
  calculateTrustScore: jest.fn(() => 10),
}));

import { GET } from '@/app/api/passport/[slug]/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

const baseUser = {
  id: 'user-1',
  did: 'did:axiom:axiomid.app:pi:uid1',
  piUsername: 'alice',
  walletAddress: 'pi:uid1',
  stellarAddress: 'GABC123',
  tier: 'Citizen',
  xp: 100,
  kycStatus: 'VERIFIED',
  createdAt: new Date('2024-01-01'),
  stamps: [{ type: 'pi_kyc' }],
  agent: { name: 'AliceBot', status: 'ACTIVE' },
};

function mockGetRequest(slug: string) {
  return new Request(`http://localhost/api/passport/${slug}`, { method: 'GET' }) as any;
}

describe('GET /api/passport/[slug] — consolidated OR query (new in PR)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
  });

  it('returns passport when matched by walletAddress via OR query', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(baseUser as any);

    const req = mockGetRequest('pi:uid1');
    const res = await GET(req, { params: Promise.resolve({ slug: 'pi:uid1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.walletAddress).toBe('pi:uid1');
    expect(data.username).toBe('alice');
    // Verify OR query was used (single findFirst call, not separate wallet/username/did calls)
    expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            { walletAddress: 'pi:uid1' },
            { piUsername: 'pi:uid1' },
            { did: 'pi:uid1' },
          ]),
        },
      })
    );
  });

  it('returns passport when matched by piUsername', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(baseUser as any);

    const req = mockGetRequest('alice');
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.username).toBe('alice');
  });

  it('returns passport when matched by DID', async () => {
    const did = 'did:axiom:axiomid.app:pi:uid1';
    mockPrisma.user.findFirst.mockResolvedValue(baseUser as any);

    const req = mockGetRequest(encodeURIComponent(did));
    const res = await GET(req, { params: Promise.resolve({ slug: encodeURIComponent(did) }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.did).toBe(did);
  });

  it('returns passport when matched by agent publicId (fast path)', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: 'agent-1',
      user: baseUser,
    } as any);

    const req = mockGetRequest('pub-agent-123');
    const res = await GET(req, { params: Promise.resolve({ slug: 'pub-agent-123' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    // findFirst should NOT have been called (agent fast path used)
    expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('returns 404 when no match found', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const req = mockGetRequest('unknown-slug');
    const res = await GET(req, { params: Promise.resolve({ slug: 'unknown-slug' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
    expect(data.error).toMatch(/No passport found/i);
  });

  it('returns 429 with X-RateLimit headers when rate limited (new in PR)', async () => {
    const resetAt = Date.now() + 30000;
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt });

    const req = mockGetRequest('alice');
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
  });

  it('returns 500 on database error', async () => {
    mockPrisma.user.findFirst.mockRejectedValue(new Error('DB down'));

    const req = mockGetRequest('alice');
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('decodes URL-encoded slug before querying', async () => {
    const encodedDid = encodeURIComponent('did:axiom:axiomid.app:pi:uid1');
    mockPrisma.user.findFirst.mockResolvedValue(baseUser as any);

    const req = mockGetRequest(encodedDid);
    const res = await GET(req, { params: Promise.resolve({ slug: encodedDid }) });

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            { walletAddress: 'did:axiom:axiomid.app:pi:uid1' },
            { piUsername: 'did:axiom:axiomid.app:pi:uid1' },
            { did: 'did:axiom:axiomid.app:pi:uid1' },
          ]),
        },
      })
    );
  });

  it('returns trust score and passport fields in response', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(baseUser as any);

    const req = mockGetRequest('alice');
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(data.trustScore).toBeDefined();
    expect(data.kyaStatus).toBe('verified');
    expect(data.tier).toBe('Citizen');
    expect(data.xp).toBe(100);
    expect(data.agentName).toBe('AliceBot');
    expect(data.issuedDate).toBeDefined();
  });

  it('handles user with null kycStatus as denied', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...baseUser,
      kycStatus: null,
    } as any);

    const req = mockGetRequest('alice');
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(data.kyaStatus).toBe('denied');
  });
});