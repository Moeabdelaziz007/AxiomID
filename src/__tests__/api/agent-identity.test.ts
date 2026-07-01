/**
 * @jest-environment node
 */

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn(),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));
jest.mock("@/lib/auth-tokens", () => ({
  createIdentityAssertion: jest.fn(),
  verifyPiTokenWithJwks: jest.fn(),
}));
jest.mock("@/lib/claim-ceremony", () => ({
  createClaimToken: jest.fn(),
}));
jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/agent/identity/route";
import { checkRateLimit } from "@/lib/rate-limiter";
import { createIdentityAssertion, verifyPiTokenWithJwks } from "@/lib/auth-tokens";
import { createClaimToken } from "@/lib/claim-ceremony";
import { logger } from "@/lib/logger";

const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockCreateAssertion = createIdentityAssertion as jest.Mock;
const mockVerifyPiToken = verifyPiTokenWithJwks as jest.Mock;
const mockCreateClaim = createClaimToken as jest.Mock;

function mockPostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/agent/identity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agent/identity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it("returns identity_assertion for valid ID-JAG", async () => {
    mockVerifyPiToken.mockResolvedValue({ sub: "user-12345" });
    mockCreateAssertion.mockResolvedValue("mock-jwt-token");

    const req = mockPostRequest({ type: "identity_assertion", assertion: "valid-pi-jwt" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.identity_assertion).toBe("mock-jwt-token");
    expect(data.scopes).toContain("api.read");
    expect(data.scopes).toContain("api.write");
  });

  it("returns claim_token for anonymous registration", async () => {
    mockCreateClaim.mockReturnValue({
      token: "claim-abc",
      userCode: "AXIO-1234",
      verificationUri: "https://axiomid.app/claim",
      expiresAt: Date.now() + 600000,
      status: "pending",
    });

    const req = mockPostRequest({ type: "anonymous" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.claim_token).toBe("claim-abc");
    expect(data.claim.user_code).toBe("AXIO-1234");
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ type: "anonymous" });
    const res = await POST(req);

    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid request body", async () => {
    const req = mockPostRequest({ type: "invalid_type" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/agent/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-valid-json",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when assertion is missing for identity_assertion type", async () => {
    const req = mockPostRequest({ type: "identity_assertion" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when assertion is empty string for identity_assertion type", async () => {
    const req = mockPostRequest({ type: "identity_assertion", assertion: "" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("identity_assertion response includes did field", async () => {
    mockVerifyPiToken.mockResolvedValue({ sub: "user-12345" });
    mockCreateAssertion.mockResolvedValue("mock-jwt-token");

    const req = mockPostRequest({ type: "identity_assertion", assertion: "valid-pi-jwt" });
    const res = await POST(req);
    const data = await res.json();

    expect(data.did).toBeDefined();
    expect(typeof data.did).toBe("string");
    expect(data.did).toBe("did:axiom:axiomid.app:pi:user-12345");
  });

  it("anonymous response includes verification_uri in claim", async () => {
    mockCreateClaim.mockReturnValue({
      token: "claim-xyz",
      userCode: "AXIO-ABCD",
      verificationUri: "https://axiomid.app/claim",
      expiresAt: Date.now() + 600000,
      status: "pending",
    });

    const req = mockPostRequest({ type: "anonymous" });
    const res = await POST(req);
    const data = await res.json();

    expect(data.claim.verification_uri).toBe("https://axiomid.app/claim");
  });

  it("anonymous response includes expires_in in claim", async () => {
    const futureExpiry = Date.now() + 600000;
    mockCreateClaim.mockReturnValue({
      token: "claim-xyz",
      userCode: "AXIO-ABCD",
      verificationUri: "https://axiomid.app/claim",
      expiresAt: futureExpiry,
      status: "pending",
    });

    const req = mockPostRequest({ type: "anonymous" });
    const res = await POST(req);
    const data = await res.json();

    expect(data.claim.expires_in).toBeGreaterThan(0);
    expect(data.claim.expires_in).toBeLessThanOrEqual(600);
  });

  it("rate limit headers are set when rate limited", async () => {
    const resetAt = Date.now() + 60000;
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt });

    const req = mockPostRequest({ type: "anonymous" });
    const res = await POST(req);

    expect(res.headers.get("x-ratelimit-remaining")).toBe("0");
  });

  it("returns 500 when createIdentityAssertion throws", async () => {
    mockVerifyPiToken.mockResolvedValue({ sub: "user-12345" });
    mockCreateAssertion.mockRejectedValue(new Error("Token creation failed"));

    const req = mockPostRequest({ type: "identity_assertion", assertion: "valid-pi-jwt" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

describe("POST /api/agent/identity - Pi JWT verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it("returns 401 when Pi JWKS verification fails in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    (verifyPiTokenWithJwks as jest.Mock).mockRejectedValue(new Error("Invalid token"));

    const req = new NextRequest("http://localhost/api/agent/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "identity_assertion", assertion: "invalid-pi-jwt" }),
    });

    const res = await POST(req);
    const data = await res.json();

    process.env.NODE_ENV = originalEnv;

    expect(res.status).toBe(401);
    expect(data.code).toBe("UNAUTHORIZED");
  });

  it("falls back to derived DID in development when Pi JWKS verification fails", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    (verifyPiTokenWithJwks as jest.Mock).mockRejectedValue(new Error("Invalid token"));
    (createIdentityAssertion as jest.Mock).mockResolvedValue("mock-jwt-token");

    const req = new NextRequest("http://localhost/api/agent/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "identity_assertion", assertion: "invalid-pi-jwt" }),
    });

    const res = await POST(req);
    const data = await res.json();

    process.env.NODE_ENV = originalEnv;

    expect(res.status).toBe(200);
    expect(data.identity_assertion).toBe("mock-jwt-token");
    expect(data.did).toContain("did:axiom:user:");
  });

  it("falls back to derived DID in the default test environment when Pi JWKS verification fails", async () => {
    // NODE_ENV is "test" while running Jest, which is a non-production
    // environment and should therefore also trigger the dev fallback path.
    expect(process.env.NODE_ENV).not.toBe("production");

    (verifyPiTokenWithJwks as jest.Mock).mockRejectedValue(new Error("Invalid token"));
    (createIdentityAssertion as jest.Mock).mockResolvedValue("mock-jwt-token");

    const req = mockPostRequest({ type: "identity_assertion", assertion: "invalid-pi-jwt" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.did).toContain("did:axiom:user:");
  });

  it("derives the same fallback DID for the same assertion (deterministic)", async () => {
    (verifyPiTokenWithJwks as jest.Mock).mockRejectedValue(new Error("Invalid token"));
    (createIdentityAssertion as jest.Mock).mockResolvedValue("mock-jwt-token");

    const req1 = mockPostRequest({ type: "identity_assertion", assertion: "same-assertion" });
    const res1 = await POST(req1);
    const data1 = await res1.json();

    const req2 = mockPostRequest({ type: "identity_assertion", assertion: "same-assertion" });
    const res2 = await POST(req2);
    const data2 = await res2.json();

    expect(data1.did).toBe(data2.did);
  });

  it("calls verifyPiTokenWithJwks with the provided assertion", async () => {
    mockVerifyPiToken.mockResolvedValue({ sub: "user-abc" });
    mockCreateAssertion.mockResolvedValue("mock-jwt-token");

    const req = mockPostRequest({ type: "identity_assertion", assertion: "the-pi-assertion" });
    await POST(req);

    expect(mockVerifyPiToken).toHaveBeenCalledWith("the-pi-assertion");
  });

  it("builds the did from the Pi token's sub claim and passes it to createIdentityAssertion", async () => {
    mockVerifyPiToken.mockResolvedValue({ sub: "pi-user-999" });
    mockCreateAssertion.mockResolvedValue("mock-jwt-token");

    const req = mockPostRequest({ type: "identity_assertion", assertion: "valid-pi-jwt" });
    const res = await POST(req);
    const data = await res.json();

    expect(data.did).toBe("did:axiom:axiomid.app:pi:pi-user-999");
    expect(mockCreateAssertion).toHaveBeenCalledWith("did:axiom:axiomid.app:pi:pi-user-999", ["api.read", "api.write"]);
  });

  it("logs an error and does not fall back when Pi JWKS verification fails in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const verificationError = new Error("signature mismatch");
    (verifyPiTokenWithJwks as jest.Mock).mockRejectedValue(verificationError);

    const req = mockPostRequest({ type: "identity_assertion", assertion: "invalid-pi-jwt" });
    const res = await POST(req);
    const data = await res.json();

    process.env.NODE_ENV = originalEnv;

    expect(res.status).toBe(401);
    expect(data.error).toBe("Invalid identity assertion");
    expect(createIdentityAssertion).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "[AGENT-IDENTITY] Pi JWKS verification failed:",
      verificationError
    );
  });

  it("logs a warning when falling back to the deterministic DID outside production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    (verifyPiTokenWithJwks as jest.Mock).mockRejectedValue(new Error("Invalid token"));
    (createIdentityAssertion as jest.Mock).mockResolvedValue("mock-jwt-token");

    const req = mockPostRequest({ type: "identity_assertion", assertion: "invalid-pi-jwt" });
    await POST(req);

    process.env.NODE_ENV = originalEnv;

    expect(logger.warn).toHaveBeenCalledWith(
      "[AGENT-IDENTITY] Pi JWKS verification failed, falling back to deterministic DID for dev"
    );
  });

  it("does not call createIdentityAssertion when verification fails in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    (verifyPiTokenWithJwks as jest.Mock).mockRejectedValue(new Error("Invalid token"));

    const req = mockPostRequest({ type: "identity_assertion", assertion: "invalid-pi-jwt" });
    await POST(req);

    process.env.NODE_ENV = originalEnv;

    expect(createIdentityAssertion).not.toHaveBeenCalled();
  });
});
