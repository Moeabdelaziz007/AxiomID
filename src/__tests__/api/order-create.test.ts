/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    skill: {
      findUnique: jest.fn(),
    },
    piPayment: {
      create: jest.fn(),
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
  getClientIp: jest.fn(() => '192.168.1.1'),
}));

import { POST } from '@/app/api/marketplace/order/create/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireAuth } from '@/lib/auth-middleware';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const SKILL_UUID = '660e8400-e29b-41d4-a716-446655440001';
const AGENT_UUID = '770e8400-e29b-41d4-a716-446655440002';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/marketplace/order/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

function makeInvalidJsonRequest() {
  return new Request('http://localhost/api/marketplace/order/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not-json{',
  }) as any;
}

describe('POST /api/marketplace/order/create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({
      error: null,
      user: {
        id: VALID_UUID,
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

      const req = makeRequest({ skillId: SKILL_UUID, agentId: AGENT_UUID, amount: 1.5, paymentId: 'pay_123' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.code).toBe('RATE_LIMITED');
    });

    it('uses RATE_LIMITS.payment with order-create key prefix', async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({ id: SKILL_UUID } as any);
      mockPrisma.piPayment.create.mockResolvedValue({ id: 'payment-1' } as any);

      const req = makeRequest({ skillId: SKILL_UUID, agentId: AGENT_UUID, amount: 1.5, paymentId: 'pay_123' });
      await POST(req);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        'order-create:192.168.1.1',
        expect.objectContaining({ maxRequests: 10 })
      );
    });
  });

  describe('authentication', () => {
    it('returns auth error when not authenticated', async () => {
      const authError = new Response(JSON.stringify({ code: 'UNAUTHORIZED', error: 'Not authenticated' }), { status: 401 });
      mockRequireAuth.mockResolvedValue({ error: authError, user: null } as any);

      const req = makeRequest({ skillId: SKILL_UUID, agentId: AGENT_UUID, amount: 1.5, paymentId: 'pay_123' });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });

  describe('request body validation', () => {
    it('returns 400 for invalid JSON body', async () => {
      const req = makeInvalidJsonRequest();
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.error).toMatch(/invalid json/i);
    });

    it('returns 400 when skillId is missing', async () => {
      const req = makeRequest({ agentId: AGENT_UUID, amount: 1.5, paymentId: 'pay_123' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when skillId is not a valid UUID', async () => {
      const req = makeRequest({ skillId: 'not-a-uuid', agentId: AGENT_UUID, amount: 1.5, paymentId: 'pay_123' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when amount is not positive', async () => {
      const req = makeRequest({ skillId: SKILL_UUID, agentId: AGENT_UUID, amount: -1, paymentId: 'pay_123' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when paymentId is empty string', async () => {
      const req = makeRequest({ skillId: SKILL_UUID, agentId: AGENT_UUID, amount: 1.5, paymentId: '' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('business logic', () => {
    it('returns 404 when skill does not exist', async () => {
      mockPrisma.skill.findUnique.mockResolvedValue(null);

      const req = makeRequest({ skillId: SKILL_UUID, agentId: AGENT_UUID, amount: 1.5, paymentId: 'pay_123' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });

    it('creates an ESCROWED payment and returns paymentId on success', async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({ id: SKILL_UUID, name: 'Test Skill' } as any);
      mockPrisma.piPayment.create.mockResolvedValue({ id: 'new-payment-id' } as any);

      const req = makeRequest({ skillId: SKILL_UUID, agentId: AGENT_UUID, amount: 2.0, paymentId: 'pay_abc' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.paymentId).toBe('new-payment-id');
    });

    it('creates payment with ESCROWED status in DB', async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({ id: SKILL_UUID } as any);
      mockPrisma.piPayment.create.mockResolvedValue({ id: 'pay-x' } as any);

      const req = makeRequest({ skillId: SKILL_UUID, agentId: AGENT_UUID, amount: 1.0, paymentId: 'pay_xyz' });
      await POST(req);

      expect(mockPrisma.piPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ESCROWED',
            amount: 1.0,
            paymentId: 'pay_xyz',
          }),
        })
      );
    });
  });
});