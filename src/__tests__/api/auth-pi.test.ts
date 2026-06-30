 
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
      did: 'did:axiom:axiomid.app:pi:updated',
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
    expect(data.did).toBe('did:axiom:axiomid.app:pi:updated');
    expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
      did: 'did:axiom:axiomid.app:pi:updated',
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
        did: 'did:axiom:axiomid.app:pi:secureuser',
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

  it('returns 401 PI_AUTH_FAILED with timeout message when AbortSignal fires (PR change: 10s timeout)', async () => {
    // Simulate the abort/timeout error that AbortSignal.timeout(10000) raises
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    (global.fetch as jest.Mock).mockRejectedValue(abortError);

    const req = mockRequest({
      accessToken: 'slow-token',
      uid: 'pi-uid-timeout',
      username: 'slowuser',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe('PI_AUTH_FAILED');
    expect(data.error).toMatch(/timed out/i);
  });

  it('calls Pi API with AbortSignal (10s) — PR change from 5s', async () => {
    // Spy on AbortSignal.timeout to verify 10000ms is passed
    const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'pi-uid-123', username: 'testuser' }),
    });

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-timeout-test',
      walletAddress: 'pi:pi-uid-123',
      stellarAddress: null,
      piUid: 'pi-uid-123',
      piUsername: 'testuser',
      xp: 0,
      tier: 'Visitor',
      did: 'did:axiom:axiomid.app:pi:testuser',
      kycStatus: 'NONE',
      agent: null,
    } as any);

    const req = mockRequest({
      accessToken: 'valid-token',
      uid: 'pi-uid-123',
      username: 'testuser',
    });

    await POST(req);

    expect(timeoutSpy).toHaveBeenCalledWith(10000);
    timeoutSpy.mockRestore();
  });
});

const SANDBOX_TEST_TOKEN = 'sandbox-dev-token-abc-123';

describe('POST /api/auth/pi — sandbox dev token bypass (PR change)', () => {
  let prevSandboxDevToken: string | undefined;
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    prevSandboxDevToken = process.env.SANDBOX_DEV_TOKEN;
    process.env.SANDBOX_DEV_TOKEN = SANDBOX_TEST_TOKEN;
  });

  afterEach(() => {
    if (prevSandboxDevToken === undefined) {
      delete process.env.SANDBOX_DEV_TOKEN;
    } else {
      process.env.SANDBOX_DEV_TOKEN = prevSandboxDevToken;
    }
  });

  // In test environment, NODE_ENV === 'test' which is !== 'production',
  // so isSandboxOrDev is true and the bypass is active.
  it('skips Pi API call and uses env-driven stellar address for sandbox-dev-token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'sandbox-user-1',
      walletAddress: 'pi:sandbox-developer',
      stellarAddress: 'GD5TJZNKPNFSSXN7XF26NNDAOVDN57S7LNJ6FSL2X5D62N676572N4Y2',
      piUid: 'sandbox-developer',
      piUsername: 'developer',
      xp: 0,
      tier: 'Visitor',
      did: 'did:axiom:axiomid.app:pi:sandbox-developer',
      kycStatus: 'NONE',
      agent: null,
    } as any);

    const req = mockRequest({
      accessToken: SANDBOX_TEST_TOKEN,
      uid: 'sandbox-developer',
      username: 'developer',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    // Fetch to api.minepi.com must NOT be called for the sandbox token
    expect(global.fetch).not.toHaveBeenCalled();
    // The hardcoded stellar address should propagate into the create call
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stellarAddress: 'GD5TJZNKPNFSSXN7XF26NNDAOVDN57S7LNJ6FSL2X5D62N676572N4Y2',
        }),
      })
    );
    expect(data.walletAddress).toBe('pi:sandbox-developer');
  });

  it('still calls Pi API when accessToken is NOT the sandbox dev token (even in dev)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'real-uid', username: 'realuser' }),
    });

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'real-user-1',
      walletAddress: 'pi:real-uid',
      stellarAddress: null,
      piUid: 'real-uid',
      piUsername: 'realuser',
      xp: 0,
      tier: 'Visitor',
      did: 'did:axiom:axiomid.app:pi:real-uid',
      kycStatus: 'NONE',
      agent: null,
    } as any);

    const req = mockRequest({
      accessToken: 'some-real-token',
      uid: 'real-uid',
      username: 'realuser',
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    // Pi API should still be called for non-sandbox tokens
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.minepi.com/v2/me',
      expect.objectContaining({
        headers: { Authorization: 'Bearer some-real-token' },
      })
    );
  });

  it('sandbox bypass creates user with correct walletAddress and DID format', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockImplementation(async (args: any) => ({
      id: 'sb-user',
      walletAddress: args.data.walletAddress,
      stellarAddress: args.data.stellarAddress,
      piUid: args.data.piUid,
      piUsername: args.data.piUsername,
      xp: args.data.xp,
      tier: args.data.tier,
      did: args.data.did,
      kycStatus: 'NONE',
      agent: null,
    }));

    const req = mockRequest({
      accessToken: SANDBOX_TEST_TOKEN,
      uid: 'sandbox-developer',
      username: 'developer',
    });

    await POST(req);

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          walletAddress: 'pi:sandbox-developer',
          piUid: 'sandbox-developer',
          did: expect.stringContaining('developer'),
          didMethod: 'did:axiom',
        }),
      })
    );
  });

  it('sandbox token is NOT accepted in production (NODE_ENV=production)', async () => {
    const origNodeEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true, configurable: true });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const req = mockRequest({
      accessToken: SANDBOX_TEST_TOKEN,
      uid: 'sandbox-developer',
      username: 'developer',
    });

    const res = await POST(req);
    const data = await res.json();

    // In production the sandbox bypass is not active — Pi API is always called
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.minepi.com/v2/me',
      expect.anything()
    );
    // And the invalid token should result in a PI_AUTH_FAILED error
    expect(data.code).toBe('PI_AUTH_FAILED');

    Object.defineProperty(process.env, 'NODE_ENV', { value: origNodeEnv, writable: true, configurable: true });
  });

  it('sandbox bypass updates existing user without calling Pi API', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-sandbox-user',
      piUid: 'sandbox-developer',
      did: 'did:axiom:axiomid.app:pi:sandbox-developer',
      didMethod: 'did:axiom',
      agent: null,
    } as any);

    mockPrisma.user.update.mockResolvedValue({
      id: 'existing-sandbox-user',
      walletAddress: 'pi:sandbox-developer',
      stellarAddress: 'GD5TJZNKPNFSSXN7XF26NNDAOVDN57S7LNJ6FSL2X5D62N676572N4Y2',
      piUid: 'sandbox-developer',
      piUsername: 'developer',
      xp: 50,
      tier: 'Citizen',
      did: 'did:axiom:axiomid.app:pi:sandbox-developer',
      kycStatus: 'NONE',
      agent: null,
    } as any);

    const req = mockRequest({
      accessToken: SANDBOX_TEST_TOKEN,
      uid: 'sandbox-developer',
      username: 'developer',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(data.stellarAddress).toBe('GD5TJZNKPNFSSXN7XF26NNDAOVDN57S7LNJ6FSL2X5D62N676572N4Y2');
  });
});
