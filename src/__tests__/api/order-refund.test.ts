/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    piPayment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    payment: { windowMs: 60000, maxRequests: 10 },
  },
}));
jest.mock('@/lib/ip', () => ({
  getClientIp: jest.fn(() => '192.168.1.2'),
}));

import { POST } from '@/app/api/marketplace/order/refund/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireAuth } from '@/lib/auth-middleware';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

const AUTH_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const PAYMENT_UUID = '660e8400-e29b-41d4-a716-446655440001';
const OTHER_USER_ID = '770e8400-e29b-41d4-a716-446655440002';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/marketplace/order/refund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('POST /api/marketplace/order/refund', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({
      error: null,
      user: {
        id: AUTH_USER_ID,
        walletAddress: 'pi:testuser',
        piUid: 'pi-uid',
        piUsername: 'testuser',
        xp: 0,
        tier: 'Beginner',
      },
    } as any);
  });

  describe('rate limiting', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

      const req = makeRequest({ paymentId: PAYMENT_UUID });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.code).toBe('RATE_LIMITED');
    });

    it('uses order-refund key prefix with IP', async () => {
      mockPrisma.piPayment.findUnique.mockResolvedValue({
        id: PAYMENT_UUID, userId: AUTH_USER_ID, status: 'ESCROWED',
      } as any);
      mockPrisma.piPayment.update.mockResolvedValue({} as any);

      const req = makeRequest({ paymentId: PAYMENT_UUID });
      await POST(req);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        'order-refund:192.168.1.2',
        expect.objectContaining({ maxRequests: 10 })
      );
    });
  });

  describe('authentication', () => {
    it('returns auth error when not authenticated', async () => {
      const authError = new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401 });
      mockRequireAuth.mockResolvedValue({ error: authError, user: null } as any);

      const req = makeRequest({ paymentId: PAYMENT_UUID });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });

  describe('request validation', () => {
    it('returns 400 when paymentId is not a UUID', async () => {
      const req = makeRequest({ paymentId: 'not-a-uuid' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid JSON body', async () => {
      const req = new Request('http://localhost/api/marketplace/order/refund', {
        method: 'POST',
        body: 'bad{json',
      }) as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('business logic', () => {
    it('returns 404 when payment does not exist', async () => {
      mockPrisma.piPayment.findUnique.mockResolvedValue(null);

      const req = makeRequest({ paymentId: PAYMENT_UUID });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });

    it('returns 403 when payment belongs to a different user', async () => {
      mockPrisma.piPayment.findUnique.mockResolvedValue({
        id: PAYMENT_UUID, userId: OTHER_USER_ID, status: 'ESCROWED',
      } as any);

      const req = makeRequest({ paymentId: PAYMENT_UUID });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe('FORBIDDEN');
    });

    it('returns 409 when payment is not in ESCROWED status', async () => {
      mockPrisma.piPayment.findUnique.mockResolvedValue({
        id: PAYMENT_UUID, userId: AUTH_USER_ID, status: 'RELEASED',
      } as any);

      const req = makeRequest({ paymentId: PAYMENT_UUID });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe('CONFLICT');
    });

    it('updates payment to REFUNDED status and returns status on success', async () => {
      mockPrisma.piPayment.findUnique.mockResolvedValue({
        id: PAYMENT_UUID, userId: AUTH_USER_ID, status: 'ESCROWED',
      } as any);
      mockPrisma.piPayment.update.mockResolvedValue({ id: PAYMENT_UUID, status: 'REFUNDED' } as any);

      const req = makeRequest({ paymentId: PAYMENT_UUID });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('REFUNDED');
    });

    it('calls piPayment.update with REFUNDED status', async () => {
      mockPrisma.piPayment.findUnique.mockResolvedValue({
        id: PAYMENT_UUID, userId: AUTH_USER_ID, status: 'ESCROWED',
      } as any);
      mockPrisma.piPayment.update.mockResolvedValue({} as any);

      const req = makeRequest({ paymentId: PAYMENT_UUID });
      await POST(req);

      expect(mockPrisma.piPayment.update).toHaveBeenCalledWith({
        where: { id: PAYMENT_UUID },
        data: { status: 'REFUNDED' },
      });
    });

    it('returns 409 for REFUNDED payment (not in escrow)', async () => {
      mockPrisma.piPayment.findUnique.mockResolvedValue({
        id: PAYMENT_UUID, userId: AUTH_USER_ID, status: 'REFUNDED',
      } as any);

      const req = makeRequest({ paymentId: PAYMENT_UUID });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
    });
  });
});