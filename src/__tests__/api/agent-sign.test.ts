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
  ROOT_AGENT_ID: "axiom-root",
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

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ payload: "hello", did: "did:axiom:axiomid.app:pi:abc123" });
    const res = await POST(req);

    expect(res.status).toBe(429);
  });

  it("returns 400 for missing payload", async () => {
    const req = mockPostRequest({ did: "did:axiom:axiomid.app:pi:abc123" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for empty payload", async () => {
    const req = mockPostRequest({ payload: "", did: "did:axiom:axiomid.app:pi:abc123" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing DID", async () => {
    const req = mockPostRequest({ payload: "hello" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/agent/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns keyVersion in response", async () => {
    const req = mockPostRequest({ payload: "hello world", did: "did:axiom:axiomid.app:pi:abc123" });
    const res = await POST(req);
    const data = await res.json();

    expect(data.keyVersion).toBe(1);
  });

  it("calls deriveSovereignAgentKeypair with the uid from DID", async () => {
    const req = mockPostRequest({ payload: "test", did: "did:axiom:axiomid.app:pi:myuid" });
    await POST(req);

    expect(mockDerive).toHaveBeenCalledWith("myuid", "axiom-root");
  });

  it("calls signPayloadWithAgentKey with the payload and private key", async () => {
    const req = mockPostRequest({ payload: "test-payload", did: "did:axiom:axiomid.app:pi:abc123" });
    await POST(req);

    expect(mockSign).toHaveBeenCalledWith("test-payload", "mock-private-key");
  });

  it("returns 500 when signPayloadWithAgentKey throws", async () => {
    mockSign.mockImplementation(() => {
      throw new Error("Signing failed");
    });

    const req = mockPostRequest({ payload: "hello", did: "did:axiom:axiomid.app:pi:abc123" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });

  it("accepts DID with 'did:axiom:' prefix as valid", async () => {
    const req = mockPostRequest({ payload: "hello", did: "did:axiom:test" });
    const res = await POST(req);

    // Should pass DID validation (starts with did:axiom:)
    expect(res.status).toBe(200);
  });
});
