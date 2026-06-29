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
  calculateActionHash: jest.fn().mockReturnValue('mock-hash-abc'),
  GENESIS_HASH: 'genesis-hash-000',
}));

jest.mock('@/lib/tiers', () => ({
  calculateTier: jest.fn().mockReturnValue('Pioneer'),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    stamp: { findUnique: jest.fn().mockResolvedValue(null) },
    action: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue({ hash: 'prev-hash' }) },
    $transaction: jest.fn(async (fn: any) => fn({
      stamp: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      user: { update: jest.fn().mockResolvedValue({ xp: 200 }) },
      action: {
        create: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn().mockResolvedValue({ hash: 'prev-hash' }),
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
    // Note: Jest captures array by reference — stampsToScore is mutated after computeTrustScore call
    expect(mockComputeTrust).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ type: 'complete_kyc', xp: 200 })]),
      false,
      null,
    );
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

    // Jest captures array by reference — KYC stamp is pushed after computeTrustScore call
    expect(mockComputeTrust).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: 'connect_twitter', xp: 10 }),
        expect.objectContaining({ type: 'daily_pow', xp: 5 }),
        expect.objectContaining({ type: 'complete_kyc', xp: 200 }),
      ]),
      false,
      now,
    );
  });
});
