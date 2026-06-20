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
jest.mock("@/lib/claim-ceremony", () => ({
  findClaimByUserCode: jest.fn(),
  verifyClaimToken: jest.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/agent/identity/claim/route";
import { findClaimByUserCode, verifyClaimToken } from "@/lib/claim-ceremony";

const mockFindClaim = findClaimByUserCode as jest.Mock;
const mockVerifyClaim = verifyClaimToken as jest.Mock;

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
  });

  it("returns claim status when user_code is valid", async () => {
    mockFindClaim.mockReturnValue({
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
    mockFindClaim.mockReturnValue(null);

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
    mockFindClaim.mockImplementation(() => {
      throw new Error("Unexpected failure");
    });

    const req = mockPostRequest({ user_code: "AXIO-1234" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});
