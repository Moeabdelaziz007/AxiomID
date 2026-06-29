/**
 * @jest-environment node
 *
 * Tests for src/app/api/sandbox/dev-token/route.ts
 */

jest.mock("@/lib/sandbox-token", () => ({
  getSandboxDevToken: jest.fn(),
}));

import { GET } from "@/app/api/sandbox/dev-token/route";
import { getSandboxDevToken } from "@/lib/sandbox-token";
import { NextRequest } from "next/server";

const mockGetSandboxDevToken = getSandboxDevToken as jest.Mock;

describe("GET /api/sandbox/dev-token", () => {
  let originalNodeEnv: string | undefined;
  let originalSandboxBypass: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalNodeEnv = process.env.NODE_ENV;
    originalSandboxBypass = process.env.SANDBOX_AUTH_BYPASS;
    process.env.NODE_ENV = "development";
    process.env.SANDBOX_AUTH_BYPASS = "true";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv as any;
    process.env.SANDBOX_AUTH_BYPASS = originalSandboxBypass;
  });

  const mockRequest = (url: string): NextRequest => {
    return new NextRequest(url, { method: "GET" });
  };

  it("returns token successfully in development on localhost", async () => {
    mockGetSandboxDevToken.mockReturnValue("test-sandbox-token-abc");

    const req = mockRequest("http://localhost/api/sandbox/dev-token");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.token).toBe("test-sandbox-token-abc");
    expect(mockGetSandboxDevToken).toHaveBeenCalled();
  });

  it("returns FORBIDDEN error in production mode", async () => {
    process.env.NODE_ENV = "production";
    mockGetSandboxDevToken.mockReturnValue("test-sandbox-token-abc");

    const req = mockRequest("http://localhost/api/sandbox/dev-token");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
    expect(data.error).toContain("Endpoint is not available");
  });

  it("returns FORBIDDEN error when auth bypass is disabled", async () => {
    process.env.SANDBOX_AUTH_BYPASS = "false";
    mockGetSandboxDevToken.mockReturnValue("test-sandbox-token-abc");

    const req = mockRequest("http://localhost/api/sandbox/dev-token");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
    expect(data.error).toContain("bypass is disabled");
  });

  it("returns FORBIDDEN error for non-loopback requests", async () => {
    mockGetSandboxDevToken.mockReturnValue("test-sandbox-token-abc");

    const req = mockRequest("http://axiomid.app/api/sandbox/dev-token");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
    expect(data.error).toContain("loopback");
  });

  it("returns NOT_FOUND error when sandbox token is not configured", async () => {
    mockGetSandboxDevToken.mockReturnValue(undefined);

    const req = mockRequest("http://localhost/api/sandbox/dev-token");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
    expect(data.error).toContain("not configured");
  });
});
