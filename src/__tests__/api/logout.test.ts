 
/**
 * @jest-environment node
 *
 * Tests for src/app/api/auth/logout/route.ts
 *
 * PR changes:
 * - Uses clearAuthCache(hashToken(accessToken)) to invalidate only the specific
 *   user's token rather than clearing the entire auth cache.
 */

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
  clearAuthCache: jest.fn(),
  hashToken: jest.fn((token: string) => `hashed:${token}`),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    authenticated: { windowMs: 60000, maxRequests: 100 },
  },
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { POST } from "@/app/api/auth/logout/route";
import { prisma } from "@/lib/prisma";
import { requireAuth, clearAuthCache, hashToken } from "@/lib/auth-middleware";
import { checkRateLimit } from "@/lib/rate-limiter";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireAuth = requireAuth as jest.Mock;
const mockClearAuthCache = clearAuthCache as jest.Mock;
const mockHashToken = hashToken as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

const mockUser = {
  id: "user-logout-1",
  walletAddress: "pi:logoutuser",
  piUid: "pi-uid-logout",
  piUsername: "logoutuser",
  xp: 0,
  tier: "Beginner",
};

function mockPostRequest(token?: string) {
  return new Request("http://localhost/api/auth/logout", {
    method: "POST",
    headers: token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" },
  }) as any;
}

describe("POST /api/auth/logout — rate limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockPrisma.user.update.mockResolvedValue({ ...mockUser } as any);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest("some-token");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("rate limit check uses client IP in key", async () => {
    const req = mockPostRequest("some-token");
    await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("auth-logout:"),
      expect.anything()
    );
  });
});

describe("POST /api/auth/logout — auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockPrisma.user.update.mockResolvedValue({ ...mockUser } as any);
  });

  it("returns auth error when user is not authenticated", async () => {
    const { apiError } = jest.requireActual("@/lib/errors") as any;
    mockRequireAuth.mockResolvedValue({ error: apiError("UNAUTHORIZED", "Unauthorized"), user: null });

    const req = mockPostRequest();
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout — success (PR change: selective cache invalidation)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockPrisma.user.update.mockResolvedValue({ ...mockUser } as any);
  });

  it("returns 200 with logout success message", async () => {
    const req = mockPostRequest("valid-access-token");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Logged out successfully");
  });

  it("clears piAccessToken from database", async () => {
    const req = mockPostRequest("valid-access-token");
    await POST(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: { piAccessToken: null },
    });
  });

  it("calls hashToken on the access token", async () => {
    const req = mockPostRequest("my-access-token");
    await POST(req);

    expect(mockHashToken).toHaveBeenCalledWith("my-access-token");
  });

  it("calls clearAuthCache with hashed token (not clearing all)", async () => {
    mockHashToken.mockReturnValue("hashed:my-access-token");

    const req = mockPostRequest("my-access-token");
    await POST(req);

    expect(mockClearAuthCache).toHaveBeenCalledWith("hashed:my-access-token");
    // Must NOT be called with no arguments (that would wipe all users' cache)
    expect(mockClearAuthCache).not.toHaveBeenCalledWith();
  });

  it("does not call clearAuthCache when no Authorization header is present", async () => {
    // No token in request headers
    const req = mockPostRequest();
    await POST(req);

    expect(mockClearAuthCache).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/logout — database error", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 500 INTERNAL_ERROR when DB update fails", async () => {
    mockPrisma.user.update.mockRejectedValue(new Error("DB connection failed"));

    const req = mockPostRequest("valid-access-token");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });

  it("does not call clearAuthCache when DB update throws", async () => {
    mockPrisma.user.update.mockRejectedValue(new Error("DB error"));

    const req = mockPostRequest("valid-access-token");
    await POST(req);

    expect(mockClearAuthCache).not.toHaveBeenCalled();
  });
});