/**
 * @jest-environment node
 */

jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn(),
}));

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

jest.mock('@/lib/stellar-anchoring', () => ({
  anchorVcHash: jest.fn().mockResolvedValue({
    txHash: 'mock-hash',
    stellarTxId: 'mock-tx-id',
    memo: 'mock-hash',
    timestamp: '2026-01-01T00:00:00Z',
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import { POST } from '@/app/api/passport/[slug]/publish/route';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { anchorVcHash } from '@/lib/stellar-anchoring';

const mockRequireAuth = requireAuth as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function mockPostRequest(body: unknown) {
  return new Request('http://localhost/api/passport/testuser/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as any;
}

describe('POST /api/passport/[slug]/publish', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      error: null,
      user: {
        id: 'user-id-1',
        walletAddress: '0xabc',
        piUid: 'mock-pi-uid',
        piUsername: 'testuser',
      },
    });
  });

  it('publishes passport successfully when authorized', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-id-1',
      walletAddress: '0xabc',
      piUsername: 'testuser',
      did: 'did:axiom:testuser',
      tier: 'Expert',
      xp: 150,
      kycStatus: 'VERIFIED',
      createdAt: new Date(),
      stamps: [{ type: 'complete_kyc', provider: 'pi' }],
    } as any);

    const req = mockPostRequest({});
    const res = await POST(req, { params: Promise.resolve({ slug: 'testuser' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.cid).toBeDefined();
    expect(data.url).toContain(data.cid);
    expect(data.verifiableCredential).toBeDefined();
    expect(data.verifiableCredential.type).toContain("AxiomPassportCredential");
  });

  it('blocks publication when unauthorized (not owner)', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-id-2', // Different owner
      walletAddress: '0xdef',
      piUsername: 'otheruser',
      did: 'did:axiom:otheruser',
      tier: 'Beginner',
      xp: 0,
      createdAt: new Date(),
    } as any);

    const req = mockPostRequest({});
    const res = await POST(req, { params: Promise.resolve({ slug: 'otheruser' }) });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe('FORBIDDEN');
    expect(data.error).toContain('not authorized to publish');
  });

  it('anchors VC to Stellar when STELLAR_SECRET_KEY is set', async () => {
    const originalSecret = process.env.STELLAR_SECRET_KEY;
    process.env.STELLAR_SECRET_KEY = 'SBOGBJFCSV52T4KJQ3C5GZCHAEYF7E2ZGVMQHT4YQYJN3ZOO6F6W3G3Y';
    try {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-id-1',
        walletAddress: '0xabc',
        piUsername: 'testuser',
        did: 'did:axiom:testuser',
        tier: 'Expert',
        xp: 150,
        kycStatus: 'VERIFIED',
        createdAt: new Date(),
        stamps: [{ type: 'complete_kyc', provider: 'pi' }],
      } as any);

      const req = mockPostRequest({});
      const res = await POST(req, { params: Promise.resolve({ slug: 'testuser' }) });
      await res.json();

      expect(res.status).toBe(200);
      expect(anchorVcHash).toHaveBeenCalledTimes(1);
      expect(anchorVcHash).toHaveBeenCalledWith(
        expect.objectContaining({ type: expect.arrayContaining(['AxiomPassportCredential']) }),
        'SBOGBJFCSV52T4KJQ3C5GZCHAEYF7E2ZGVMQHT4YQYJN3ZOO6F6W3G3Y',
      );
    } finally {
      if (originalSecret === undefined) {
        delete process.env.STELLAR_SECRET_KEY;
      } else {
        process.env.STELLAR_SECRET_KEY = originalSecret;
      }
    }
  });
});
