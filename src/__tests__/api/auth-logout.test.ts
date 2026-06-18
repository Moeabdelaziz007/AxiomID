/**
 * @jest-environment node
 *
 * Tests for src/app/api/auth/logout/route.ts
 *
 * PR change: logout now calls clearAuthCache(hashToken(accessToken)) to
 * invalidate only the specific user's cached token instead of clearing all.
 */

// Must be before any imports so hoisting works
jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn(),
  clearAuthCache: jest.fn(),
  hashToken: jest.fn((token: string) => `hashed-${token}`),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn(),
  RATE_LIMITS: {
    authenticated: { windowMs: 60_000, maxRequests: 100 },
  },
}));

jest.mock('@/lib/ip', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { POST } from '@/app/api/auth/logout/route';
import { prisma } from '@/lib/prisma';
import { requireAuth, clearAuthCache, hashToken } from '@/lib/auth-middleware';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockRequireAuth = requireAuth as jest.Mock;
const mockClearAuthCache = clearAuthCache as jest.Mock;
const mockHashToken = hashToken as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockUser = {
  id: 'user-123',
  walletAddress: 'pi:alice',
  piUid: 'pi-uid-1',
  piUsername: 'alice',
  xp: 100,
  tier: 'Citizen',
};

function mockPostRequest(authHeader?: string) {
  const headers: Record<string, string> = {};
  if (authHeader) headers['authorization'] = authHeader;
  return new Request('http://localhost/api/auth/logout', {
    method: 'POST',
    headers,
  }) as any;
}

describe('POST /api/auth/logout — rate limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockPrisma.user.update.mockResolvedValue({} as any);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest('Bearer some-token');
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('rate limit check happens before auth check', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest('Bearer some-token');
    await POST(req);

    expect(mockRequireAuth).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/logout — auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it('returns 401 when user is not authenticated', async () => {
    const { apiError } = jest.requireActual('@/lib/errors') as any;
    mockRequireAuth.mockResolvedValue({ error: apiError('UNAUTHORIZED', 'Unauthorized'), user: null });

    const req = mockPostRequest();
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout — success with targeted cache invalidation (PR change)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockPrisma.user.update.mockResolvedValue({} as any);
    // Default hashToken mock returns 'hashed-<token>'
    mockHashToken.mockImplementation((token: string) => `hashed-${token}`);
  });

  it('returns 200 with success message on valid logout', async () => {
    const req = mockPostRequest('Bearer my-access-token');
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe('Logged out successfully');
  });

  it('clears piAccessToken from database', async () => {
    const req = mockPostRequest('Bearer my-access-token');
    await POST(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: { piAccessToken: null },
    });
  });

  it('calls clearAuthCache with hashToken(accessToken) — not clearAuthCache()', async () => {
    const req = mockPostRequest('Bearer my-access-token');
    await POST(req);

    // hashToken should have been called with the raw token
    expect(mockHashToken).toHaveBeenCalledWith('my-access-token');

    // clearAuthCache should be called with the hashed value, not no args
    expect(mockClearAuthCache).toHaveBeenCalledWith('hashed-my-access-token');
    expect(mockClearAuthCache).not.toHaveBeenCalledWith(); // not called with no args
  });

  it('does not call clearAuthCache when Authorization header is absent', async () => {
    const req = mockPostRequest(); // no auth header
    // Auth will fail because requireAuth checks the header, but we mock it to succeed
    await POST(req);

    // No accessToken extracted → clearAuthCache should not be called
    expect(mockClearAuthCache).not.toHaveBeenCalled();
  });

  it('clearAuthCache is called with the correct token hash (regression: not clear-all)', async () => {
    // Ensure the targeted hash is based on the actual Bearer token value
    const token = 'super-secret-pi-token';
    mockHashToken.mockImplementation((t: string) => `sha256-of-${t}`);

    const req = mockPostRequest(`Bearer ${token}`);
    await POST(req);

    expect(mockClearAuthCache).toHaveBeenCalledWith(`sha256-of-${token}`);
    expect(mockClearAuthCache).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/auth/logout — database error', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it('returns 500 when database update fails', async () => {
    mockPrisma.user.update.mockRejectedValue(new Error('DB connection lost'));

    const req = mockPostRequest('Bearer my-token');
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('does not call clearAuthCache when DB update throws', async () => {
    mockPrisma.user.update.mockRejectedValue(new Error('DB error'));

    const req = mockPostRequest('Bearer my-token');
    await POST(req);

    expect(mockClearAuthCache).not.toHaveBeenCalled();
  });
});