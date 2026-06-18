 
/**
 * @jest-environment node
 */

jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    error: null,
    user: {
      id: 'mock-user-id',
      walletAddress: 'pi:mockuser',
      piUid: 'mock-pi-uid',
      piUsername: 'mockuser',
      xp: 0,
      tier: 'Beginner',
    },
  }),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
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

import { POST } from '@/app/api/pi/kya/claim/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

function mockPostRequest(body: unknown) {
  return new Request('http://localhost/api/pi/kya/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as any;
}

describe('POST /api/pi/kya/claim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it('returns 404 for a user that has not authenticated', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({ username: 'testuser' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('User must authenticate first');
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('returns existing user data without creating duplicate', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user',
      walletAddress: 'pi:existinguser',
      tier: 'Citizen',
      xp: 200,
      piUid: 'mock-pi-uid',
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'existing-user',
      walletAddress: 'pi:existinguser',
      tier: 'Citizen',
      xp: 200,
      piUid: 'mock-pi-uid',
    } as any);

    const req = mockPostRequest({ username: 'existinguser' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.userId).toBe('existing-user');
    expect(data.walletAddress).toBe('pi:existinguser');
    expect(data.tier).toBe('Citizen');
    expect(data.xp).toBe(200);
    // Should not create a new user
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('returns 404 when user has not authenticated via Pi auth', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({ username: 'pi_user_abc' });
    const res = await POST(req);

    expect(res.status).toBe(404);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('returns 400 when username is missing', async () => {
    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on invalid JSON body', async () => {
    const req = new Request('http://localhost/api/pi/kya/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'bad-json',
    }) as any;
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ username: 'ratelimiteduser' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('returns 500 on database error', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user',
      piUid: 'mock-pi-uid',
    } as any);
    mockPrisma.user.update.mockRejectedValue(new Error('DB error'));

    const req = mockPostRequest({ username: 'dbfailuser' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('keeps existing piUsername when user already has one', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'named-user',
      walletAddress: 'pi:nameduser',
      piUid: 'mock-pi-uid',
      piUsername: 'oldname',
      did: 'did:axiom:axiomid.app:pi:mock-pi-uid',
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'named-user',
      walletAddress: 'pi:nameduser',
      kycStatus: 'PENDING',
      did: 'did:axiom:axiomid.app:pi:mock-pi-uid',
    } as any);

    const req = mockPostRequest({ username: 'nameduser' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          piUsername: 'oldname',
        }),
      })
    );
  });

  it('replaces old DID format (did:axiom:<uid>) with new format when existing did lacks axiomid.app:pi:', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'legacy-did-user',
      walletAddress: 'pi:legacyuser',
      piUid: 'mock-pi-uid',
      did: 'did:axiom:mock-pi-uid', // old format — missing axiomid.app:pi:
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'legacy-did-user',
      walletAddress: 'pi:legacyuser',
      kycStatus: 'PENDING',
      did: 'did:axiom:axiomid.app:pi:mock-pi-uid',
    } as any);

    const req = mockPostRequest({ username: 'legacyuser' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          did: 'did:axiom:axiomid.app:pi:mock-pi-uid',
        }),
      })
    );
  });

  it('creates the correct DID format using createPiDid when existing user lacks a did', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user-no-did',
      walletAddress: 'pi:existinguser',
      piUid: 'mock-pi-uid',
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'existing-user-no-did',
      walletAddress: 'pi:existinguser',
      kycStatus: 'PENDING',
      did: 'did:axiom:axiomid.app:pi:mock-pi-uid',
    } as any);

    const req = mockPostRequest({ username: 'existinguser' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          did: 'did:axiom:axiomid.app:pi:mock-pi-uid',
          piUsername: 'existinguser',
        }),
      })
    );
  });
});
