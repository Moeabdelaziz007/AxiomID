/* eslint-disable @typescript-eslint/no-explicit-any */
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

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn().mockResolvedValue({
    error: null,
    user: {
      id: "user-1",
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
          userId: "user-1",
          type: "connect_twitter",
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
      expect(data.trustScore).toBe(5); // calculateTrustScore(0 XP, 1 stamp) = round(0*0.7 + 17*0.3)
    });
  });

  describe("POST /api/stamp/claim", () => {
    it("claims stamp, signs VC, and registers transaction", async () => {
      mockPrisma.stamp.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", xp: 0 } as any);

      const tx = {
        stamp: {
          create: jest.fn().mockResolvedValue({
            id: "stamp-1",
            type: "connect_twitter",
            metadata: "{}",
          }),
        },
        action: {
          create: jest.fn().mockResolvedValue({}),
        },
        xpLedger: {
          create: jest.fn().mockResolvedValue({ id: "ledger-1" }),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: "user-1", xp: 0 }),
          update: jest.fn().mockResolvedValue({ id: "user-1", xp: 50, tier: "Visitor" }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

      const req = mockPostRequest({
        actionType: "connect_twitter",
        metadata: { handle: "cryptojoker" },
      });

      const res = await claimStamp(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.xpEarned).toBe(50);
      expect(tx.stamp.create).toHaveBeenCalledTimes(1);
      expect(tx.action.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/passport/[slug]/verify", () => {
    it("verifies public passport by wallet slug", async () => {
      mockPrisma.userAgent.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        walletAddress: "pi:testuser",
        stellarAddress: "GSTELLAR123",
        piUsername: "testuser",
        tier: "Citizen",
        xp: 150,
        createdAt: new Date(),
        stamps: [
          {
            type: "connect_twitter",
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
      expect(data.trustScore).toBe(16);
      expect(data.stamps).toHaveLength(1);
    });
  });
});
