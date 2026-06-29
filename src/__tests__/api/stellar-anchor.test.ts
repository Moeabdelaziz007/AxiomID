/**
 * @jest-environment node
 *
 * Tests for src/app/api/stellar/anchor/route.ts
 */

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    stamp: {
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn(),
  RATE_LIMITS: {
    authenticated: { windowMs: 60_000, maxRequests: 100 },
  },
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/stellar-anchoring", () => ({
  anchorVcHash: jest.fn(),
}));

import { POST } from "@/app/api/stellar/anchor/route";
import { requireAuth } from "@/lib/auth-middleware";
import { checkRateLimit } from "@/lib/rate-limiter";
import { anchorVcHash } from "@/lib/stellar-anchoring";
import { prisma } from "@/lib/prisma";

const mockRequireAuth = requireAuth as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockAnchorVcHash = anchorVcHash as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockUser = {
  id: "user-123",
  did: "did:example:user123",
  walletAddress: "GABC123",
  piUid: "pi-123",
  piUsername: "testuser",
  xp: 100,
  tier: "citizen",
};

function mockRequest(body?: unknown) {
  return new Request("http://localhost/api/stellar/anchor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as never;
}

describe("POST /api/stellar/anchor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: Date.now() + 60000,
    });
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 401 without auth", async () => {
    mockRequireAuth.mockResolvedValue({
      error: { status: 401, json: async () => ({ code: "UNAUTHORIZED" }) },
      user: null,
    });

    const req = mockRequest({ signedVc: {}, userSecretKey: "S" + "A".repeat(55) });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe("UNAUTHORIZED");
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });

    const req = mockRequest({ signedVc: {}, userSecretKey: "S" + "A".repeat(55) });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("returns 400 for validation error (missing fields)", async () => {
    const req = mockRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when secret key is too short", async () => {
    const req = mockRequest({ signedVc: {}, userSecretKey: "tooshort" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 403 when VC subject does not match authenticated user", async () => {
    const req = mockRequest({
      signedVc: {
        credentialSubject: { id: "did:example:other" },
      },
      userSecretKey: "S" + "A".repeat(55),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
  });

  it("anchors VC successfully and returns result", async () => {
    const mockResult = {
      txHash: "abc123hash",
      stellarTxId: "tx123",
      memo: "abc123hash",
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    mockAnchorVcHash.mockResolvedValue(mockResult);
    mockPrisma.stamp.updateMany.mockResolvedValue({ count: 0 } as never);

    const req = mockRequest({
      signedVc: {
        credentialSubject: { id: "did:example:user123" },
      },
      userSecretKey: "S" + "A".repeat(55),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.txHash).toBe("abc123hash");
    expect(data.stellarTxId).toBe("tx123");
    expect(mockAnchorVcHash).toHaveBeenCalledWith(
      { credentialSubject: { id: "did:example:user123" } },
      "S" + "A".repeat(55),
    );
  });

  it("returns 500 when anchorVcHash throws", async () => {
    mockAnchorVcHash.mockRejectedValue(new Error("Stellar network error"));

    const req = mockRequest({
      signedVc: {
        credentialSubject: { id: "did:example:user123" },
      },
      userSecretKey: "S" + "A".repeat(55),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});
