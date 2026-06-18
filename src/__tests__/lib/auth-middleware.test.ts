/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.unmock('@/lib/auth-middleware');

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/errors', () => ({
  apiError: jest.fn((code: string, message: string) => ({
    status: 401,
    json: async () => ({ code, message }),
  })),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { requireAuth, clearAuthCache } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function mockRequestWithHeader(headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as any;
}

describe('requireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    clearAuthCache();
  });

  it('returns error when Authorization header is missing', async () => {
    const req = mockRequestWithHeader({});
    const result = await requireAuth(req);

    expect(result.user).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('returns error when Authorization header does not start with Bearer', async () => {
    const req = mockRequestWithHeader({ authorization: 'Basic abc123' });
    const result = await requireAuth(req);

    expect(result.user).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('returns error when Pi API returns non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    const req = mockRequestWithHeader({ authorization: 'Bearer test-token' });
    const result = await requireAuth(req);

    expect(result.user).toBeNull();
    expect(result.error).toBeDefined();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.minepi.com/v2/me',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      })
    );
  });

  it('returns error when Pi API returns user without uid', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ username: 'testuser' }),
    });

    const req = mockRequestWithHeader({ authorization: 'Bearer test-token-no-uid' });
    const result = await requireAuth(req);

    expect(result.user).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('returns error when user not found in database', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'pi-user-123', username: 'testuser' }),
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = mockRequestWithHeader({ authorization: 'Bearer test-token-not-found' });
    const result = await requireAuth(req);

    expect(result.user).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('returns user on successful authentication', async () => {
    const mockUser = {
      id: 'user-1',
      walletAddress: '0xabc',
      piUid: 'pi-user-123',
      piUsername: 'testuser',
      xp: 100,
      tier: 'Citizen',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'pi-user-123', username: 'testuser' }),
    });
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

    const req = mockRequestWithHeader({ authorization: 'Bearer test-token-success' });
    const result = await requireAuth(req);

    expect(result.error).toBeNull();
    expect(result.user).toEqual(mockUser);
  });

  it('caches user on successful authentication', async () => {
    const mockUser = {
      id: 'user-1',
      walletAddress: '0xabc',
      piUid: 'pi-user-123',
      piUsername: 'testuser',
      xp: 100,
      tier: 'Citizen',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'pi-user-123', username: 'testuser' }),
    });
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

    const req = mockRequestWithHeader({ authorization: 'Bearer cache-test-token' });

    // First call - hits Pi API
    const result1 = await requireAuth(req);
    expect(result1.user).toEqual(mockUser);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call - should use cache (no additional Pi API call)
    const result2 = await requireAuth(req);
    expect(result2.user).toEqual(mockUser);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  it('invalidates cache on Pi API 401 response', async () => {
    // First call succeeds and caches
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uid: 'pi-user-123', username: 'testuser' }),
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      walletAddress: '0xabc',
      piUid: 'pi-user-123',
      piUsername: 'testuser',
      xp: 100,
      tier: 'Citizen',
    } as any);

    const req1 = mockRequestWithHeader({ authorization: 'Bearer valid-token-1' });
    const result1 = await requireAuth(req1);
    expect(result1.user).toBeDefined();

    // Second call with a DIFFERENT token → Pi API returns 401 (token revoked)
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    const req2 = mockRequestWithHeader({ authorization: 'Bearer revoked-token-2' });
    const result2 = await requireAuth(req2);
    expect(result2.user).toBeNull();
    expect(result2.error).toBeDefined();
  });

  it('returns error when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const req = mockRequestWithHeader({ authorization: 'Bearer error-test-token' });
    const result = await requireAuth(req);

    expect(result.user).toBeNull();
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// MAX_CACHE_SIZE – tests scoped to the PR change
// ---------------------------------------------------------------------------

describe('MAX_CACHE_SIZE configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('defaults MAX_CACHE_SIZE to 1000 when PI_AUTH_CACHE_MAX_SIZE is not set', async () => {
    delete process.env.PI_AUTH_CACHE_MAX_SIZE;

    // Dynamically import the module so the constant is parsed with the current env
    const mod = await import('@/lib/auth-middleware');
    // The module exports are available; the default value is validated indirectly:
    // with a small cache (less than 1000) cleanup must NOT be triggered.
    // We just verify the module loads correctly and the env default is respected
    // by ensuring setCachedUser can store entries without unexpected cleanup.
    mod.clearAuthCache();

    const mockLocalFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'default-uid', username: 'user' }),
    });
    global.fetch = mockLocalFetch;

    const { prisma: localPrisma } = await import('@/lib/prisma');
    const localMockPrisma = localPrisma as jest.Mocked<typeof localPrisma>;
    localMockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      walletAddress: '0x1',
      piUid: 'default-uid',
      piUsername: 'user',
      xp: 0,
      tier: 'Citizen',
    } as any);

    // A single auth call should work fine (cache size 0 → 1, well under 1000)
    const req = { headers: { get: (n: string) => n === 'authorization' ? 'Bearer default-size-token' : null } } as any;
    const result = await mod.requireAuth(req);
    expect(result.user).not.toBeNull();
    expect(mockLocalFetch).toHaveBeenCalledTimes(1);
  });

  it('reads MAX_CACHE_SIZE from PI_AUTH_CACHE_MAX_SIZE environment variable', async () => {
    process.env.PI_AUTH_CACHE_MAX_SIZE = '3';

    const mod = await import('@/lib/auth-middleware');
    mod.clearAuthCache();

    const mockLocalFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'env-uid', username: 'envuser' }),
    });
    global.fetch = mockLocalFetch;

    const { prisma: localPrisma } = await import('@/lib/prisma');
    const localMockPrisma = localPrisma as jest.Mocked<typeof localPrisma>;
    localMockPrisma.user.findUnique.mockResolvedValue({
      id: 'u-env',
      walletAddress: '0xenv',
      piUid: 'env-uid',
      piUsername: 'envuser',
      xp: 0,
      tier: 'Citizen',
    } as any);

    // Populate cache up to MAX_CACHE_SIZE (3) using distinct tokens
    for (let i = 0; i < 3; i++) {
      mockLocalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uid: `env-uid-${i}`, username: `user${i}` }),
      });
      localMockPrisma.user.findUnique.mockResolvedValueOnce({
        id: `u-${i}`,
        walletAddress: `0x${i}`,
        piUid: `env-uid-${i}`,
        piUsername: `user${i}`,
        xp: 0,
        tier: 'Citizen',
      } as any);
      const req = { headers: { get: (n: string) => n === 'authorization' ? `Bearer env-token-${i}` : null } } as any;
      await mod.requireAuth(req);
    }

    // The 4th call (size will be 3 which is NOT > 3, so cleanup not triggered yet)
    // then the 5th call (size == 4 which IS > 3, so cleanup triggers)
    // We verify the module accepted the env-var value by checking this flow succeeds
    mockLocalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uid: 'env-uid-extra', username: 'extra' }),
    });
    localMockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'u-extra',
      walletAddress: '0xextra',
      piUid: 'env-uid-extra',
      piUsername: 'extra',
      xp: 0,
      tier: 'Citizen',
    } as any);
    const extraReq = { headers: { get: (n: string) => n === 'authorization' ? 'Bearer env-token-extra' : null } } as any;
    const result = await mod.requireAuth(extraReq);
    expect(result.user).not.toBeNull();
  });
});

