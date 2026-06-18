 
/**
 * @jest-environment node
 *
 * Tests for src/app/api/did-document/route.ts
 *
 * PR change: added rate limiting via checkRateLimit(RATE_LIMITS.public) with
 * direct NextResponse.json 429 response (not apiError).
 */

jest.mock("@/lib/did", () => ({
  createIssuerDid: jest.fn(() => "did:axiom:issuer"),
}));

jest.mock("@/lib/did-document", () => ({
  buildDidDocument: jest.fn(() => ({
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: "did:axiom:issuer",
    verificationMethod: [],
  })),
}));

jest.mock("@/lib/did-resolver", () => ({
  resolveDid: jest.fn(),
}));

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 59, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    public: { windowMs: 60000, maxRequests: 60 },
  },
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

import { GET } from "@/app/api/did-document/route";
import { resolveDid } from "@/lib/did-resolver";
import { buildDidDocument } from "@/lib/did-document";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";

const mockResolveDid = resolveDid as jest.Mock;
const mockBuildDidDocument = buildDidDocument as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockGetClientIp = getClientIp as jest.Mock;

function mockGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/did-document");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString(), { method: "GET" }) as any;
}

describe("GET /api/did-document — rate limiting (PR change: uses RATE_LIMITS.public)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 59, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    process.env.ISSUER_PUBLIC_KEY = "test-public-key";
  });

  it("returns 429 with RATE_LIMITED error when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toBe("Too many requests. Try again later.");
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("uses RATE_LIMITS.public config (PR change: new public tier)", async () => {
    const req = mockGetRequest();
    await GET(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("did-doc:"),
      RATE_LIMITS.public
    );
  });

  it("uses client IP as part of rate limit key", async () => {
    mockGetClientIp.mockReturnValue("192.168.1.1");

    const req = mockGetRequest();
    await GET(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "did-doc:192.168.1.1",
      expect.anything()
    );
  });

  it("rate limit response uses NextResponse.json format (not apiError)", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    // did-document route now uses apiError() for consistent response shape
    // apiError returns { error: message, code: errorCode, details? }
    expect(data).toHaveProperty("error", "Too many requests. Try again later.");
    expect(data).toHaveProperty("code", "RATE_LIMITED");
    expect(data).not.toHaveProperty("message");
  });
});

describe("GET /api/did-document — DID resolution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 59, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    process.env.ISSUER_PUBLIC_KEY = "test-public-key";
  });

  it("returns 404 when DID is not found", async () => {
    mockResolveDid.mockResolvedValue(null);

    const req = mockGetRequest({ did: "did:axiom:unknown" });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("DID not found");
  });

  it("returns 400 when user found but has no DID configured", async () => {
    mockResolveDid.mockResolvedValue({ id: "user-1", did: null });

    const req = mockGetRequest({ did: "did:axiom:unknown" });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("User has no DID configured");
  });

  it("returns DID document with correct content-type header", async () => {
    mockResolveDid.mockResolvedValue({ id: "user-1", did: "did:axiom:alice" });
    mockBuildDidDocument.mockReturnValue({
      "@context": ["https://www.w3.org/ns/did/v1"],
      id: "did:axiom:alice",
    });

    const req = mockGetRequest({ did: "did:axiom:alice" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/did+ld+json");
  });

  it("returns DID document with cache-control header", async () => {
    mockResolveDid.mockResolvedValue({ id: "user-1", did: "did:axiom:alice" });
    mockBuildDidDocument.mockReturnValue({ id: "did:axiom:alice" });

    const req = mockGetRequest({ did: "did:axiom:alice" });
    const res = await GET(req);

    expect(res.headers.get("Cache-Control")).toContain("max-age=86400");
  });
});

describe("GET /api/did-document — issuer DID fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 59, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 500 when ISSUER_PUBLIC_KEY is not configured", async () => {
    delete process.env.ISSUER_PUBLIC_KEY;

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain("ISSUER_PUBLIC_KEY");
  });

  it("returns issuer DID document when no DID param provided", async () => {
    process.env.ISSUER_PUBLIC_KEY = "test-public-key";

    const req = mockGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
  });
});