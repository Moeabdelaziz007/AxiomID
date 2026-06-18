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

import { requireAuth, clearAuthCache, hashToken } from '@/lib/auth-middleware';
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

describe('hashToken (exported)', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    const hash = hashToken('my-access-token');
    expect(typeof hash).toBe('string');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes for different tokens', () => {
    const h1 = hashToken('token-a');
    const h2 = hashToken('token-b');
    expect(h1).not.toBe(h2);
  });

  it('is deterministic — same token always produces the same hash', () => {
    const token = 'deterministic-token-xyz';
    expect(hashToken(token)).toBe(hashToken(token));
  });
});

describe('clearAuthCache — selective invalidation (PR change)', () => {
  const mockUser = {
    id: 'user-1',
    walletAddress: '0xabc',
    piUid: 'pi-123',
    piUsername: 'alice',
    xp: 50,
    tier: 'Citizen',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    clearAuthCache(); // start each test with an empty cache
  });

  async function cacheToken(token: string) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uid: 'pi-123', username: 'alice' }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser as any);
    const req = mockRequestWithHeader({ authorization: `Bearer ${token}` });
    await requireAuth(req);
  }

  it('clearAuthCache(tokenHash) removes only the specified token', async () => {
    await cacheToken('token-alpha');
    await cacheToken('token-beta');

    // Invalidate only token-alpha
    clearAuthCache(hashToken('token-alpha'));

    // token-alpha should no longer be cached — Pi API will be called again
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    const reqAlpha = mockRequestWithHeader({ authorization: 'Bearer token-alpha' });
    const resultAlpha = await requireAuth(reqAlpha);
    expect(resultAlpha.user).toBeNull(); // evicted, re-verified and failed

    // token-beta should still be cached — Pi API should NOT be called
    const callsBefore = mockFetch.mock.calls.length;
    const reqBeta = mockRequestWithHeader({ authorization: 'Bearer token-beta' });
    const resultBeta = await requireAuth(reqBeta);
    expect(resultBeta.user).toEqual(mockUser); // still cached
    expect(mockFetch.mock.calls.length).toBe(callsBefore); // no extra fetch
  });

  it('clearAuthCache() with no argument clears all cached tokens', async () => {
    await cacheToken('token-one');
    await cacheToken('token-two');

    clearAuthCache(); // clear all

    // Both tokens should be evicted; re-verify both will call Pi API
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    const reqOne = mockRequestWithHeader({ authorization: 'Bearer token-one' });
    const resultOne = await requireAuth(reqOne);
    expect(resultOne.user).toBeNull();

    const reqTwo = mockRequestWithHeader({ authorization: 'Bearer token-two' });
    const resultTwo = await requireAuth(reqTwo);
    expect(resultTwo.user).toBeNull();

    expect(mockFetch).toHaveBeenCalledTimes(2); // both had to re-verify
  });

  it('clearAuthCache(unknownHash) is a no-op — does not throw', () => {
    expect(() => clearAuthCache('nonexistent-hash-value')).not.toThrow();
  });
});
