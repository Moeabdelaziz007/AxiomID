/* eslint-disable @typescript-eslint/no-explicit-any */
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

  it('creates a new user for a new username', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'new-user-1',
      walletAddress: 'pi:testuser',
      kycStatus: 'PENDING',
      did: 'did:axiom:mock-pi-uid',
    } as any);

    const req = mockPostRequest({ username: 'testuser' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.userId).toBe('new-user-1');
    expect(data.walletAddress).toBe('pi:testuser');
    expect(data.kycStatus).toBe('PENDING');
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

  it('constructs walletAddress as pi:<username>', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-abc',
      walletAddress: 'pi:pi_user_abc',
      kycStatus: 'PENDING',
      did: 'did:axiom:mock-pi-uid',
    } as any);

    const req = mockPostRequest({ username: 'pi_user_abc' });
    await POST(req);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { piUid: 'mock-pi-uid' },
    });
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          walletAddress: 'pi:pi_user_abc',
          piUsername: 'pi_user_abc',
          did: 'did:axiom:mock-pi-uid',
          kycStatus: 'PENDING',
        }),
      })
    );
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
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockRejectedValue(new Error('DB error'));

    const req = mockPostRequest({ username: 'dbfailuser' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('includes optional name field in creation data when provided', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'named-user',
      walletAddress: 'pi:nameduser',
      kycStatus: 'PENDING',
      did: 'did:axiom:mock-pi-uid',
    } as any);

    const req = mockPostRequest({ username: 'nameduser', name: 'John Doe' });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'John Doe',
        }),
      })
    );
  });

  // ----------------------------------------------------------------
  // DID and metadata changes introduced in this PR
  // ----------------------------------------------------------------
  it('uses createAxiomDid to generate the DID for a new user (not raw piUid)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'did-user',
      walletAddress: 'pi:diduser',
      kycStatus: 'PENDING',
      did: 'did:axiom:axiomid.app:pi-mock-pi-uid',
    } as any);

    const req = mockPostRequest({ username: 'diduser' });
    await POST(req);

    // The DID must be created from "pi:<piUid>" via createAxiomDid,
    // which produces did:axiom:axiomid.app:pi-<uid>
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          did: 'did:axiom:axiomid.app:pi-mock-pi-uid',
          didMethod: 'did:axiom',
        }),
      }),
    );
  });

  it('includes kycProvider in the new user create payload', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'provider-user',
      walletAddress: 'pi:provideruser',
      kycStatus: 'PENDING',
      did: 'did:axiom:axiomid.app:pi-mock-pi-uid',
    } as any);

    const req = mockPostRequest({ username: 'provideruser' });
    await POST(req);

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kycProvider: 'pi_network',
        }),
      }),
    );
  });

  it('encodes the name as JSON metadata (displayName) instead of a raw name field', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'meta-user',
      walletAddress: 'pi:metauser',
      kycStatus: 'PENDING',
      did: 'did:axiom:axiomid.app:pi-mock-pi-uid',
    } as any);

    const req = mockPostRequest({ username: 'metauser', name: 'Jane Doe' });
    await POST(req);

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: JSON.stringify({ displayName: 'Jane Doe' }),
        }),
      }),
    );
  });

  it('omits metadata when name is not provided for a new user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'no-name-user',
      walletAddress: 'pi:nonameuser',
      kycStatus: 'PENDING',
      did: 'did:axiom:axiomid.app:pi-mock-pi-uid',
    } as any);

    const req = mockPostRequest({ username: 'nonameuser' });
    await POST(req);

    const createCall = mockPrisma.user.create.mock.calls[0][0];
    expect(createCall.data.metadata).toBeUndefined();
  });

  it('updates existing user with didMethod and preserves existing did', async () => {
    const existingDid = 'did:axiom:axiomid.app:pi-existing-pid';
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-id',
      walletAddress: 'pi:existinguser',
      tier: 'Visitor',
      xp: 0,
      piUid: 'mock-pi-uid',
      did: existingDid,
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'existing-id',
      walletAddress: 'pi:existinguser',
      tier: 'Visitor',
      xp: 0,
      piUid: 'mock-pi-uid',
      kycStatus: 'PENDING',
      did: existingDid,
    } as any);

    const req = mockPostRequest({ username: 'existinguser' });
    await POST(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          did: existingDid,
          didMethod: 'did:axiom',
          kycProvider: 'pi_network',
        }),
      }),
    );
  });

  it('assigns createAxiomDid DID when existing user has no did', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'nodid-id',
      walletAddress: 'pi:nodiduser',
      tier: 'Visitor',
      xp: 0,
      piUid: 'mock-pi-uid',
      did: null,
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'nodid-id',
      walletAddress: 'pi:nodiduser',
      tier: 'Visitor',
      xp: 0,
      piUid: 'mock-pi-uid',
      kycStatus: 'PENDING',
      did: 'did:axiom:axiomid.app:pi-mock-pi-uid',
    } as any);

    const req = mockPostRequest({ username: 'nodiduser' });
    await POST(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          did: 'did:axiom:axiomid.app:pi-mock-pi-uid',
        }),
      }),
    );
  });

  it('encodes name as metadata when updating an existing user with name', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'meta-update-id',
      walletAddress: 'pi:metaupdate',
      tier: 'Visitor',
      xp: 10,
      piUid: 'mock-pi-uid',
      did: 'did:axiom:axiomid.app:pi-mock-pi-uid',
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'meta-update-id',
      walletAddress: 'pi:metaupdate',
      tier: 'Visitor',
      xp: 10,
      piUid: 'mock-pi-uid',
      kycStatus: 'PENDING',
      did: 'did:axiom:axiomid.app:pi-mock-pi-uid',
    } as any);

    const req = mockPostRequest({ username: 'metaupdate', name: 'Updated Name' });
    await POST(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: JSON.stringify({ displayName: 'Updated Name' }),
        }),
      }),
    );
  });

  it('omits metadata from update payload when name is not provided', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'noupdate-meta',
      walletAddress: 'pi:noupdatemeta',
      tier: 'Visitor',
      xp: 0,
      piUid: 'mock-pi-uid',
      did: 'did:axiom:axiomid.app:pi-mock-pi-uid',
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'noupdate-meta',
      walletAddress: 'pi:noupdatemeta',
      tier: 'Visitor',
      xp: 0,
      piUid: 'mock-pi-uid',
      kycStatus: 'PENDING',
      did: 'did:axiom:axiomid.app:pi-mock-pi-uid',
    } as any);

    const req = mockPostRequest({ username: 'noupdatemeta' });
    await POST(req);

    const updateCall = mockPrisma.user.update.mock.calls[0][0];
    expect(updateCall.data.metadata).toBeUndefined();
  });
});
