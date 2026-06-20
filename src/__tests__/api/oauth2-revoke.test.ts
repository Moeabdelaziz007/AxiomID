/**
 * @jest-environment node
 */

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/oauth2/revoke/route";

function mockPostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/oauth2/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/oauth2/revoke", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 for valid revocation", async () => {
    const req = mockPostRequest({ token: "some-token" });
    const res = await POST(req);

    expect(res.status).toBe(200);
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
    expect(data.success).toBe(true);
  });

  it("returns 400 validation error code for missing token", async () => {
    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("accepts long token strings", async () => {
    const longToken = "a".repeat(1024);
    const req = mockPostRequest({ token: longToken });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it("can revoke any arbitrary string as token", async () => {
    const req = mockPostRequest({ token: "eyJhbGciOiJIUzI1NiJ9.payload.signature" });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it("returns 400 for non-string token value", async () => {
    const req = mockPostRequest({ token: 12345 });
    const res = await POST(req);

    // Zod z.string() will reject numbers
    expect(res.status).toBe(400);
  });
});
