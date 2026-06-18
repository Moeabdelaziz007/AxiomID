 
/**
 * @jest-environment node
 */

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
  RATE_LIMITS: { piAuth: { windowMs: 60000, maxRequests: 5 } },
}));

import { POST } from '@/app/api/auth/pi/route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function mockRequest(body: unknown) {
  return new Request('http://localhost/api/auth/pi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

function mockCreateReturnsArgs(id: string) {
  return jest.fn().mockImplementation(async (args: any) => ({
    id,
    walletAddress: args.data.walletAddress,
    stellarAddress: args.data.stellarAddress,
    piUid: args.data.piUid,
    piUsername: args.data.piUsername,
    xp: args.data.xp,
    tier: args.data.tier,
    did: args.data.did,
    didMethod: args.data.didMethod,
    kycStatus: 'NONE',
    agent: null,
  } as any));
}

describe('POST /api/auth/pi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates new user on valid Pi auth', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'pi-uid-123', username: 'testuser' }),
    });

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'pi:pi-uid-123',
      stellarAddress: null,
      piUid: 'pi-uid-123',
      piUsername: 'testuser',
      xp: 0,
      tier: 'Visitor',
      did: 'did:axiom:axiomid.app:pi:pi-uid-123',
      kycStatus: 'NONE',
      agent: null,
    } as any);

    const req = mockRequest({
      accessToken: 'valid-token',
      uid: 'pi-uid-123',
      username: 'testuser',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.userId).toBe('user-1');
    expect(data.walletAddress).toBe('pi:pi-uid-123');
    expect(data.did).toBe('did:axiom:axiomid.app:pi:pi-uid-123');
  });

  it('updates existing user on return visit and repairs missing DID', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'existing-uid', username: 'updated' }),
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user',
      piUid: 'existing-uid',
      did: null, // missing DID
      didMethod: null,
    } as any);

    mockPrisma.user.update.mockResolvedValue({
      id: 'existing-user',
      walletAddress: 'pi:existing-uid',
      stellarAddress: null,
      piUid: 'existing-uid',
      piUsername: 'updated',
      xp: 100,
      tier: 'Citizen',
      did: 'did:axiom:axiomid.app:pi:existing-uid',
      didMethod: 'did:axiom',
      kycStatus: 'VERIFIED',
      agent: { name: 'My Agent' },
    } as any);

    const req = mockRequest({
      accessToken: 'new-token',
      uid: 'existing-uid',
      username: 'updated',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.userId).toBe('existing-user');
    expect(data.did).toBe('did:axiom:axiomid.app:pi:existing-uid');
    expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        did: 'did:axiom:axiomid.app:pi:existing-uid',
        didMethod: 'did:axiom',
      }),
    }));
  });

  it('ignores client-supplied Pi walletAddress and extracts from Pi API response', async () => {
    const officialStellarAddress = 'GD5T6YZRMCK7O4JRGXNKH2S3W3E42J2DT3R4J33J4H46J4G4H4K4L4M4';
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        uid: 'secure-pi-uid',
        username: 'secureuser',
        wallet: { address: officialStellarAddress }
      }),
    });

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create = mockCreateReturnsArgs('secure-user');

    const req = mockRequest({
      accessToken: 'valid-token',
      uid: 'secure-pi-uid',
      username: 'secureuser',
      walletAddress: 'demo:forged-address',
      stellarAddress: 'GBAD-forged-stellar-address',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        walletAddress: 'pi:secure-pi-uid',
        stellarAddress: officialStellarAddress,
        piUid: 'secure-pi-uid',
        did: 'did:axiom:axiomid.app:pi:secure-pi-uid',
      }),
    }));
    expect(data.walletAddress).toBe('pi:secure-pi-uid');
    expect(data.stellarAddress).toBe(officialStellarAddress);
  });

  it('returns 401 on invalid Pi token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
    });

    const req = mockRequest({
      accessToken: 'bad-token',
      uid: 'uid',
      username: 'user',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe('PI_AUTH_FAILED');
  });

  it('returns 400 on invalid body', async () => {
    const req = mockRequest({});

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 on UID mismatch', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'different-uid' }),
    });

    const req = mockRequest({
      accessToken: 'token',
      uid: 'wrong-uid',
      username: 'user',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe('PI_AUTH_FAILED');
  });
});
