/**
 * @jest-environment node
 *
 * Tests for src/app/api/leaderboard/route.ts (new in this PR)
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 29, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { anonymous: { windowMs: 60000, maxRequests: 30 } },
}));

jest.mock('@/lib/ip', () => ({
  getClientIp: jest.fn(() => '192.168.1.1'),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock('@/lib/did', () => ({
  createUserDid: jest.fn((id: string) => `did:axiom:generated:${id}`),
}));

jest.mock('@/lib/trust', () => ({
  calculateTrustScore: jest.fn((xp: number, stamps: number) => Math.round(xp * 0.7 + stamps * 10)),
}));

import { GET } from '@/app/api/leaderboard/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';
import { calculateTrustScore } from '@/lib/trust';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockCalculateTrustScore = calculateTrustScore as jest.Mock;

function mockGetRequest() {
  return new Request('http://localhost/api/leaderboard', { method: 'GET' }) as any;
}

const mockUsers = [
  {
    id: 'user-1',
    piUsername: 'sovereign1',
    walletAddress: 'pi:sovereign1',
    tier: 'Sovereign',
    xp: 1500,
    createdAt: new Date('2023-01-01'),
    did: 'did:axiom:sovereign1',
    stamps: [{ id: 's1' }, { id: 's2' }, { id: 's3' }],
  },
  {
    id: 'user-2',
    piUsername: 'validator1',
    walletAddress: 'pi:validator1',
    tier: 'Validator',
    xp: 800,
    createdAt: new Date('2023-06-01'),
    did: null, // no DID — should fall back to createUserDid
    stamps: [{ id: 's4' }],
  },
  {
    id: 'user-3',
    piUsername: 'citizen1',
    walletAddress: 'pi:citizen1',
    tier: 'Citizen',
    xp: 100,
    createdAt: new Date('2024-01-01'),
    did: 'did:axiom:citizen1',
    stamps: [],
  },
];

describe('GET /api/leaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 29, resetAt: Date.now() + 60000 });
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
    mockCalculateTrustScore.mockImplementation((xp: number, stamps: number) => Math.round(xp * 0.7 + stamps * 10));
  });

  it('returns 200 with a leaderboard array', async () => {
    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('leaderboard');
    expect(Array.isArray(data.leaderboard)).toBe(true);
  });

  it('returns the correct number of leaderboard entries', async () => {
    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(data.leaderboard).toHaveLength(3);
  });

  it('assigns rank starting from 1 in order', async () => {
    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(data.leaderboard[0].rank).toBe(1);
    expect(data.leaderboard[1].rank).toBe(2);
    expect(data.leaderboard[2].rank).toBe(3);
  });

  it('each leaderboard entry has the required fields', async () => {
    const res = await GET(mockGetRequest());
    const data = await res.json();
    const entry = data.leaderboard[0];

    expect(entry).toHaveProperty('rank');
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('piUsername');
    expect(entry).toHaveProperty('walletAddress');
    expect(entry).toHaveProperty('tier');
    expect(entry).toHaveProperty('xp');
    expect(entry).toHaveProperty('trustScore');
    expect(entry).toHaveProperty('stampsCount');
    expect(entry).toHaveProperty('createdAt');
  });

  it('uses existing DID when present', async () => {
    const res = await GET(mockGetRequest());
    const data = await res.json();

    const entry = data.leaderboard[0];
    expect(entry.id).toBe('did:axiom:sovereign1');
  });

  it('generates DID from id when user.did is null', async () => {
    const res = await GET(mockGetRequest());
    const data = await res.json();

    // user-2 has did: null, so createUserDid should be called
    const entry = data.leaderboard[1];
    expect(entry.id).toBe('did:axiom:generated:user-2');
  });

  it('counts stamps correctly in stampsCount field', async () => {
    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(data.leaderboard[0].stampsCount).toBe(3);
    expect(data.leaderboard[1].stampsCount).toBe(1);
    expect(data.leaderboard[2].stampsCount).toBe(0);
  });

  it('calls calculateTrustScore with xp and stampsCount', async () => {
    await GET(mockGetRequest());

    expect(mockCalculateTrustScore).toHaveBeenCalledWith(1500, 3);
    expect(mockCalculateTrustScore).toHaveBeenCalledWith(800, 1);
    expect(mockCalculateTrustScore).toHaveBeenCalledWith(100, 0);
  });

  it('returns 200 with empty leaderboard when no users found', async () => {
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.leaderboard).toHaveLength(0);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });

  it('uses leaderboard:<ip> as the rate limit key', async () => {
    await GET(mockGetRequest());

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      'leaderboard:192.168.1.1',
      expect.anything()
    );
  });

  it('returns 500 INTERNAL_ERROR on database failure', async () => {
    (mockPrisma.user.findMany as jest.Mock).mockRejectedValue(new Error('Connection refused'));

    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(data.error).toContain('Failed to retrieve protocol leaderboard data');
  });

  it('does not expose raw stamp id arrays — only the count', async () => {
    const res = await GET(mockGetRequest());
    const data = await res.json();

    const entry = data.leaderboard[0];
    // The raw stamps array should NOT be in the response
    expect(entry).not.toHaveProperty('stamps');
    expect(typeof entry.stampsCount).toBe('number');
  });

  it('returns xp values correctly from database', async () => {
    const res = await GET(mockGetRequest());
    const data = await res.json();

    expect(data.leaderboard[0].xp).toBe(1500);
    expect(data.leaderboard[1].xp).toBe(800);
    expect(data.leaderboard[2].xp).toBe(100);
  });
});