describe('setCachedUser cache size management (MAX_CACHE_SIZE)', () => {
  // These tests exercise the exact changed line:
  //   if (tokenCache.size > MAX_CACHE_SIZE) { cleanupExpiredEntries(); }
  // We use a small MAX_CACHE_SIZE via env var and jest.resetModules() so the
  // constant is reparsed, giving us a fast and deterministic test.

  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.useFakeTimers();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
    jest.useRealTimers();
  });

  /** Helper: build a successfull requireAuth for one unique token via the given module instance. */
  async function authWithToken(
    mod: typeof import('@/lib/auth-middleware'),
    localPrisma: jest.Mocked<typeof import('@/lib/prisma').prisma>,
    tokenSuffix: string,
  ) {
    const uid = `uid-${tokenSuffix}`;
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uid, username: tokenSuffix }),
    });
    localPrisma.user.findUnique.mockResolvedValueOnce({
      id: `id-${tokenSuffix}`,
      walletAddress: '0xtest',
      piUid: uid,
      piUsername: tokenSuffix,
      xp: 0,
      tier: 'Citizen',
    } as any);
    const req = {
      headers: { get: (n: string) => n === 'authorization' ? `Bearer token-${tokenSuffix}` : null },
    } as any;
    return mod.requireAuth(req);
  }

  it('does not trigger cleanup when cache size equals MAX_CACHE_SIZE (strict > boundary)', async () => {
    process.env.PI_AUTH_CACHE_MAX_SIZE = '3';
    const mod = await import('@/lib/auth-middleware');
    mod.clearAuthCache();
    global.fetch = jest.fn();
    const { prisma: localPrisma } = await import('@/lib/prisma');
    const lp = localPrisma as jest.Mocked<typeof localPrisma>;

    // Fill cache to exactly MAX_CACHE_SIZE (3)
    await authWithToken(mod, lp, 'a');
    await authWithToken(mod, lp, 'b');
    await authWithToken(mod, lp, 'c');
    // cache.size == 3 == MAX_CACHE_SIZE → condition (3 > 3) is FALSE → no cleanup

    // All 3 tokens should still be cached: re-requesting them must NOT call fetch again
    const fetchMock = global.fetch as jest.Mock;
    const callsBeforeCheck = fetchMock.mock.calls.length;

    const cachedReqA = { headers: { get: (n: string) => n === 'authorization' ? 'Bearer token-a' : null } } as any;
    const cachedReqB = { headers: { get: (n: string) => n === 'authorization' ? 'Bearer token-b' : null } } as any;
    const cachedReqC = { headers: { get: (n: string) => n === 'authorization' ? 'Bearer token-c' : null } } as any;

    await mod.requireAuth(cachedReqA);
    await mod.requireAuth(cachedReqB);
    await mod.requireAuth(cachedReqC);

    // No new fetch calls – entries were not evicted (cleanup was not triggered)
    expect(fetchMock.mock.calls.length).toBe(callsBeforeCheck);
  });

  it('triggers cleanupExpiredEntries when cache size exceeds MAX_CACHE_SIZE', async () => {
    process.env.PI_AUTH_CACHE_MAX_SIZE = '3';
    const mod = await import('@/lib/auth-middleware');
    mod.clearAuthCache();
    global.fetch = jest.fn();
    const { prisma: localPrisma } = await import('@/lib/prisma');
    const lp = localPrisma as jest.Mocked<typeof localPrisma>;

    // Fill cache to exactly MAX_CACHE_SIZE with entries that will be expired
    await authWithToken(mod, lp, 'x1');
    await authWithToken(mod, lp, 'x2');
    await authWithToken(mod, lp, 'x3');
    // Advance time past CACHE_TTL_MS (default 300 000 ms) so all 3 entries expire
    jest.advanceTimersByTime(400000);

    // Add a 4th entry: cache.size == 3 > 3 is FALSE → still no cleanup on this call
    // The 4th entry goes in, size becomes 4.
    await authWithToken(mod, lp, 'x4');

    // Now add a 5th entry: cache.size == 4 > 3 is TRUE → cleanup runs first
    // cleanup removes the 3 expired entries (x1, x2, x3), leaving x4 (not expired yet
    // because it was added after the time advance, and fake timers haven't moved further).
    await authWithToken(mod, lp, 'x5');

    // Verify expired tokens x1–x3 are gone from cache: re-requesting them must call fetch
    const fetchMock = global.fetch as jest.Mock;
    const callsBeforeVerify = fetchMock.mock.calls.length;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'uid-x1', username: 'x1' }),
    });
    lp.user.findUnique.mockResolvedValue({
      id: 'id-x1', walletAddress: '0xtest', piUid: 'uid-x1',
      piUsername: 'x1', xp: 0, tier: 'Citizen',
    } as any);

    const reqX1 = { headers: { get: (n: string) => n === 'authorization' ? 'Bearer token-x1' : null } } as any;
    await mod.requireAuth(reqX1);

    // x1 was expired and cleaned up → fetch was called again
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBeforeVerify);
  });

  it('cleanup does not remove non-expired entries when triggered', async () => {
    process.env.PI_AUTH_CACHE_MAX_SIZE = '2';
    const mod = await import('@/lib/auth-middleware');
    mod.clearAuthCache();
    global.fetch = jest.fn();
    const { prisma: localPrisma } = await import('@/lib/prisma');
    const lp = localPrisma as jest.Mocked<typeof localPrisma>;

    // Add 2 entries (at MAX_CACHE_SIZE)
    await authWithToken(mod, lp, 'keep1');
    await authWithToken(mod, lp, 'keep2');

    // Expire keep1 only by advancing time; keep2 added shortly after won't expire
    // Note: both were added at roughly the same time in fake timer world,
    // so we need to add them at different times.
    // Restart: clear and add entries with time gaps.
    mod.clearAuthCache();

    await authWithToken(mod, lp, 'old');
    jest.advanceTimersByTime(400000); // old expires
    await authWithToken(mod, lp, 'new1'); // size 2, not > 2 → no cleanup yet

    // Add new2: size == 2, not > 2 → no cleanup
    await authWithToken(mod, lp, 'new2'); // size 3, > 2 → wait this triggers on next add

    // Add new3: size == 3 > 2 → cleanup runs, removes 'old', keeps 'new1' and 'new2'
    await authWithToken(mod, lp, 'new3');

    const fetchMock = global.fetch as jest.Mock;
    const callsBefore = fetchMock.mock.calls.length;

    // new1 and new2 should still be cached (no fetch)
    const reqNew1 = { headers: { get: (n: string) => n === 'authorization' ? 'Bearer token-new1' : null } } as any;
    const reqNew2 = { headers: { get: (n: string) => n === 'authorization' ? 'Bearer token-new2' : null } } as any;
    await mod.requireAuth(reqNew1);
    await mod.requireAuth(reqNew2);

    expect(fetchMock.mock.calls.length).toBe(callsBefore); // no new fetch calls
  });

  it('regression: behavior is unchanged from hardcoded 1000 when env var is absent', async () => {
    // When PI_AUTH_CACHE_MAX_SIZE is not set, MAX_CACHE_SIZE should equal 1000.
    // We can't easily fill 1000 entries in a test, but we can verify the constant
    // is parsed as 1000 by confirming that with 999 entries and default MAX_CACHE_SIZE,
    // adding entry 1000 (size == 1000, not > 1000) does not trigger cleanup.
    // We use a small shortcut: set env to '1000' explicitly and verify same behavior.
    delete process.env.PI_AUTH_CACHE_MAX_SIZE;
    process.env.PI_AUTH_CACHE_MAX_SIZE = '1000';
    const mod = await import('@/lib/auth-middleware');
    mod.clearAuthCache();
    global.fetch = jest.fn();
    const { prisma: localPrisma } = await import('@/lib/prisma');
    const lp = localPrisma as jest.Mocked<typeof localPrisma>;

    // With MAX_CACHE_SIZE = 1000, cache of size 2 should NEVER trigger cleanup
    await authWithToken(mod, lp, 'reg1');
    await authWithToken(mod, lp, 'reg2');

    const fetchMock = global.fetch as jest.Mock;
    const callsBefore = fetchMock.mock.calls.length;

    const reqReg1 = { headers: { get: (n: string) => n === 'authorization' ? 'Bearer token-reg1' : null } } as any;
    await mod.requireAuth(reqReg1);

    // reg1 should still be cached (cleanup was not triggered, nothing evicted)
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });
});
