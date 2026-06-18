 
/**
 * @jest-environment node
 *
 * Tests for src/app/api/passport/[slug]/route.ts
 *
 * PR changes:
 * - getKycStatus now handles null/undefined (added `!kycStatus` guard)
 * - decodeURIComponent is wrapped in try/catch to return 400 on malformed slug
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    userAgent: { findUnique: jest.fn() },
    user: { findFirst: jest.fn() },
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    authenticated: { windowMs: 60000, maxRequests: 100 },
  },
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/did", () => ({
  createUserDid: jest.fn((id: string) => `did:axiom:user-${id}`),
}));

jest.mock("@/lib/trust", () => ({
  calculateTrustScore: jest.fn(() => 42),
}));

import { GET } from "@/app/api/passport/[slug]/route";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

function mockGetRequest() {
  return new Request("http://localhost/api/passport/slug") as any;
}

async function invokeGET(slug: string) {
  const req = mockGetRequest();
  return GET(req, { params: Promise.resolve({ slug }) });
}

const baseUser = {
  id: "user-passport-1",
  did: null,
  piUsername: "passportuser",
  walletAddress: "pi:passportuser",
  stellarAddress: null,
  tier: "Citizen",
  xp: 100,
  kycStatus: "VERIFIED",
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  stamps: [],
  agent: null,
};

describe("GET /api/passport/[slug] — rate limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue(null);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const res = await invokeGET("testslug");
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });
});

describe("GET /api/passport/[slug] — validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it("returns 400 for empty slug", async () => {
    const res = await invokeGET("");
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for malformed URI slug (PR change: decodeURIComponent try/catch)", async () => {
    // The slug that would cause decodeURIComponent to throw
    // We pass a slug that starts valid but after validation will fail decoding
    // Since PassportSlugParamSchema just checks min(1), a percent-encoded broken slug passes validation
    // then fails decodeURIComponent
    const res = await invokeGET("%GG"); // Invalid percent encoding
    const data = await res.json();

    // Should return VALIDATION_ERROR for invalid encoding
    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/passport/[slug] — not found", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue(null);
  });

  it("returns 404 when no passport found", async () => {
    const res = await invokeGET("nonexistent-slug");
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/passport/[slug] — found by agent publicId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it("returns passport when found by agent publicId", async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: "agent-1",
      publicId: "agent-pub-id",
      user: { ...baseUser },
    } as any);

    const res = await invokeGET("agent-pub-id");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.username).toBe("passportuser");
  });

  it("returns correct fields in passport response", async () => {
    mockPrisma.userAgent.findUnique.mockResolvedValue({
      id: "agent-1",
      publicId: "agent-pub-id",
      user: { ...baseUser },
    } as any);

    const res = await invokeGET("agent-pub-id");
    const data = await res.json();

    expect(data).toHaveProperty("username");
    expect(data).toHaveProperty("walletAddress");
    expect(data).toHaveProperty("tier");
    expect(data).toHaveProperty("xp");
    expect(data).toHaveProperty("trustScore");
    expect(data).toHaveProperty("kyaStatus");
    expect(data).toHaveProperty("kycStatus");
    expect(data).toHaveProperty("issuedDate");
  });
});

describe("GET /api/passport/[slug] — found by user fields", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
  });

  it("returns passport when found by piUsername", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser } as any);

    const res = await invokeGET("passportuser");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.username).toBe("passportuser");
    expect(data.walletAddress).toBe("pi:passportuser");
  });

  it("decodes URL-encoded slug before querying", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser } as any);

    await invokeGET("passport%20user"); // URL-encoded space

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ piUsername: "passport user" }),
          ]),
        }),
      })
    );
  });
});

describe("GET /api/passport/[slug] — kycStatus normalization (PR change: null handling)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);
  });

  it("returns kycStatus 'verified' for kycStatus=VERIFIED", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, kycStatus: "VERIFIED" } as any);
    const res = await invokeGET("passportuser");
    const data = await res.json();
    expect(data.kycStatus).toBe("verified");
  });

  it("returns kycStatus 'pending' for kycStatus=PENDING", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, kycStatus: "PENDING" } as any);
    const res = await invokeGET("passportuser");
    const data = await res.json();
    expect(data.kycStatus).toBe("pending");
  });

  it("returns kycStatus 'pending' for kycStatus=NONE", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, kycStatus: "NONE" } as any);
    const res = await invokeGET("passportuser");
    const data = await res.json();
    expect(data.kycStatus).toBe("pending");
  });

  it("returns kycStatus 'pending' for kycStatus=null (PR change)", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, kycStatus: null } as any);
    const res = await invokeGET("passportuser");
    const data = await res.json();
    expect(data.kycStatus).toBe("pending");
  });

  it("returns kycStatus 'pending' for kycStatus=undefined (PR change)", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, kycStatus: undefined } as any);
    const res = await invokeGET("passportuser");
    const data = await res.json();
    expect(data.kycStatus).toBe("pending");
  });

  it("returns kycStatus 'denied' for unknown kycStatus values", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, kycStatus: "REJECTED" } as any);
    const res = await invokeGET("passportuser");
    const data = await res.json();
    expect(data.kycStatus).toBe("denied");
  });
});

describe("GET /api/passport/[slug] — error handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it("returns 500 when database throws", async () => {
    mockPrisma.userAgent.findUnique.mockRejectedValue(new Error("DB error"));

    const res = await invokeGET("someuser");
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});