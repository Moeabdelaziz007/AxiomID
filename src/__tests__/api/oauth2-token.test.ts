/**
 * @jest-environment node
 */

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));
jest.mock("@/lib/auth-tokens", () => ({
  verifyIdentityAssertion: jest.fn(),
  createAccessToken: jest.fn(),
}));
jest.mock("@/lib/claim-ceremony", () => ({
  verifyClaimToken: jest.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/oauth2/token/route";
import { verifyIdentityAssertion, createAccessToken } from "@/lib/auth-tokens";
import { verifyClaimToken } from "@/lib/claim-ceremony";

const mockVerifyAssertion = verifyIdentityAssertion as jest.Mock;
const mockCreateToken = createAccessToken as jest.Mock;
const mockVerifyClaim = verifyClaimToken as jest.Mock;

function mockPostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/oauth2/token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateToken.mockResolvedValue("access-token-xyz");
  });

  it("exchanges jwt-bearer for access token", async () => {
    mockVerifyAssertion.mockResolvedValue({ sub: "did:axiom:axiomid.app:pi:abc", scopes: ["api.read"] });

    const req = mockPostRequest({ grant_type: "jwt-bearer", assertion: "valid-jwt" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.access_token).toBe("access-token-xyz");
    expect(data.token_type).toBe("Bearer");
    expect(data.expires_in).toBe(3600);
  });

  it("returns access token on confirmed claim", async () => {
    mockVerifyClaim.mockReturnValue({ status: "confirmed", userId: "user-1" });

    const req = mockPostRequest({ grant_type: "claim", claim_token: "claim-abc" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.access_token).toBeDefined();
  });

  it("returns pending status for unconfirmed claim", async () => {
    mockVerifyClaim.mockReturnValue({ status: "pending" });

    const req = mockPostRequest({ grant_type: "claim", claim_token: "claim-abc" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("pending");
  });

  it("returns 400 for unsupported grant type", async () => {
    const req = mockPostRequest({ grant_type: "unsupported" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when jwt-bearer is missing assertion field", async () => {
    const req = mockPostRequest({ grant_type: "jwt-bearer" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when claim grant is missing claim_token", async () => {
    const req = mockPostRequest({ grant_type: "claim" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when verifyIdentityAssertion throws (invalid jwt-bearer)", async () => {
    mockVerifyAssertion.mockRejectedValue(new Error("Token has expired"));

    const req = mockPostRequest({ grant_type: "jwt-bearer", assertion: "expired-jwt" });
    const res = await POST(req);
    const data = await res.json();

    // Throws are caught and returned as INVALID_GRANT
    expect(res.status).toBe(400);
    expect(data.code).toBe("INVALID_GRANT");
  });

  it("returns 410 for expired/null claim token", async () => {
    mockVerifyClaim.mockReturnValue(null);

    const req = mockPostRequest({ grant_type: "claim", claim_token: "expired-claim" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(410);
    expect(data.code).toBe("CLAIM_EXPIRED");
  });

  it("jwt-bearer response includes expires_in: 3600", async () => {
    mockVerifyAssertion.mockResolvedValue({ sub: "did:axiom:test", scopes: ["api.read"] });

    const req = mockPostRequest({ grant_type: "jwt-bearer", assertion: "valid-jwt" });
    const res = await POST(req);
    const data = await res.json();

    expect(data.expires_in).toBe(3600);
  });

  it("confirmed claim response includes identity_assertion and scopes", async () => {
    mockVerifyClaim.mockReturnValue({ status: "confirmed", userId: "user-2" });
    mockCreateToken.mockResolvedValue("claim-access-token");

    const req = mockPostRequest({ grant_type: "claim", claim_token: "claim-abc" });
    const res = await POST(req);
    const data = await res.json();

    expect(data.identity_assertion).toBeDefined();
    expect(data.scopes).toContain("api.read");
    expect(data.scopes).toContain("api.write");
  });

  it("passes scopes from assertion to createAccessToken", async () => {
    const scopes = ["api.read", "api.write", "agent.sign"];
    mockVerifyAssertion.mockResolvedValue({ sub: "did:axiom:test", scopes });

    const req = mockPostRequest({ grant_type: "jwt-bearer", assertion: "valid-jwt" });
    await POST(req);

    expect(mockCreateToken).toHaveBeenCalledWith("did:axiom:test", scopes);
  });
});
