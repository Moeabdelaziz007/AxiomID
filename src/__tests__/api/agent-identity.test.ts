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
  verifyIdentityAssertion: jest.fn().mockResolvedValue({ sub: "did:axiom:some-user", scopes: ["api.read", "api.write"] }),
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
import { createIdentityAssertion } from "@/lib/auth-tokens";
import { createClaimToken } from "@/lib/claim-ceremony";

const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockCreateAssertion = createIdentityAssertion as jest.Mock;
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
    mockCreateAssertion.mockResolvedValue("mock-jwt-token");

    const req = mockPostRequest({ type: "identity_assertion", assertion: "valid-pi-jwt" });
    const res = await POST(req);
    const data = await res.json();

    expect(data.did).toBeDefined();
    expect(typeof data.did).toBe("string");
    expect(data.did).toContain("did:");
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
    mockCreateAssertion.mockRejectedValue(new Error("Token creation failed"));

    const req = mockPostRequest({ type: "identity_assertion", assertion: "valid-pi-jwt" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});
