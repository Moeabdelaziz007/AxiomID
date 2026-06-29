/**
 * @jest-environment node
 */

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock('@/lib/ip', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
}));

jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/pi-kyc', () => ({
  verifyKycServerSide: jest.fn(),
}));

jest.mock('@/lib/trust-score', () => ({
  computeTrustScore: jest.fn().mockReturnValue(45),
}));

jest.mock('@/lib/trust-chain', () => ({
  calculateActionHash: jest.fn().mockReturnValue('a'.repeat(64)),
  GENESIS_HASH: '0'.repeat(64),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(async (fn: any) => fn({
      stamp: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      user: { update: jest.fn().mockResolvedValue({ xp: 200 }) },
      xpLedger: { create: jest.fn().mockResolvedValue({}) },
      action: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    })),
  },
}));

import { POST } from '@/app/api/pi/kya/verify/route';
import { requireAuth } from '@/lib/auth-middleware';
import { verifyKycServerSide } from '@/lib/pi-kyc';
import { computeTrustScore } from '@/lib/trust-score';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockRequireAuth = requireAuth as jest.Mock;
const mockVerifyKyc = verifyKycServerSide as jest.Mock;
const mockComputeTrust = computeTrustScore as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

function mockPostRequest(body: unknown) {
  return new Request('http://localhost/api/pi/kya/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as any;
}

describe('POST /api/pi/kya/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      error: null,
      user: { id: 'user-1', piUid: 'pi-123', piUsername: 'testuser', walletAddress: 'pi:pi-123' },
    });
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it('returns 400 without accessToken', async () => {
    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 with empty accessToken', async () => {
    const req = mockPostRequest({ accessToken: '' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ accessToken: 'valid-token' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns KYC verified status on success', async () => {
    mockVerifyKyc.mockResolvedValue({
      uid: 'pi-123',
      kycVerified: true,
      walletAddress: 'GABC...',
      username: 'testuser',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1', xp: 0, tier: 'Visitor', stamps: [], lastActive: null,
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const req = mockPostRequest({ accessToken: 'valid-token' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.kycStatus).toBe('VERIFIED');
    expect(data.uid).toBe('pi-123');
    expect(data.computedTrustScore).toBe(45);
    expect(mockComputeTrust).toHaveBeenCalledWith([], false, null);
  });

  it('returns KYC pending when not verified', async () => {
    mockVerifyKyc.mockResolvedValue({
      uid: 'pi-123',
      kycVerified: false,
      walletAddress: null,
      username: 'testuser',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1', xp: 0, tier: 'Visitor', stamps: [], lastActive: null,
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const req = mockPostRequest({ accessToken: 'valid-token' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.kycStatus).toBe('PENDING');
  });

  it('returns 500 on Pi API failure', async () => {
    mockVerifyKyc.mockRejectedValue(new Error('Pi API timeout'));

    const req = mockPostRequest({ accessToken: 'valid-token' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('returns 404 when user not found in database', async () => {
    mockVerifyKyc.mockResolvedValue({
      uid: 'pi-123',
      kycVerified: true,
      walletAddress: 'GABC...',
      username: 'testuser',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockPostRequest({ accessToken: 'valid-token' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('passes stamps to computeTrustScore', async () => {
    mockVerifyKyc.mockResolvedValue({
      uid: 'pi-123',
      kycVerified: true,
      walletAddress: 'GABC...',
      username: 'testuser',
    });
    const now = new Date();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1', xp: 0, tier: 'Visitor', lastActive: now,
      stamps: [
        { type: 'connect_twitter', xpAwarded: 10, createdAt: now },
        { type: 'daily_pow', xpAwarded: 5, createdAt: now },
      ],
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const req = mockPostRequest({ accessToken: 'valid-token' });
    await POST(req);

    expect(mockComputeTrust).toHaveBeenCalledWith(
      [
        { type: 'connect_twitter', xp: 10, timestamp: now },
        { type: 'daily_pow', xp: 5, timestamp: now },
      ],
      false,
      now,
    );
  });
});

// ---------------------------------------------------------------------------
// PR change: Idempotent $transaction — stamp already exists
// ---------------------------------------------------------------------------

describe('POST /api/pi/kya/verify — idempotency (existing stamp)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      error: null,
      user: { id: 'user-1', piUid: 'pi-123', piUsername: 'testuser', walletAddress: 'pi:pi-123' },
    });
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockVerifyKyc.mockResolvedValue({
      uid: 'pi-123',
      kycVerified: true,
      walletAddress: 'GABC...',
      username: 'testuser',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1', xp: 0, tier: 'Visitor', stamps: [], lastActive: null,
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({});
  });

  it('returns 200 when the complete_kyc stamp already exists (no duplicate created)', async () => {
    const existingStamp = { id: 'stamp-1', type: 'complete_kyc', userId: 'user-1' };
    const stampCreateMock = jest.fn();

    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (fn: any) =>
      fn({
        stamp: {
          findUnique: jest.fn().mockResolvedValue(existingStamp),
          create: stampCreateMock,
        },
        user: { update: jest.fn().mockResolvedValue({ xp: 0 }) },
        xpLedger: { create: jest.fn().mockResolvedValue({}) },
        action: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
      })
    );

    const req = mockPostRequest({ accessToken: 'valid-token' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.kycStatus).toBe('VERIFIED');
    // stamp.create must NOT be called when stamp already exists
    expect(stampCreateMock).not.toHaveBeenCalled();
  });

  it('swallows P2002 unique-constraint errors from $transaction and returns 200', async () => {
    const p2002Error = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    (prisma.$transaction as jest.Mock).mockImplementationOnce(async () => {
      throw p2002Error;
    });

    const req = mockPostRequest({ accessToken: 'valid-token' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.kycStatus).toBe('VERIFIED');
  });

  it('propagates non-P2002 errors from $transaction (returns 500)', async () => {
    const otherError = Object.assign(new Error('Foreign key violation'), { code: 'P2003' });
    (prisma.$transaction as jest.Mock).mockImplementationOnce(async () => {
      throw otherError;
    });

    const req = mockPostRequest({ accessToken: 'valid-token' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});

// ---------------------------------------------------------------------------
// PR change: calculateActionHash called with correct inputs
// ---------------------------------------------------------------------------

describe('POST /api/pi/kya/verify — action hash-chain (PR change)', () => {
  let capturedTx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      error: null,
      user: { id: 'user-1', piUid: 'pi-123', piUsername: 'testuser', walletAddress: 'pi:pi-123' },
    });
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockVerifyKyc.mockResolvedValue({
      uid: 'pi-123',
      kycVerified: true,
      walletAddress: 'GABC...',
      username: 'testuser',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1', xp: 0, tier: 'Visitor', stamps: [], lastActive: null,
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({});
  });

  it('uses GENESIS_HASH as parentHash when no prior action exists', async () => {
    const { calculateActionHash, GENESIS_HASH } = jest.requireMock('@/lib/trust-chain');

    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (fn: any) =>
      fn({
        stamp: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
        user: { update: jest.fn().mockResolvedValue({ xp: 200 }) },
        xpLedger: { create: jest.fn().mockResolvedValue({}) },
        action: {
          findFirst: jest.fn().mockResolvedValue(null), // no prior action
          create: jest.fn().mockResolvedValue({}),
        },
      })
    );

    const req = mockPostRequest({ accessToken: 'valid-token' });
    await POST(req);

    expect(calculateActionHash).toHaveBeenCalledWith(
      GENESIS_HASH,
      expect.objectContaining({ type: 'complete_kyc', xp: 200, userId: 'user-1' })
    );
  });

  it('uses lastAction.hash as parentHash when a prior action exists', async () => {
    const { calculateActionHash } = jest.requireMock('@/lib/trust-chain');
    const previousHash = 'b'.repeat(64);

    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (fn: any) =>
      fn({
        stamp: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
        user: { update: jest.fn().mockResolvedValue({ xp: 200 }) },
        xpLedger: { create: jest.fn().mockResolvedValue({}) },
        action: {
          findFirst: jest.fn().mockResolvedValue({ hash: previousHash }),
          create: jest.fn().mockResolvedValue({}),
        },
      })
    );

    const req = mockPostRequest({ accessToken: 'valid-token' });
    await POST(req);

    expect(calculateActionHash).toHaveBeenCalledWith(
      previousHash,
      expect.objectContaining({ type: 'complete_kyc' })
    );
  });

  it('stores the computed hash and parentHash when creating an action record', async () => {
    const actionCreateMock = jest.fn().mockResolvedValue({});

    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (fn: any) =>
      fn({
        stamp: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
        user: { update: jest.fn().mockResolvedValue({ xp: 200 }) },
        xpLedger: { create: jest.fn().mockResolvedValue({}) },
        action: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: actionCreateMock,
        },
      })
    );

    const req = mockPostRequest({ accessToken: 'valid-token' });
    await POST(req);

    expect(actionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'complete_kyc',
          xp: 200,
          hash: 'a'.repeat(64),
        }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// PR change: tier recalculated after XP increment
// ---------------------------------------------------------------------------

describe('POST /api/pi/kya/verify — tier recalculation (PR change)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      error: null,
      user: { id: 'user-1', piUid: 'pi-123', piUsername: 'testuser', walletAddress: 'pi:pi-123' },
    });
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockVerifyKyc.mockResolvedValue({
      uid: 'pi-123',
      kycVerified: true,
      walletAddress: 'GABC...',
      username: 'testuser',
    });
  });

  it('updates tier when calculateTier returns a different tier from user.tier', async () => {
    // User is Visitor (xp=0, Citizen threshold=100) → after +200 XP → xp=200 → Citizen (tier changes)
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1', xp: 0, tier: 'Visitor', stamps: [], lastActive: null,
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const userUpdateMock = jest.fn().mockResolvedValue({ xp: 200 });

    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (fn: any) =>
      fn({
        stamp: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
        user: { update: userUpdateMock },
        xpLedger: { create: jest.fn().mockResolvedValue({}) },
        action: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
      })
    );

    const req = mockPostRequest({ accessToken: 'valid-token' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    // tx.user.update is called three times: KYC status write, XP increment,
    // then tier promotion (Visitor → Citizen).
    expect(userUpdateMock).toHaveBeenCalledTimes(3);
    // Third call should be the tier update
    expect(userUpdateMock.mock.calls[2][0]).toEqual(
      expect.objectContaining({ data: { tier: 'Citizen' } })
    );
  });

  it('does not make a second user.update when tier has not changed', async () => {
    // User is Citizen (xp=100) → after +200 XP → xp=300 → still Citizen (no tier change)
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1', xp: 100, tier: 'Citizen', stamps: [], lastActive: null,
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const userUpdateMock = jest.fn().mockResolvedValue({ xp: 300 });

    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (fn: any) =>
      fn({
        stamp: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
        user: { update: userUpdateMock },
        xpLedger: { create: jest.fn().mockResolvedValue({}) },
        action: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
      })
    );

    const req = mockPostRequest({ accessToken: 'valid-token' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    // Two updates only: KYC status write + XP increment. No tier update since
    // calculateTier(300) = 'Citizen' = same as user.tier.
    expect(userUpdateMock).toHaveBeenCalledTimes(2);
  });
});
