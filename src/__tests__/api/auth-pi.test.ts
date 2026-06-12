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
    expect(data.tier).toBe('Visitor');
    expect(data.did).toBe('did:axiom:axiomid.app:pi:pi-uid-123');
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          did: 'did:axiom:axiomid.app:pi:pi-uid-123',
          didMethod: 'did:axiom',
        }),
      }),
    );
  });

  it('updates existing user on return visit', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'existing-uid' }),
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user',
      piUid: 'existing-uid',
      did: 'did:axiom:test',
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'existing-user',
      walletAddress: '0x' + '0'.repeat(40),
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
    expect(data.did).toBe('did:axiom:test');
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ did: expect.any(String) }),
      }),
    );
  });

  it('repairs missing DID for existing Pi users and keeps it stable across repeated logins', async () => {
    const uid = 'stable-uid';
    const did = 'did:axiom:axiomid.app:pi:stable-uid';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid }),
    });

    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'existing-without-did',
        piUid: uid,
        did: null,
      } as any)
      .mockResolvedValueOnce({
        id: 'existing-without-did',
        piUid: uid,
        did,
      } as any);

    mockPrisma.user.update
      .mockResolvedValueOnce({
        id: 'existing-without-did',
        walletAddress: `pi:${uid}`,
        piUid: uid,
        piUsername: 'stable',
        xp: 0,
        tier: 'Visitor',
        did,
        kycStatus: 'NONE',
        agent: null,
      } as any)
      .mockResolvedValueOnce({
        id: 'existing-without-did',
        walletAddress: `pi:${uid}`,
        piUid: uid,
        piUsername: 'stable',
        xp: 0,
        tier: 'Visitor',
        did,
        kycStatus: 'NONE',
        agent: null,
      } as any);

    const firstRes = await POST(mockRequest({
      accessToken: 'first-token',
      uid,
      username: 'stable',
    }));
    const firstData = await firstRes.json();

    const secondRes = await POST(mockRequest({
      accessToken: 'second-token',
      uid,
      username: 'stable',
    }));
    const secondData = await secondRes.json();

    expect(firstRes.status).toBe(200);
    expect(secondRes.status).toBe(200);
    expect(firstData.did).toBe(did);
    expect(secondData.did).toBe(did);
    expect(mockPrisma.user.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ did }),
      }),
    );
    expect(mockPrisma.user.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.not.objectContaining({ did: expect.any(String) }),
      }),
    );
  });

  it('encodes special characters in uid when building DID for new user', async () => {
    const uid = 'uid@domain.com/path';
    const expectedDid = `did:axiom:axiomid.app:pi:${encodeURIComponent(uid)}`;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid }),
    });

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-special',
      walletAddress: `pi:${uid}`,
      piUid: uid,
      piUsername: 'specialuser',
      xp: 0,
      tier: 'Visitor',
      did: expectedDid,
      kycStatus: 'NONE',
      agent: null,
    } as any);

    const res = await POST(mockRequest({
      accessToken: 'valid-token',
      uid,
      username: 'specialuser',
    }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.did).toBe(expectedDid);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          did: expectedDid,
          didMethod: 'did:axiom',
        }),
      }),
    );
  });

  it('returns piDid in response when DB returns null did (response fallback)', async () => {
    const uid = 'fallback-uid';
    const piDid = `did:axiom:axiomid.app:pi:${uid}`;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid }),
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-null-did',
      piUid: uid,
      did: null,
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-null-did',
      walletAddress: `pi:${uid}`,
      piUid: uid,
      piUsername: 'fallbackuser',
      xp: 0,
      tier: 'Visitor',
      did: null,
      kycStatus: 'NONE',
      agent: null,
    } as any);

    const res = await POST(mockRequest({
      accessToken: 'valid-token',
      uid,
      username: 'fallbackuser',
    }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.did).toBe(piDid);
  });

  it('repairs existing user with empty string did (falsy) by writing piDid', async () => {
    const uid = 'empty-did-uid';
    const piDid = `did:axiom:axiomid.app:pi:${uid}`;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid }),
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-empty-did',
      piUid: uid,
      did: '',
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-empty-did',
      walletAddress: `pi:${uid}`,
      piUid: uid,
      piUsername: 'emptyuser',
      xp: 0,
      tier: 'Visitor',
      did: piDid,
      kycStatus: 'NONE',
      agent: null,
    } as any);

    const res = await POST(mockRequest({
      accessToken: 'valid-token',
      uid,
      username: 'emptyuser',
    }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.did).toBe(piDid);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ did: piDid }),
      }),
    );
  });

  it('does not include didMethod in update payload for existing users', async () => {
    const uid = 'no-didmethod-uid';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid }),
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user-2',
      piUid: uid,
      did: 'did:axiom:axiomid.app:pi:no-didmethod-uid',
    } as any);
    mockPrisma.user.update.mockResolvedValue({
      id: 'existing-user-2',
      walletAddress: `pi:${uid}`,
      piUid: uid,
      piUsername: 'nodidmethod',
      xp: 0,
      tier: 'Visitor',
      did: 'did:axiom:axiomid.app:pi:no-didmethod-uid',
      kycStatus: 'NONE',
      agent: null,
    } as any);

    await POST(mockRequest({
      accessToken: 'valid-token',
      uid,
      username: 'nodidmethod',
    }));

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ didMethod: expect.any(String) }),
      }),
    );
  });

  it('includes didMethod only in create payload for new users', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'new-didmethod-uid' }),
    });

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'new-user-dm',
      walletAddress: 'pi:new-didmethod-uid',
      piUid: 'new-didmethod-uid',
      piUsername: 'newdidmethod',
      xp: 0,
      tier: 'Visitor',
      did: 'did:axiom:axiomid.app:pi:new-didmethod-uid',
      kycStatus: 'NONE',
      agent: null,
    } as any);

    await POST(mockRequest({
      accessToken: 'valid-token',
      uid: 'new-didmethod-uid',
      username: 'newdidmethod',
    }));

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          didMethod: 'did:axiom',
        }),
      }),
    );
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 401 on invalid Pi token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,

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
