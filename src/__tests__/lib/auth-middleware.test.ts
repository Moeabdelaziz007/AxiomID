 
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

jest.mock('@/lib/auth-tokens', () => ({
  verifyPiTokenWithJwks: jest.fn().mockRejectedValue(new Error("JWKS verification not available in tests")),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { requireAuth, clearAuthCache, hashToken } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function mockRequestWithHeader(headers: Record<string, string> = {}) {
  const allHeaders: Record<string, string> = {};
  Object.keys(headers).forEach(k => {
    allHeaders[k.toLowerCase()] = headers[k];
  });
  if (!allHeaders["user-agent"]) {
    allHeaders["user-agent"] = "Pi Browser / AxiomID Testing";
  }
  return {
    headers: {
      get: (name: string) => allHeaders[name.toLowerCase()] ?? null,
    },
    nextUrl: {
      hostname: "localhost",
    },
    nextUrl: new URL("https://example.com/"),
  } as any;
}

describe('hashToken (PR change: exported)', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    const result = hashToken('any-token');
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns different hashes for different tokens', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });

  it('is deterministic — same token always produces same hash', () => {
    expect(hashToken('stable-token')).toBe(hashToken('stable-token'));
  });

  it('produces known SHA-256 digest for empty string', () => {
    // SHA-256('') = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(hashToken('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('clearAuthCache (PR change: selective invalidation)', () => {
  beforeEach(() => {
    // Start with a clean slate
    jest.clearAllMocks();
    mockFetch.mockClear();
    clearAuthCache();
  });

  it('clearAuthCache() with no argument clears all cache entries', () => {
    // Calling with no arg should not throw
    expect(() => clearAuthCache()).not.toThrow();
  });

  it('clearAuthCache(tokenHash) with a hash removes only that entry', () => {
    const hash = hashToken('test-token-xyz');
    // Calling with a specific hash should not throw
    expect(() => clearAuthCache(hash)).not.toThrow();
  });

  it('clearAuthCache(unknownHash) does not throw for unknown hash', () => {
    expect(() => clearAuthCache('nonexistent-hash-abc123')).not.toThrow();
  });

  it('cached user is removed after clearAuthCache(tokenHash)', async () => {
    const token = 'selective-clear-token-unique';
    const mockUser = {
      id: 'user-selective',
      walletAddress: '0xdef',
      piUid: 'pi-selective',
      piUsername: 'selectiveuser',
      xp: 0,
      tier: 'Beginner',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'pi-selective', username: 'selectiveuser' }),
    });
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

    const req = mockRequestWithHeader({ authorization: `Bearer ${token}` });

    // Populate cache
    const result1 = await requireAuth(req);
    expect(result1.user).toEqual(mockUser);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Remove specific token from cache
    clearAuthCache(hashToken(token));

    // Next request must re-verify (cache miss)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'pi-selective', username: 'selectiveuser' }),
    });
    const result2 = await requireAuth(req);
    expect(result2.user).toEqual(mockUser);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('clearAuthCache(hashToken) does not affect other cached tokens', async () => {
    const tokenA = 'token-keep-me-unique';
    const tokenB = 'token-evict-me-unique';
    const mockUser = {
      id: 'user-multi',
      walletAddress: '0x999',
      piUid: 'pi-multi',
      piUsername: 'multiuser',
      xp: 0,
      tier: 'Beginner',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'pi-multi', username: 'multiuser' }),
    });
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

    const reqA = mockRequestWithHeader({ authorization: `Bearer ${tokenA}` });
    const reqB = mockRequestWithHeader({ authorization: `Bearer ${tokenB}` });

    await requireAuth(reqA);
    await requireAuth(reqB);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Evict only token B
    clearAuthCache(hashToken(tokenB));

    // Token A should still be cached (no extra fetch)
    await requireAuth(reqA);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Token B needs re-verify
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'pi-multi', username: 'multiuser' }),
    });
    await requireAuth(reqB);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

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
// requireAuth — revocation-store integration (PR change: auth-middleware now
// imports isTokenRevoked from @/lib/revocation-store instead of @/lib/revocation)
// ---------------------------------------------------------------------------
describe('requireAuth — revocation check (PR change: uses revocation-store)', () => {
  // Import the real revokeToken from revocation-store so we can seed state.
  // revocation-store is not globally mocked, so the real TTL store is used.
  let revokeToken: (token: string) => Promise<void>;

  beforeAll(async () => {
    const store = await import('@/lib/revocation-store');
    revokeToken = store.revokeToken;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    clearAuthCache();
  });

  it('returns UNAUTHORIZED error for a revoked token without calling Pi API', async () => {
    const revokedToken = 'revocation-store-test-token-unique-abc';
    await revokeToken(revokedToken);

    const req = mockRequestWithHeader({ authorization: `Bearer ${revokedToken}` });
    const result = await requireAuth(req);

    expect(result.user).toBeNull();
    expect(result.error).toBeDefined();
    // Pi API must NOT be called — revocation check is a short-circuit before fetch
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns user for a non-revoked token (revocation store does not block valid tokens)', async () => {
    const validToken = 'revocation-store-valid-token-unique-xyz';
    // Intentionally do NOT revoke this token
    const mockUser = {
      id: 'user-revocation-test',
      walletAddress: '0xfeed',
      piUid: 'pi-revocation-test',
      piUsername: 'revocationtestuser',
      xp: 50,
      tier: 'Citizen',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'pi-revocation-test', username: 'revocationtestuser' }),
    });
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

    const req = mockRequestWithHeader({ authorization: `Bearer ${validToken}` });
    const result = await requireAuth(req);

    expect(result.error).toBeNull();
    expect(result.user).toEqual(mockUser);
  });

  it('revocation check runs before cache lookup (revoked tokens bypass cache)', async () => {
    const token = 'revocation-before-cache-token-unique';
    const mockUser = {
      id: 'user-cache-bypass',
      walletAddress: '0xcafe',
      piUid: 'pi-cache-bypass',
      piUsername: 'cachebypassuser',
      xp: 0,
      tier: 'Visitor',
    };

    // First: authenticate successfully to populate the cache
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'pi-cache-bypass', username: 'cachebypassuser' }),
    });
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

    const req = mockRequestWithHeader({ authorization: `Bearer ${token}` });
    const result1 = await requireAuth(req);
    expect(result1.user).toEqual(mockUser);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Now revoke the token — even though it's cached, it should be blocked
    await revokeToken(token);
    mockFetch.mockReset();

    const result2 = await requireAuth(req);
    expect(result2.user).toBeNull();
    expect(result2.error).toBeDefined();
    // Pi API still not called — revocation short-circuits before cache check
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
