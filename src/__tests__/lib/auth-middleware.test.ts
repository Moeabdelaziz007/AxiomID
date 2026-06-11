/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

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
