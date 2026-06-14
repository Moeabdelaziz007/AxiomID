/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 *
 * Tests for the changed behavior in pi/payment/complete/route.ts:
 * - try/catch around JSON.parse(payment.metadata) — added in this PR
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    piPayment: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { payment: { windowMs: 60000, maxRequests: 10 } },
}));

jest.mock('@/lib/ip', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
}));

jest.mock('@/lib/tiers', () => ({
  calculateTier: jest.fn(() => 'Citizen'),
}));

import { POST } from '@/app/api/pi/payment/complete/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireAuth } from '@/lib/auth-middleware';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockRequireAuth = requireAuth as jest.Mock;

const mockUser = {
  id: 'user-1',
  walletAddress: 'pi:uid1',
  piUid: 'pi-uid-1',
  piUsername: 'testuser',
  xp: 50,
  tier: 'Visitor',
};

function mockPostRequest(body: unknown) {
  return new Request('http://localhost/api/pi/payment/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('POST /api/pi/payment/complete — metadata JSON.parse try/catch (new in PR)', () => {
  const originalApiKey = process.env.PI_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PI_API_KEY = 'test-pi-api-key';
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  afterEach(() => {
    process.env.PI_API_KEY = originalApiKey;
    global.fetch = originalFetch;
  });

  it('handles malformed (non-JSON) metadata without throwing — defaults to {}', async () => {
    const paymentId = 'pay-123';
    const txid = 'tx-abc';

    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: 'rec-1',
      paymentId,
      userId: 'user-1',
      status: 'pending',
      amount: 5,
      txid: null,
      metadata: 'this is not valid JSON {{{',  // malformed metadata
    } as any);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ identifier: paymentId, status: 'completed' }),
    });

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      return fn({
        piPayment: { update: jest.fn().mockResolvedValue({ paymentId, txid }) },
        user: { findUnique: jest.fn().mockResolvedValue(null) },
        xpLedger: { create: jest.fn() },
      });
    });

    const req = mockPostRequest({ paymentId, txid });
    // Should NOT throw despite malformed metadata
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('completed');
    expect(data.paymentId).toBe(paymentId);
  });

  it('handles null metadata gracefully — defaults to {}', async () => {
    const paymentId = 'pay-null-meta';
    const txid = 'tx-xyz';

    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: 'rec-2',
      paymentId,
      userId: 'user-1',
      status: 'pending',
      amount: 1,
      txid: null,
      metadata: null,  // null metadata
    } as any);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ identifier: paymentId, status: 'completed' }),
    });

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      return fn({
        piPayment: { update: jest.fn().mockResolvedValue({ paymentId, txid }) },
        user: { findUnique: jest.fn().mockResolvedValue(null) },
        xpLedger: { create: jest.fn() },
      });
    });

    const req = mockPostRequest({ paymentId, txid });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('uses metadata.purpose when metadata is valid JSON', async () => {
    const paymentId = 'pay-with-purpose';
    const txid = 'tx-purpose';

    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: 'rec-3',
      paymentId,
      userId: 'user-1',
      status: 'pending',
      amount: 2,
      txid: null,
      metadata: JSON.stringify({ purpose: 'skill_install' }),
    } as any);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ identifier: paymentId, status: 'completed' }),
    });

    const txXpLedgerCreate = jest.fn();
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      return fn({
        piPayment: { update: jest.fn().mockResolvedValue({ paymentId, txid }) },
        user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', xp: 0 }) },
        xpLedger: { create: txXpLedgerCreate.mockResolvedValue({}) },
        update: jest.fn().mockResolvedValue({ id: 'user-1', xp: 20, tier: 'Visitor' }),
      });
    });

    const req = mockPostRequest({ paymentId, txid });
    const res = await POST(req);
    // Metadata is valid, should succeed
    expect(res.status).toBe(200);
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });
    const req = mockPostRequest({ paymentId: 'pay-1', txid: 'tx-1' });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 401 when not authenticated', async () => {
    const { apiError } = await import('@/lib/errors');
    mockRequireAuth.mockResolvedValue({
      error: apiError('UNAUTHORIZED', 'Not authenticated'),
      user: null,
    });
    const req = mockPostRequest({ paymentId: 'pay-1', txid: 'tx-1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 404 when payment record not found', async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue(null);
    const req = mockPostRequest({ paymentId: 'unknown-payment', txid: 'tx-1' });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 403 when payment belongs to a different user', async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: 'rec-4',
      paymentId: 'pay-other',
      userId: 'other-user-id',
      status: 'pending',
      amount: 1,
      txid: null,
      metadata: null,
    } as any);

    const req = mockPostRequest({ paymentId: 'pay-other', txid: 'tx-1' });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.code).toBe('FORBIDDEN');
  });

  it('returns 200 immediately for already-completed payment', async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: 'rec-5',
      paymentId: 'pay-done',
      userId: 'user-1',
      status: 'completed',
      amount: 3,
      txid: 'tx-existing',
      metadata: null,
    } as any);

    const req = mockPostRequest({ paymentId: 'pay-done', txid: 'tx-new' });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe('completed');
    // Should return existing txid, not the new one
    expect(data.txid).toBe('tx-existing');
  });
});