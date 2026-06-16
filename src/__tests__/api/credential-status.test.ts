/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 *
 * Tests for src/app/api/credential-status/route.ts
 *
 * PR change: added rate limiting via checkRateLimit(RATE_LIMITS.authenticated).
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    anonymous: { windowMs: 60000, maxRequests: 30 },
    authenticated: { windowMs: 60000, maxRequests: 100 },
  },
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

import { GET } from "@/app/api/credential-status/route";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockGetClientIp = getClientIp as jest.Mock;

function mockGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/credential-status");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString(), { method: "GET" }) as any;
}

describe("GET /api/credential-status — rate limiting (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 429 with RATE_LIMITED code when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockGetRequest({ credentialId: "did:axiom:issuer" });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("uses RATE_LIMITS.anonymous config for rate limiting", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const req = mockGetRequest({ credentialId: "did:axiom:issuer" });
    await GET(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("credential-status:"),
      RATE_LIMITS.anonymous
    );
  });

  it("uses client IP as part of the rate limit key", async () => {
    mockGetClientIp.mockReturnValue("10.0.0.1");
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const req = mockGetRequest({ credentialId: "did:axiom:issuer" });
    await GET(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "credential-status:10.0.0.1",
      expect.anything()
    );
  });

  it("does not check rate limit more than once per request", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const req = mockGetRequest({ credentialId: "did:axiom:issuer" });
    await GET(req);

    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/credential-status — issuer DID", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns VALID status for issuer DID without DB lookup", async () => {
    const req = mockGetRequest({ credentialId: "did:axiom:issuer" });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.revoked).toBe(false);
    expect(data.status).toBe("VALID");
    expect(data.subjectId).toBe("did:axiom:issuer");
  });

  it("issuer DID response has a lastUpdated timestamp", async () => {
    const req = mockGetRequest({ credentialId: "did:axiom:issuer" });
    const res = await GET(req);
    const data = await res.json();

    expect(data.lastUpdated).toBeDefined();
    expect(() => new Date(data.lastUpdated)).not.toThrow();
  });
});

describe("GET /api/credential-status — validation errors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 400 for missing credentialId and subjectId", async () => {
    const req = mockGetRequest({});
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for non-axiom DID method", async () => {
    const req = mockGetRequest({ credentialId: "did:web:example.com" });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/credential-status — user lookup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns NOT_FOUND when user does not exist", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const req = mockGetRequest({ subjectId: "did:axiom:alice" });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns VALID status for user with non-rejected KYC", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      did: "did:axiom:alice",
      kycStatus: "APPROVED",
      updatedAt: new Date("2024-01-01"),
    } as any);

    const req = mockGetRequest({ subjectId: "did:axiom:alice" });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.revoked).toBe(false);
    expect(data.status).toBe("VALID");
  });

  it("returns REVOKED status for user with REJECTED KYC", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-2",
      did: "did:axiom:bob",
      kycStatus: "REJECTED",
      updatedAt: new Date("2024-01-01"),
    } as any);

    const req = mockGetRequest({ subjectId: "did:axiom:bob" });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.revoked).toBe(true);
    expect(data.status).toBe("REVOKED");
  });

  it("returns 400 for user-prefixed DID with invalid UUID format", async () => {
    const req = mockGetRequest({ credentialId: "did:axiom:user-not-a-uuid" });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("looks up user by UUID for user-prefixed DID", async () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    mockPrisma.user.findUnique.mockResolvedValue({
      id: uuid,
      did: `did:axiom:user-${uuid}`,
      kycStatus: "PENDING",
      updatedAt: new Date(),
    } as any);

    const req = mockGetRequest({ credentialId: `did:axiom:user-${uuid}` });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: uuid } });
    expect(data.status).toBe("VALID");
  });
});