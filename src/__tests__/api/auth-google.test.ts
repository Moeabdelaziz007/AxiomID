/**
 * @jest-environment node
 */

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { piAuth: { windowMs: 60000, maxRequests: 5 } },
}));

import { POST } from "@/app/api/auth/google/route";

function mockRequest(body: unknown) {
  return new Request("http://localhost/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const VALID_TOKEN = "jwt.token.value";

function tokeninfoResponse(overrides: Record<string, unknown> = {}) {
  return {
    sub: "google-sub-123",
    email: "pioneer@example.com",
    email_verified: true,
    name: "Pioneer One",
    picture: "https://example.com/p.png",
    aud: "test-client-id.apps.googleusercontent.com",
    ...overrides,
  };
}

describe("POST /api/auth/google", () => {
  const originalClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => tokeninfoResponse(),
    });
  });

  afterAll(() => {
    if (originalClientId === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    else process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalClientId;
  });

  it("returns the verified Google identity for a valid token", async () => {
    const res = await POST(mockRequest({ idToken: VALID_TOKEN }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      sub: "google-sub-123",
      email: "pioneer@example.com",
      emailVerified: true,
      name: "Pioneer One",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://oauth2.googleapis.com/tokeninfo?id_token="),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("rejects a missing or empty idToken", async () => {
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a token whose audience does not match our client ID", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => tokeninfoResponse({ aud: "evil-client.apps.googleusercontent.com" }),
    });
    const res = await POST(mockRequest({ idToken: VALID_TOKEN }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe("UNAUTHORIZED");
  });

  it("rejects when Google's tokeninfo endpoint fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => "invalid_token" });
    const res = await POST(mockRequest({ idToken: VALID_TOKEN }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe("UNAUTHORIZED");
  });

  it("fails closed when the client ID is not configured", async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const res = await POST(mockRequest({ idToken: VALID_TOKEN }));
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});