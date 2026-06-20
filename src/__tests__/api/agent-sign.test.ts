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
jest.mock("@/lib/sovereign-keys", () => ({
  signPayloadWithAgentKey: jest.fn(),
  deriveSovereignAgentKeypair: jest.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/agent/sign/route";
import { checkRateLimit } from "@/lib/rate-limiter";
import { deriveSovereignAgentKeypair, signPayloadWithAgentKey } from "@/lib/sovereign-keys";

const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockDerive = deriveSovereignAgentKeypair as jest.Mock;
const mockSign = signPayloadWithAgentKey as jest.Mock;

function mockPostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/agent/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agent/sign", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockDerive.mockReturnValue({ privateKey: "mock-private-key", publicKey: "mock-public-key" });
    mockSign.mockReturnValue("0x3a8fsignature");
  });

  it("returns signature for valid request", async () => {
    const req = mockPostRequest({ payload: "hello world", did: "did:axiom:axiomid.app:pi:abc123" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.signature).toBe("0x3a8fsignature");
    expect(data.did).toBe("did:axiom:axiomid.app:pi:abc123");
  });

  it("returns 400 for invalid DID format", async () => {
    const req = mockPostRequest({ payload: "hello", did: "invalid-did" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
