/* eslint-disable @typescript-eslint/no-explicit-any */
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
      json: async () => ({ uid: 'pi-uid-123' }),
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
      did: null,
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
    expect(data.tier).toBe('Visitor');
  });

  it('updates existing user on return visit', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'existing-uid' }),
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user',
      piUid: 'existing-uid',
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'existing-user',
      walletAddress: 'pi:existing-uid',
      stellarAddress: null,
      piUid: 'existing-uid',
      piUsername: 'updated',
      xp: 100,
      tier: 'Citizen',
      did: 'did:axiom:test',
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
    expect(data.tier).toBe('Citizen');
  });

  it.each(['demo:client-forged', '0x' + 'a'.repeat(40)])(
    'ignores client-supplied Pi walletAddress %s when token is valid',
    async (clientWalletAddress) => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ uid: 'secure-pi-uid', username: 'secureuser' }),
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(async (args: any) => ({
        id: 'secure-user',
        walletAddress: args.data.walletAddress,
        stellarAddress: args.data.stellarAddress,
        piUid: args.data.piUid,
        piUsername: args.data.piUsername,
        xp: args.data.xp,
        tier: args.data.tier,
        did: null,
        kycStatus: 'NONE',
        agent: null,
      } as any));

      const req = mockRequest({
        accessToken: 'valid-token',
        uid: 'secure-pi-uid',
        username: 'secureuser',
        walletAddress: clientWalletAddress,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          walletAddress: 'pi:secure-pi-uid',
        }),
      }));
      expect(data.walletAddress).toBe('pi:secure-pi-uid');
      expect(data.walletAddress).not.toBe(clientWalletAddress);
    }
  );

  it('stores an official Pi API Stellar address separately from the Pi wallet identity', async () => {
    const officialStellarAddress = `G${'A'.repeat(55)}`;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'stellar-pi-uid', username: 'stellaruser', wallet_address: officialStellarAddress }),
    });

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockImplementation(async (args: any) => ({
      id: 'stellar-user',
      walletAddress: args.data.walletAddress,
      stellarAddress: args.data.stellarAddress,
      piUid: args.data.piUid,
      piUsername: args.data.piUsername,
      xp: args.data.xp,
      tier: args.data.tier,
      did: null,
      kycStatus: 'NONE',
      agent: null,
    } as any));

    const req = mockRequest({
      accessToken: 'valid-token',
      uid: 'stellar-pi-uid',
      username: 'stellaruser',
      walletAddress: `0x${'b'.repeat(40)}`,
      stellarAddress: `G${'B'.repeat(55)}`,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        walletAddress: 'pi:stellar-pi-uid',
        stellarAddress: officialStellarAddress,
      }),
    }));
    expect(data.walletAddress).toBe('pi:stellar-pi-uid');
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
