/**
 * @jest-environment node
 *
 * Tests for src/app/api/passport/[slug]/route.ts
 *
 * PR changes:
 * 1. getKycStatus now handles null/undefined (returns "pending")
 * 2. decodeURIComponent wrapped in try/catch (returns 400 on malformed slug)
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    userAgent: { findUnique: jest.fn() },
    user: { findFirst: jest.fn() },
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

jest.mock('@/lib/did', () => ({
  createUserDid: jest.fn((id: string) => `did:axomid:${id}`),
}));

jest.mock('@/lib/trust', () => ({
  calculateTrustScore: jest.fn(() => 42),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock('@/lib/sovereign-keys', () => ({
  deriveSovereignAgentKeypair: jest.fn(() => ({
    publicKey: '-----BEGIN PUBLIC KEY-----\nmockPublicKey\n-----END PUBLIC KEY-----',
    privateKey: '-----BEGIN PRIVATE KEY-----\nmockPrivateKey\n-----END PRIVATE KEY-----',
  })),
}));

import { GET } from '@/app/api/passport/[slug]/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';
import { deriveSovereignAgentKeypair } from '@/lib/sovereign-keys';

const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function mockGetRequest() {
  return new Request('http://localhost/api/passport/test') as any;
}

const baseUser = {
  id: 'user-1',
  did: null,
  piUsername: 'alice',
  walletAddress: 'pi:alice',
  stellarAddress: null,
  tier: 'Citizen',
  xp: 100,
  kycStatus: null,
  createdAt: new Date('2024-01-01'),
  stamps: [],
  agent: null,
};

describe('GET /api/passport/[slug] — decodeURIComponent error handling (PR change)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it('returns 400 VALIDATION_ERROR when slug contains malformed percent-encoding', async () => {
    // '%zz' is invalid percent-encoding — decodeURIComponent throws URIError
    const req = mockGetRequest();
    const res = await GET(req, { params: Promise.resolve({ slug: '%zz%zz' }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.error).toContain('Invalid slug encoding');
  });

  it('returns 400 for another malformed percent sequence (%a)', async () => {
    const req = mockGetRequest();
    const res = await GET(req, { params: Promise.resolve({ slug: '%a' }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('does not throw — returns a response even for malformed slugs', async () => {
    const req = mockGetRequest();
    // Should not throw, just return a 400 response
    await expect(
      GET(req, { params: Promise.resolve({ slug: '%zz' }) })
    ).resolves.toBeDefined();
  });

  it('successfully decodes valid percent-encoded slug', async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, kycStatus: 'VERIFIED' } as any);

    const req = mockGetRequest();
    // 'alice%20smith' → 'alice smith' — valid encoding
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice%20smith' }) });

    // Should NOT return 400 (decoding succeeded)
    expect(res.status).not.toBe(400);
  });
});

describe('GET /api/passport/[slug] — getKycStatus null handling (PR change)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
  });

  it('returns kycStatus "pending" when kycStatus is null', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, kycStatus: null } as any);

    const req = mockGetRequest();
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.kycStatus).toBe('pending');
  });

  it('returns kycStatus "pending" when kycStatus is undefined', async () => {
    const userWithoutKyc = { ...baseUser };
    delete (userWithoutKyc as any).kycStatus;
    mockPrisma.user.findFirst.mockResolvedValue(userWithoutKyc as any);

    const req = mockGetRequest();
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.kycStatus).toBe('pending');
  });

  it('returns kycStatus "pending" when kycStatus is "NONE"', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, kycStatus: 'NONE' } as any);

    const req = mockGetRequest();
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.kycStatus).toBe('pending');
  });

  it('returns kycStatus "pending" when kycStatus is "PENDING"', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, kycStatus: 'PENDING' } as any);

    const req = mockGetRequest();
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.kycStatus).toBe('pending');
  });

  it('returns kycStatus "verified" when kycStatus is "VERIFIED"', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, kycStatus: 'VERIFIED' } as any);

    const req = mockGetRequest();
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.kycStatus).toBe('verified');
  });

  it('returns kycStatus "denied" for unknown status values', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, kycStatus: 'REJECTED' } as any);

    const req = mockGetRequest();
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.kycStatus).toBe('denied');
  });
});

describe('GET /api/passport/[slug] — rate limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockGetRequest();
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });
});

describe('GET /api/passport/[slug] — not found', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue(null);
  });

  it('returns 404 when no passport found for slug', async () => {
    const req = mockGetRequest();
    const res = await GET(req, { params: Promise.resolve({ slug: 'unknown-user' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/passport/[slug] — agentPublicKey derivation (PR change)', () => {
  const mockDeriveSovereignAgentKeypair = deriveSovereignAgentKeypair as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
    mockDeriveSovereignAgentKeypair.mockReturnValue({
      publicKey: '-----BEGIN PUBLIC KEY-----\nmockPublicKey\n-----END PUBLIC KEY-----',
      privateKey: '-----BEGIN PRIVATE KEY-----\nmockPrivateKey\n-----END PRIVATE KEY-----',
    });
  });

  it('includes agentPublicKey in response when user has an agent and stellarAddress', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...baseUser,
      stellarAddress: 'GABC123DEF456',
      agent: { publicId: 'agent-pub-001', name: 'AlphaAgent', status: 'ACTIVE' },
    } as any);

    const req = mockGetRequest();
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.agentPublicKey).toContain('BEGIN PUBLIC KEY');
    expect(mockDeriveSovereignAgentKeypair).toHaveBeenCalledWith('GABC123DEF456', 'agent-pub-001');
  });

  it('falls back to walletAddress when stellarAddress is null for agentPublicKey derivation', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...baseUser,
      stellarAddress: null,
      walletAddress: 'pi:alice-wallet',
      agent: { publicId: 'agent-pub-002', name: 'BetaAgent', status: 'ACTIVE' },
    } as any);

    const req = mockGetRequest();
    await GET(req, { params: Promise.resolve({ slug: 'alice' }) });

    expect(mockDeriveSovereignAgentKeypair).toHaveBeenCalledWith('pi:alice-wallet', 'agent-pub-002');
  });

  it('returns agentPublicKey as null when user has no agent', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...baseUser,
      stellarAddress: 'GABC123DEF456',
      agent: null,
    } as any);

    const req = mockGetRequest();
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.agentPublicKey).toBeNull();
    expect(mockDeriveSovereignAgentKeypair).not.toHaveBeenCalled();
  });

  it('returns agentPublicKey as null when key derivation throws (graceful fallback)', async () => {
    mockDeriveSovereignAgentKeypair.mockImplementation(() => {
      throw new Error('SOVEREIGN_KEY_SALT is not configured');
    });

    mockPrisma.user.findFirst.mockResolvedValue({
      ...baseUser,
      stellarAddress: 'GABC123DEF456',
      agent: { publicId: 'agent-pub-003', name: 'GammaAgent', status: 'ACTIVE' },
    } as any);

    const req = mockGetRequest();
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    // Should not fail the whole request — agentPublicKey silently becomes null
    expect(res.status).toBe(200);
    expect(data.agentPublicKey).toBeNull();
  });

  it('includes agentName and agentStatus alongside agentPublicKey', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...baseUser,
      stellarAddress: 'GABC123DEF456',
      agent: { publicId: 'agent-pub-004', name: 'DeltaAgent', status: 'PAUSED' },
    } as any);

    const req = mockGetRequest();
    const res = await GET(req, { params: Promise.resolve({ slug: 'alice' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.agentName).toBe('DeltaAgent');
    expect(data.agentStatus).toBe('PAUSED');
    expect(data.agentPublicKey).toBeDefined();
  });
});
