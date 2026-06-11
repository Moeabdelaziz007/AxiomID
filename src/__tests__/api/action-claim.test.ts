/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    action: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    xpLedger: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));
jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    error: null,
    user: {
      id: 'user-1',
      walletAddress: 'pi:testuser',
      piUid: 'pi-uid-1',
      piUsername: 'testuser',
      xp: 0,
      tier: 'Visitor',
    },
  }),
}));

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type */
import { POST } from '@/app/api/action/claim/route';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

function mockRequest(body: unknown): Request {
  return new Request('http://localhost/api/action/claim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-pi-token',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/action/claim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      error: null,
      user: {
        id: 'user-1',
        walletAddress: 'pi:testuser',
        piUid: 'pi-uid-1',
        piUsername: 'testuser',
        xp: 0,
        tier: 'Visitor',
      },
    });
  });

  it('claims XP for valid action', async () => {
    mockPrisma.action.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', xp: 0 } as never);
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: Record<string, any>) => Promise<any>) => {
      const tx = {
        action: { create: jest.fn().mockResolvedValue({ id: 'action-1', type: 'connect_twitter', userId: 'user-1', xp: 50, metadata: null, timestamp: new Date() }) },
        xpLedger: { create: jest.fn().mockResolvedValue({ id: 'ledger-1' }) },
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'user-1', xp: 0 }),
          update: jest.fn().mockResolvedValue({ id: 'user-1', xp: 50, tier: 'Visitor' })
        },
      };
      return fn(tx);
    });

    const req = mockRequest({ actionType: 'connect_twitter' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.xpEarned).toBe(50);
    expect(data.tier).toBe('Visitor');
  });

  it('returns 401 without auth token', async () => {
    mockRequireAuth.mockResolvedValue({
      error: { json: () => ({ error: 'UNAUTHORIZED', code: 'UNAUTHORIZED' }), status: 401 } as any,
      user: null,
    });

    const req = new Request('http://localhost/api/action/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType: 'connect_twitter' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 409 on duplicate claim', async () => {
    mockPrisma.action.findUnique.mockResolvedValue({ id: 'existing-action' } as any);

    const req = mockRequest({ actionType: 'connect_twitter' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe('CONFLICT');
  });

  it('returns 400 on unknown action type', async () => {
    mockPrisma.action.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', xp: 0 } as any);

    const req = mockRequest({ actionType: 'nonexistent_action' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 if user not found in DB', async () => {
    mockPrisma.action.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: Record<string, any>) => Promise<any>) => {
      const tx = {
        action: { create: jest.fn() },
        xpLedger: { create: jest.fn() },
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn()
        },
      };
      return fn(tx);
    });

    const req = mockRequest({ actionType: 'connect_twitter' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('upgrades tier when XP threshold crossed', async () => {
    mockRequireAuth.mockResolvedValue({
      error: null,
      user: {
        id: 'user-1',
        walletAddress: 'pi:testuser',
        piUid: 'pi-uid-1',
        piUsername: 'testuser',
        xp: 90,
        tier: 'Citizen',
      },
    });
    mockPrisma.action.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', xp: 90 } as any);
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
      const tx = {
        action: { create: jest.fn().mockResolvedValue({ id: 'action-2', type: 'daily_pow', userId: 'user-1', xp: 20, metadata: null, timestamp: new Date() }) },
        xpLedger: { create: jest.fn().mockResolvedValue({ id: 'ledger-2' }) },
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'user-1', xp: 90 }),
          update: jest.fn().mockResolvedValue({ id: 'user-1', xp: 110, tier: 'Citizen' }),
        },
      };
      return fn(tx);
    });

    const req = mockRequest({ actionType: 'daily_pow' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tier).toBe('Citizen');
    expect(data.newBalance).toBe(110);
  });
});
