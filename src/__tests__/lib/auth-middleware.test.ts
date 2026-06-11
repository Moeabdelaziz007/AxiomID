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

// Mock global fetch for Pi API calls
global.fetch = jest.fn();

import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockFetch = global.fetch as jest.Mock;

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
  });

  it('returns the user when Bearer token is valid and user exists in DB', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'pi-uid-1', username: 'testuser' }),
    });
    const mockUser = {
      id: 'user-1',
      walletAddress: 'pi:testuser',
      piUid: 'pi-uid-1',
      piUsername: 'testuser',
      xp: 0,
      tier: 'Visitor',
    };
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

    const req = mockRequestWithHeader({ authorization: 'Bearer valid-pi-token' });
    const result = await requireAuth(req);

    expect(result.error).toBeNull();
    expect(result.user).toEqual(mockUser);
    expect(mockFetch).toHaveBeenCalledWith('https://api.minepi.com/v2/me', {
      headers: { Authorization: 'Bearer valid-pi-token' },
    });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { piUid: 'pi-uid-1' },
      select: {
        id: true,
        walletAddress: true,
        piUid: true,
        piUsername: true,
        xp: true,
        tier: true,
      },
    });
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = mockRequestWithHeader({});
    const result = await requireAuth(req);

    expect(result.user).toBeNull();
    expect(result.error).not.toBeNull();
    expect((result.error as any).status).toBe(401);
    const body = await (result.error as any).json();
    expect(body.code).toBe('UNAUTHORIZED');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const req = mockRequestWithHeader({ authorization: 'Basic sometoken' });
    const result = await requireAuth(req);

    expect(result.user).toBeNull();
    expect((result.error as any).status).toBe(401);
    const body = await (result.error as any).json();
    expect(body.code).toBe('UNAUTHORIZED');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 401 when Pi API returns non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    const req = mockRequestWithHeader({ authorization: 'Bearer bad-token' });
    const result = await requireAuth(req);

    expect(result.user).toBeNull();
    expect((result.error as any).status).toBe(401);
    const body = await (result.error as any).json();
    expect(body.code).toBe('UNAUTHORIZED');
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns 401 when Pi API response is missing uid', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ username: 'testuser' }), // no uid
    });

    const req = mockRequestWithHeader({ authorization: 'Bearer valid-token' });
    const result = await requireAuth(req);

    expect(result.user).toBeNull();
    expect((result.error as any).status).toBe(401);
    const body = await (result.error as any).json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when user is not found in the database', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'pi-uid-unknown', username: 'unknown' }),
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = mockRequestWithHeader({ authorization: 'Bearer valid-token' });
    const result = await requireAuth(req);

    expect(result.user).toBeNull();
    expect((result.error as any).status).toBe(401);
    const body = await (result.error as any).json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when fetch throws a network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const req = mockRequestWithHeader({ authorization: 'Bearer valid-token' });
    const result = await requireAuth(req);

    expect(result.user).toBeNull();
    expect((result.error as any).status).toBe(401);
    const body = await (result.error as any).json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('sends the token verbatim to the Pi API', async () => {
    const specificToken = 'my-specific-bearer-token-xyz';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'u123' }),
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'pi:u',
      piUid: 'u123',
      piUsername: null,
      xp: 0,
      tier: 'Visitor',
    } as any);

    const req = mockRequestWithHeader({ authorization: `Bearer ${specificToken}` });
    await requireAuth(req);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.minepi.com/v2/me',
      expect.objectContaining({
        headers: { Authorization: `Bearer ${specificToken}` },
      })
    );
  });

  it('returns 401 when user in DB has no piUid (null)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'some-uid' }),
    });
    // User found but piUid is null/falsy
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'pi:user',
      piUid: null,
      piUsername: null,
      xp: 0,
      tier: 'Visitor',
    } as any);

    const req = mockRequestWithHeader({ authorization: 'Bearer valid-token' });
    const result = await requireAuth(req);

    expect(result.user).toBeNull();
    expect((result.error as any).status).toBe(401);
  });
});
