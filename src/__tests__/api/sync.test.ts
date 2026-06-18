/**
 * @jest-environment node
 *
 * Tests for src/app/api/sync/route.ts
 *
 * PR changes:
 * 1. POST: interface replaced by Zod SyncRequestSchema (validates source, dryRun, maxRetries)
 * 2. GET: now requires authentication (was previously unauthenticated)
 */

jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    harvestResult: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    agentPresence: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn(),
  RATE_LIMITS: {
    authenticated: { windowMs: 60_000, maxRequests: 100 },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

// Mock math-physics to avoid complex computations
jest.mock('@/lib/math-physics', () => ({
  exponentialBackoff: jest.fn(() => 0),
  shannonEntropy: jest.fn(() => 3.5),
  dataFreshness: jest.fn(() => 0.9),
}));

import { POST, GET } from '@/app/api/sync/route';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockRequireAuth = requireAuth as jest.Mock;
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

function mockPostRequest(body: unknown) {
  return new Request('http://localhost/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

function mockGetRequest() {
  return new Request('http://localhost/api/sync', {
    method: 'GET',
  }) as any;
}

// ---------------------------------------------------------------------------
// POST — SyncRequestSchema validation (PR change)
// ---------------------------------------------------------------------------

describe('POST /api/sync — SyncRequestSchema validation (PR change)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockPrisma.harvestResult.findMany.mockResolvedValue([]);
    mockPrisma.agentPresence.findMany.mockResolvedValue([]);
    mockPrisma.agentPresence.findFirst.mockResolvedValue(null);
    mockPrisma.harvestResult.findFirst.mockResolvedValue(null);
  });

  it('accepts valid body with source="d1"', async () => {
    const req = mockPostRequest({ source: 'd1', dryRun: false, maxRetries: 3 });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it('accepts valid body with source="all"', async () => {
    const req = mockPostRequest({ source: 'all' });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it('uses default values when body is empty object', async () => {
    const req = mockPostRequest({});
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    // Default source="all" means both harvestResults and agentPresence run
    expect(data.results).toBeDefined();
  });

  it('returns 400 for invalid source value', async () => {
    const req = mockPostRequest({ source: 'invalid-source' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when maxRetries is negative', async () => {
    const req = mockPostRequest({ source: 'all', maxRetries: -1 });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when maxRetries exceeds 10', async () => {
    const req = mockPostRequest({ source: 'all', maxRetries: 11 });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when maxRetries is not an integer', async () => {
    const req = mockPostRequest({ source: 'all', maxRetries: 2.5 });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when dryRun is not a boolean', async () => {
    const req = mockPostRequest({ source: 'all', dryRun: 'yes' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('maxRetries boundary: 0 is valid', async () => {
    const req = mockPostRequest({ maxRetries: 0 });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('maxRetries boundary: 10 is valid', async () => {
    const req = mockPostRequest({ maxRetries: 10 });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('returns 400 when body is invalid JSON', async () => {
    const req = new Request('http://localhost/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid json }',
    }) as any;
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('response includes dryRun message when dryRun=true', async () => {
    const req = mockPostRequest({ dryRun: true });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe('Dry run completed');
  });

  it('response includes sync completed message when dryRun=false', async () => {
    const req = mockPostRequest({ dryRun: false });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe('Sync completed');
  });
});

describe('POST /api/sync — auth and rate limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it('returns 401 when user is not authenticated', async () => {
    const { apiError } = jest.requireActual('@/lib/errors') as any;
    mockRequireAuth.mockResolvedValue({ error: apiError('UNAUTHORIZED', 'Unauthorized'), user: null });

    const req = mockPostRequest({ source: 'all' });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ source: 'all' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });
});

// ---------------------------------------------------------------------------
// GET — now requires auth (PR change)
// ---------------------------------------------------------------------------

describe('GET /api/sync — requires authentication (PR change)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    const { apiError } = jest.requireActual('@/lib/errors') as any;
    mockRequireAuth.mockResolvedValue({ error: apiError('UNAUTHORIZED', 'Unauthorized'), user: null });

    const req = mockGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('returns 401 with UNAUTHORIZED code when auth header is missing', async () => {
    const { apiError } = jest.requireActual('@/lib/errors') as any;
    mockRequireAuth.mockResolvedValue({ error: apiError('UNAUTHORIZED', 'Missing token'), user: null });

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(data.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with sync status when authenticated', async () => {
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockPrisma.harvestResult.findFirst.mockResolvedValue(null);
    mockPrisma.agentPresence.findFirst.mockResolvedValue(null);
    mockPrisma.harvestResult.findMany.mockResolvedValue([]);

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.lastSync).toBeDefined();
    expect(data.metrics).toBeDefined();
  });

  it('auth is checked before any DB queries', async () => {
    const { apiError } = jest.requireActual('@/lib/errors') as any;
    mockRequireAuth.mockResolvedValue({ error: apiError('UNAUTHORIZED', 'No auth'), user: null });

    const req = mockGetRequest();
    await GET(req);

    expect(mockPrisma.harvestResult.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.harvestResult.findMany).not.toHaveBeenCalled();
  });

  it('returns metrics with freshness and entropy values', async () => {
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockPrisma.harvestResult.findFirst.mockResolvedValue({
      createdAt: new Date(),
      query: 'test-query',
    } as any);
    mockPrisma.agentPresence.findFirst.mockResolvedValue({
      updatedAt: new Date(),
      status: 'ACTIVE',
    } as any);
    mockPrisma.harvestResult.findMany.mockResolvedValue([{ query: 'test' }] as any);

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.metrics.harvestFreshness).toBeDefined();
    expect(data.metrics.presenceFreshness).toBeDefined();
    expect(data.metrics.queryEntropy).toBeDefined();
  });
});