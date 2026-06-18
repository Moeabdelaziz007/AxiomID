 
/**
 * @jest-environment node
 */

import { signSocialCredential } from "@/lib/vc";
import { POST } from "@/app/api/stamp/claim/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    action: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    stamp: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    xpLedger: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
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
      id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      walletAddress: "pi:testuser",
      piUid: "pi-uid-1",
      piUsername: "testuser",
      xp: 0,
      tier: "Visitor",
    },
  }),
}));

const mockPrisma = prisma as any;

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/stamp/claim", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-pi-token",
    },
    body: JSON.stringify(body),
  });
}

function makeTx(overrides: {
  action?: any;
  stamp?: any;
  ledger?: any;
  user?: any;
  userUpdate?: any;
} = {}) {
  return {
    action: {
      create: jest.fn().mockResolvedValue(
        overrides.action ?? {
          id: "action-1",
          type: "connect_twitter",
          userId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          xp: 50,
          metadata: "{}",
          timestamp: new Date(),
        }
      ),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    stamp: {
      create: jest.fn().mockResolvedValue(
        overrides.stamp ?? {
          id: "stamp-1",
          type: "connect_twitter",
          userId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          xpAwarded: 50,
          metadata: "{}",
          timestamp: new Date(),
        }
      ),
    },
    xpLedger: {
      create: jest.fn().mockResolvedValue(overrides.ledger ?? { id: "ledger-1" }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(overrides.user !== undefined ? overrides.user : { id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", xp: 0 }),
      update: jest.fn().mockResolvedValue(overrides.userUpdate ?? { id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", xp: 50, tier: "Visitor" }),
    },
  };
}

describe("W3C Verifiable Credentials for Social Claims", () => {
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

  describe("signSocialCredential utility", () => {
    it("generates a valid W3C credential and proof signature with Ed25519 key", () => {
      const vc = signSocialCredential("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "did:axiom:user-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "twitter", "cryptojoker", "pi:testuser");

      expect(vc["@context"]).toContain("https://www.w3.org/2018/credentials/v1");
      expect(vc.type).toContain("SocialIdentityCredential");
      expect(vc.credentialSubject.id).toBe("did:axiom:user-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d");
      expect(vc.credentialSubject.platform).toBe("twitter");
      expect(vc.credentialSubject.handle).toBe("cryptojoker");
      expect(vc.credentialSubject.walletAddress).toBe("pi:testuser");
      expect(vc.proof).toBeDefined();
      expect(vc.proof.type).toBe("Ed25519Signature2020");
      expect(vc.proof.proofValue).toBeDefined();
      expect(typeof vc.proof.proofValue).toBe("string");
    });

    it("throws error when ISSUER_PRIVATE_KEY is missing", () => {
      delete process.env.ISSUER_PRIVATE_KEY;
      expect(() =>
        signSocialCredential("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "did:axiom:user-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "twitter", "cryptojoker", "pi:testuser")
      ).toThrow("ISSUER_PRIVATE_KEY not set");
    });
  });

  describe("POST /api/stamp/claim route integration", () => {
    it("saves signed VC inside Action metadata when claiming connect_twitter", async () => {
      mockPrisma.stamp.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", xp: 0 } as any);

      const tx = makeTx();
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

      const req = mockRequest({
        actionType: "connect_twitter",
        metadata: { handle: "cryptojoker" },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.xpEarned).toBe(50);

      // Verify that tx.stamp.create was called with stringified VC as metadata
      expect(tx.stamp.create).toHaveBeenCalledTimes(1);
      const callArgs = tx.stamp.create.mock.calls[0][0];
      expect(callArgs.data.type).toBe("connect_twitter");
      
      const parsedMetadata = JSON.parse(callArgs.data.metadata);
      expect(parsedMetadata.type).toContain("SocialIdentityCredential");
      expect(parsedMetadata.credentialSubject.handle).toBe("cryptojoker");
      expect(parsedMetadata.proof.proofValue).toBeDefined();
    });

    it("saves signed VC inside Action metadata when claiming connect_discord", async () => {
      mockPrisma.stamp.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", xp: 0 } as any);

      const tx = makeTx();
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

      const req = mockRequest({
        actionType: "connect_discord",
        metadata: { username: "discord_user#1234" },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(tx.stamp.create).toHaveBeenCalledTimes(1);
      const callArgs = tx.stamp.create.mock.calls[0][0];
      const parsedMetadata = JSON.parse(callArgs.data.metadata);
      expect(parsedMetadata.credentialSubject.platform).toBe("discord");
      expect(parsedMetadata.credentialSubject.handle).toBe("discord_user#1234");
    });
  });
});
