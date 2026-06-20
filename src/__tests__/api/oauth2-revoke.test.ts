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
});
