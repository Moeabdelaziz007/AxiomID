 
/**
 * @jest-environment node
 */

import { GET as getStamps } from "@/app/api/stamp/route";
import { POST as claimStamp } from "@/app/api/stamp/claim/route";
import { GET as verifyPassport } from "@/app/api/passport/[slug]/verify/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    stamp: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    action: {
      create: jest.fn(),
    },
    xpLedger: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    userAgent: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));

jest.mock("@/lib/actions", () => ({
  ACTIONS: {
    CONNECT_WALLET: { id: 'connect_wallet', xp: 100, weight: 15, tier: 'medium' },
    COMPLETE_KYC: { id: 'complete_kyc', xp: 200, weight: 30, tier: 'critical' },
    SECURITY_CIRCLE: { id: 'security_circle', xp: 150, weight: 10, tier: 'medium' },
  },
}));

jest.mock("@/lib/tiers", () => ({
  calculateTier: jest.fn().mockReturnValue('Visitor'),
}));

jest.mock("@/lib/sanitize", () => ({
  safeJsonStringify: jest.fn().mockReturnValue('{}'),
}));

jest.mock("@/lib/vc", () => ({
  signSocialCredential: jest.fn().mockReturnValue({ proof: { jws: 'mock-sig' } }),
}));

jest.mock("@/lib/did", () => ({
  createUserDid: jest.fn().mockReturnValue('did:axiom:user-test'),
}));

jest.mock("@/lib/trust-chain", () => ({
  calculateActionHash: jest.fn().mockReturnValue('hash-123'),
  GENESIS_HASH: 'genesis-hash',
}));

jest.mock("@/lib/trust-score", () => ({
  computeTrustScore: jest.fn().mockReturnValue(10),
}));

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn().mockResolvedValue({
    error: null,
    user: {
      id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      walletAddress: "pi:testuser",
      piUid: "pi-uid-1",
      piUsername: "testuser",
      xp: 0,
      tier: "Visitor",
    },
  }),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function mockGetRequest() {
  return new Request("http://localhost/api/stamp", {
    method: "GET",
    headers: { Authorization: "Bearer test-token" },
  });
}

function mockPostRequest(body: unknown) {
  return new Request("http://localhost/api/stamp/claim", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
    },
    body: JSON.stringify(body),
  });
}

describe("Cryptographic Stamp System APIs", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.ISSUER_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJPXm5IHbMq9+f2t/c3EbitLbv6pvIQzLWEHZaQ1jkvm
-----END PRIVATE KEY-----`;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("GET /api/stamp", () => {
    it("returns user stamps list and trust score", async () => {
      mockPrisma.stamp.findMany.mockResolvedValue([
        {
          id: "stamp-1",
          userId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          type: "connect_wallet",
          provider: "twitter",
          xpAwarded: 50,
          metadata: "{}",
          createdAt: new Date(),
        },
      ] as any);

      const res = await getStamps(mockGetRequest());
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.stamps).toHaveLength(1);
      expect(data.trustScore).toBe(3); // calculateTrustScore(0 XP, 1 stamp) = round(0*0.7 + 10*0.3)
    });
  });

  describe("POST /api/stamp/claim", () => {
    it("claims stamp, signs VC, and registers transaction", async () => {
      mockPrisma.stamp.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", xp: 0 } as any);
      mockPrisma.stamp.findMany.mockResolvedValue([
        {
          id: "stamp-1",
          type: "connect_wallet",
          xpAwarded: 100,
          createdAt: new Date(),
        },
      ] as any);

      const tx = {
        stamp: {
          create: jest.fn().mockResolvedValue({
            id: "stamp-1",
            type: "connect_wallet",
            metadata: "{}",
          }),
          findMany: jest.fn().mockResolvedValue([
            { type: "connect_wallet", xpAwarded: 100, createdAt: new Date() },
          ]),
        },
        action: {
          create: jest.fn().mockResolvedValue({}),
          findFirst: jest.fn().mockResolvedValue(null),
        },
        xpLedger: {
          create: jest.fn().mockResolvedValue({ id: "ledger-1" }),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", xp: 0 }),
          update: jest.fn().mockResolvedValue({ id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", xp: 50, tier: "Visitor" }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

      const req = mockPostRequest({
        actionType: "connect_wallet",
        metadata: { handle: "cryptojoker" },
      });

      const res = await claimStamp(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.xpEarned).toBe(100);
      expect(typeof data.computedTrustScore).toBe('number');
      expect(tx.stamp.create).toHaveBeenCalledTimes(1);
      expect(tx.action.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/passport/[slug]/verify", () => {
    it("verifies public passport by wallet slug", async () => {
      mockPrisma.userAgent.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        walletAddress: "pi:testuser",
        stellarAddress: "GSTELLAR123",
        piUsername: "testuser",
        tier: "Citizen",
        xp: 150,
        createdAt: new Date(),
        stamps: [
          {
            type: "connect_wallet",
            provider: "twitter",
            xpAwarded: 50,
            createdAt: new Date(),
          },
        ],
      } as any);

      const res = await verifyPassport(
        new Request("http://localhost/api/passport/pi:testuser/verify") as any,
        { params: Promise.resolve({ slug: "pi:testuser" }) }
      );

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.walletAddress).toBe("pi:testuser");
      expect(data.trustScore).toBe(14);
      expect(data.stamps).toHaveLength(1);
    });
  });
});
