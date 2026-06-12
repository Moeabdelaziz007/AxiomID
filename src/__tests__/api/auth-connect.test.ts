/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      upsert: jest.fn(),
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
jest.mock('@/lib/oauth-state', () => ({
  verifyState: jest.fn(),
}));

import { POST } from '@/app/api/auth/connect/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';
import { verifyState } from '@/lib/oauth-state';
import { NextRequest } from 'next/server';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockVerifyState = verifyState as jest.Mock;

function mockRequest(body: unknown) {
  return new Request('http://localhost/api/auth/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const NOW = new Date('2025-01-01T00:00:00.000Z');
const WALLET = 'demo:abc123';

function makeUpsertUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    walletAddress: WALLET,
    tier: 'Visitor',
    xp: 0,
    did: `did:axiom:axiomid.app:demo-abc123`,
    didMethod: 'did:axiom',
    kycStatus: 'NONE',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as any;
}

describe('POST /api/auth/connect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });

    mockPrisma.user.upsert.mockResolvedValue(makeUpsertUser());
    mockPrisma.user.findUnique.mockResolvedValue({
      did: `did:axiom:axiomid.app:demo-abc123`,
      kycStatus: 'NONE',
    } as any);
  });

  // ----------------------------------------------------------------
  // Happy path: new user creation
  // ----------------------------------------------------------------
  it('creates a new user and returns 200 with did field', async () => {
    const req = mockRequest({ walletAddress: WALLET });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.userId).toBe('user-1');
    expect(data.walletAddress).toBe(WALLET);
    expect(data.did).toBe('did:axiom:axiomid.app:demo-abc123');
  });

  it('includes didMethod in the upsert create payload', async () => {
    const req = mockRequest({ walletAddress: WALLET });
    await POST(req);

    expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          did: expect.stringMatching(/^did:axiom:axiomid\.app:/),
          didMethod: 'did:axiom',
        }),
      }),
    );
  });

  it('includes didMethod in the upsert update payload', async () => {
    const req = mockRequest({ walletAddress: WALLET });
    await POST(req);

    expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          did: expect.stringMatching(/^did:axiom:axiomid\.app:/),
          didMethod: 'did:axiom',
        }),
      }),
    );
  });

  it('generates the DID from the wallet address using createAxiomDid', async () => {
    const req = mockRequest({ walletAddress: 'pi:someuid' });
    await POST(req);

    expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          did: 'did:axiom:axiomid.app:pi-someuid',
        }),
      }),
    );
  });

  // ----------------------------------------------------------------
  // did returned from the upsert result
  // ----------------------------------------------------------------
  it('returns did and kycStatus from the upsert result', async () => {
    mockPrisma.user.upsert.mockResolvedValue(makeUpsertUser({
      walletAddress: 'demo:xyz',
      did: 'did:axiom:axiomid.app:demo-xyz',
      kycStatus: 'VERIFIED',
    }));

    const req = mockRequest({ walletAddress: 'demo:xyz' });
    const res = await POST(req);
    const data = await res.json();

    expect(data.did).toBe('did:axiom:axiomid.app:demo-xyz');
    expect(data.kycStatus).toBe('VERIFIED');
  });

  it('returns null did when upsert result has no did', async () => {
    mockPrisma.user.upsert.mockResolvedValue(makeUpsertUser({ did: null }));

    const req = mockRequest({ walletAddress: WALLET });
    const res = await POST(req);
    const data = await res.json();

    expect(data.did).toBeNull();
  });

  // ----------------------------------------------------------------
  // Validation errors
  // ----------------------------------------------------------------
  it('returns 400 VALIDATION_ERROR when walletAddress is missing', async () => {
    const req = mockRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR for invalid JSON body', async () => {
    const req = new Request('http://localhost/api/auth/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    }) as unknown as NextRequest;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  // ----------------------------------------------------------------
  // Rate limiting
  // ----------------------------------------------------------------
  it('returns 429 RATE_LIMITED when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockRequest({ walletAddress: WALLET });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  // ----------------------------------------------------------------
  // State / CSRF verification
  // ----------------------------------------------------------------
  it('verifies state token when state is provided and wallet matches', async () => {
    mockVerifyState.mockReturnValue(WALLET);

    const req = mockRequest({ walletAddress: WALLET, state: 'valid-state-token' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockVerifyState).toHaveBeenCalledWith('valid-state-token');
  });

  it('returns 401 UNAUTHORIZED when state token is invalid', async () => {
    mockVerifyState.mockReturnValue(null);

    const req = mockRequest({ walletAddress: WALLET, state: 'bad-state' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 FORBIDDEN when state address does not match walletAddress', async () => {
    mockVerifyState.mockReturnValue('demo:differentwallet');

    const req = mockRequest({ walletAddress: WALLET, state: 'mismatched-state' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe('FORBIDDEN');
  });

  it('skips state verification when no state token is provided (demo wallet)', async () => {
    const req = mockRequest({ walletAddress: WALLET });
    await POST(req);

    expect(mockVerifyState).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // Database error
  // ----------------------------------------------------------------
  it('returns 500 INTERNAL_ERROR on database failure', async () => {
    mockPrisma.user.upsert.mockRejectedValue(new Error('DB down'));

    const req = mockRequest({ walletAddress: WALLET });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  // ----------------------------------------------------------------
  // isNewUser detection
  // ----------------------------------------------------------------
  it('sets isNewUser=true when createdAt equals updatedAt', async () => {
    mockPrisma.user.upsert.mockResolvedValue(makeUpsertUser({ createdAt: NOW, updatedAt: NOW }));

    const req = mockRequest({ walletAddress: WALLET });
    const res = await POST(req);
    const data = await res.json();

    expect(data.isNewUser).toBe(true);
  });

  it('sets isNewUser=false when createdAt differs from updatedAt', async () => {
    const laterDate = new Date(NOW.getTime() + 1000);
    mockPrisma.user.upsert.mockResolvedValue(makeUpsertUser({ createdAt: NOW, updatedAt: laterDate }));

    const req = mockRequest({ walletAddress: WALLET });
    const res = await POST(req);
    const data = await res.json();

    expect(data.isNewUser).toBe(false);
  });
});