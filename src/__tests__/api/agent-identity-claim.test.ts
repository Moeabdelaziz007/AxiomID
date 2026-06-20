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
jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn(() => "127.0.0.1"),
}));
jest.mock("@/lib/claim-ceremony", () => ({
  findClaimByUserCode: jest.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/agent/identity/claim/route";
import { findClaimByUserCode } from "@/lib/claim-ceremony";
import { checkRateLimit } from "@/lib/rate-limiter";

const mockFindClaim = findClaimByUserCode as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

function mockPostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/agent/identity/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agent/identity/claim", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it("returns claim status when user_code is valid", async () => {
    mockFindClaim.mockResolvedValue({
      token: "claim-abc",
      userCode: "AXIO-1234",
      status: "pending",
      verificationUri: "https://axiomid.app/claim",
      expiresAt: Date.now() + 600000,
      userId: null,
    });

    const req = mockPostRequest({ user_code: "AXIO-1234" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("pending");
  });

  it("returns 404 for invalid user_code", async () => {
    mockFindClaim.mockResolvedValue(null);

    const req = mockPostRequest({ user_code: "INVALID" });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it("returns 400 for missing user_code", async () => {
    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/agent/identity/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 500 on internal error", async () => {
    mockFindClaim.mockRejectedValue(new Error("Unexpected failure"));

    const req = mockPostRequest({ user_code: "AXIO-1234" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });

  it("response includes user_code in body", async () => {
    mockFindClaim.mockResolvedValue({
      token: "claim-abc",
      userCode: "AXIO-1234",
      status: "pending",
      verificationUri: "https://axiomid.app/claim",
      expiresAt: Date.now() + 600000,
      userId: null,
    });

    const req = mockPostRequest({ user_code: "AXIO-1234" });
    const res = await POST(req);
    const data = await res.json();

    expect(data.user_code).toBe("AXIO-1234");
  });

  it("response includes verification_uri", async () => {
    mockFindClaim.mockResolvedValue({
      token: "claim-abc",
      userCode: "AXIO-5678",
      status: "pending",
      verificationUri: "https://axiomid.app/claim",
      expiresAt: Date.now() + 600000,
      userId: null,
    });

    const req = mockPostRequest({ user_code: "AXIO-5678" });
    const res = await POST(req);
    const data = await res.json();

    expect(data.verification_uri).toBe("https://axiomid.app/claim");
  });

  it("response includes expires_at", async () => {
    const expiresAt = Date.now() + 600000;
    mockFindClaim.mockResolvedValue({
      token: "claim-abc",
      userCode: "AXIO-ABCD",
      status: "pending",
      verificationUri: "https://axiomid.app/claim",
      expiresAt,
      userId: null,
    });

    const req = mockPostRequest({ user_code: "AXIO-ABCD" });
    const res = await POST(req);
    const data = await res.json();

    expect(data.expires_at).toBe(expiresAt);
  });

  it("returns NOT_FOUND error code for 404", async () => {
    mockFindClaim.mockResolvedValue(null);

    const req = mockPostRequest({ user_code: "AXIO-XXXX" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 400 for empty user_code string", async () => {
    const req = mockPostRequest({ user_code: "" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});
