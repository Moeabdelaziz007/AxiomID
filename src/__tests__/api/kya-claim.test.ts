/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
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

import { POST } from '@/app/api/pi/kya/claim/route';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

const DEFAULT_USER = {
  id: 'user-1',
  walletAddress: 'pi:testuser',
  piUid: 'pi-uid-1',
  piUsername: 'testuser',
  xp: 0,
  tier: 'Visitor',
};

function mockPostRequest() {
  return new Request('http://localhost/api/pi/kya/claim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-pi-token',
    },
    body: JSON.stringify({}),
  }) as any;
}

describe('POST /api/pi/kya/claim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: DEFAULT_USER });
  });

  it('sets kycStatus to PENDING for a user with no prior KYC (kycStatus null)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'pi:testuser',
      kycStatus: null,
      did: null,
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'pi:testuser',
      kycStatus: 'PENDING',
      did: 'did:axiom:testuser',
    } as any);

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.userId).toBe('user-1');
    expect(data.walletAddress).toBe('pi:testuser');
    expect(data.kycStatus).toBe('PENDING');
    expect(data.did).toBe('did:axiom:testuser');
  });

  it('sets kycStatus to PENDING for a user with kycStatus NONE', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'pi:testuser',
      kycStatus: 'NONE',
      did: null,
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'pi:testuser',
      kycStatus: 'PENDING',
      did: 'did:axiom:testuser',
    } as any);

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.kycStatus).toBe('PENDING');
  });

  it('returns existing KYC data when kycStatus is already PENDING (not NONE)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'pi:testuser',
      kycStatus: 'PENDING',
      tier: 'Visitor',
      xp: 0,
      did: 'did:axiom:testuser',
    } as any);

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.userId).toBe('user-1');
    expect(data.kycStatus).toBe('PENDING');
    // Should NOT call update since KYC is already set
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('returns existing KYC data when kycStatus is APPROVED', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'pi:testuser',
      kycStatus: 'APPROVED',
      tier: 'Citizen',
      xp: 150,
      did: 'did:axiom:testuser',
    } as any);

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.kycStatus).toBe('APPROVED');
    expect(data.xp).toBe(150);
    expect(data.tier).toBe('Citizen');
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('updates with did:axiom using piUsername when user has no existing DID', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'pi:testuser',
      kycStatus: null,
      did: null,
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'pi:testuser',
      kycStatus: 'PENDING',
      did: 'did:axiom:testuser',
    } as any);

    const req = mockPostRequest();
    await POST(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kycStatus: 'PENDING',
          kycProvider: 'pi_network',
        }),
      })
    );
  });

  it('returns 401 when Authorization token is missing', async () => {
    mockRequireAuth.mockResolvedValue({
      error: { json: async () => ({ error: 'UNAUTHORIZED', code: 'UNAUTHORIZED' }), status: 401 } as any,
      user: null,
    });

    const req = new Request('http://localhost/api/pi/kya/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }) as any;

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 404 when user is not found in the database', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 500 on database error during findUnique', async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error('DB error'));

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 on database error during update', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'pi:testuser',
      kycStatus: null,
      did: null,
    } as any);
    mockPrisma.user.update.mockRejectedValue(new Error('Update failed'));

    const req = mockPostRequest();
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('uses piUid in did when piUsername is null', async () => {
    mockRequireAuth.mockResolvedValue({
      error: null,
      user: {
        id: 'user-2',
        walletAddress: 'pi:uid-only',
        piUid: 'raw-pi-uid-999',
        piUsername: null,
        xp: 0,
        tier: 'Visitor',
      },
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      walletAddress: 'pi:uid-only',
      kycStatus: null,
      did: null,
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-2',
      walletAddress: 'pi:uid-only',
      kycStatus: 'PENDING',
      did: 'did:axiom:raw-pi-uid-999',
    } as any);

    const req = mockPostRequest();
    await POST(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          did: 'did:axiom:raw-pi-uid-999',
        }),
      })
    );
  });

  it('preserves existing DID when user already has one', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'pi:testuser',
      kycStatus: null,
      did: 'did:axiom:existing-did',
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'pi:testuser',
      kycStatus: 'PENDING',
      did: 'did:axiom:existing-did',
    } as any);

    const req = mockPostRequest();
    await POST(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          did: 'did:axiom:existing-did',
        }),
      })
    );
  });
});