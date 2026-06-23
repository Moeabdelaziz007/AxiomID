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
jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));
jest.mock("@/lib/auth-tokens", () => ({
  verifyAccessToken: jest.fn(),
}));

jest.mock("@/lib/revocation-store", () => ({
  revokeToken: jest.fn(),
}));

import { revokeToken } from "@/lib/revocation-store";
const mockRevokeToken = revokeToken as jest.Mock;

import { NextRequest } from "next/server";
import { POST } from "@/app/api/oauth2/revoke/route";
import { requireAuth } from "@/lib/auth-middleware";
import { verifyAccessToken } from "@/lib/auth-tokens";

const mockRequireAuth = requireAuth as jest.Mock;
const mockVerifyAccessToken = verifyAccessToken as jest.Mock;

function mockPostRequest(body: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api/oauth2/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/oauth2/revoke", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ error: null, user: { did: "did:axiom:axiomid.app:pi:user1" } });
    mockVerifyAccessToken.mockResolvedValue({ sub: "did:axiom:axiomid.app:pi:user1", scopes: ["api.write"] });
    mockRevokeToken.mockResolvedValue(undefined);
  });

  it("returns 200 for valid revocation", async () => {
    const req = mockPostRequest({ token: "some-token" });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it("returns 401 for unauthenticated request", async () => {
    mockRequireAuth.mockResolvedValue({ error: { status: 401, json: async () => ({ code: "UNAUTHORIZED" }) }, user: null });
    const req = mockPostRequest({ token: "some-token" });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 400 for missing token", async () => {
    const req = mockPostRequest({});
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/oauth2/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for empty token string", async () => {
    const req = mockPostRequest({ token: "" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns success:true in response body", async () => {
    const req = mockPostRequest({ token: "token-to-revoke" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.revoked).toBe(true);
  });

  it("returns 400 validation error code for missing token", async () => {
    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for non-string token value", async () => {
    const req = mockPostRequest({ token: 12345 });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 403 when revoking another agent's token", async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: "did:axiom:axiomid.app:pi:other", scopes: [] });
    const req = mockPostRequest({ token: "some-token" });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("returns 400 when token verification fails", async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error("invalid token"));
    const req = mockPostRequest({ token: "invalid-token" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  // PR change: revokeToken is now async and wrapped in try/catch.
  // If revokeToken throws (e.g. Redis is down), the route returns 500
  // with INTERNAL_ERROR rather than letting the exception propagate.
  it("returns 500 with INTERNAL_ERROR when revokeToken throws (PR change)", async () => {
    mockRevokeToken.mockRejectedValue(new Error("Redis connection failed"));

    const req = mockPostRequest({ token: "valid-token" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });

  it("does not call revokeToken for requests that fail auth or validation", async () => {
    mockRequireAuth.mockResolvedValue({
      error: { status: 401, json: async () => ({ code: "UNAUTHORIZED" }) },
      user: null,
    });
    const req = mockPostRequest({ token: "some-token" });
    await POST(req);

    expect(mockRevokeToken).not.toHaveBeenCalled();
  });
});
