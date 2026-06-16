/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 *
 * Tests for src/app/api/marketplace/order/release/route.ts
 *
 * PR change: added rate limiting via checkRateLimit(RATE_LIMITS.payment).
 */

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    piPayment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    payment: { windowMs: 60000, maxRequests: 10 },
  },
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

import { POST } from "@/app/api/marketplace/order/release/route";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireAuth = requireAuth as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockGetClientIp = getClientIp as jest.Mock;

const UUID_A = "123e4567-e89b-12d3-a456-426614174000";
const UUID_B = "123e4567-e89b-12d3-a456-426614174001";
const UUID_C = "123e4567-e89b-12d3-a456-426614174002";

const mockUser = {
  id: "user-release",
  walletAddress: "pi:releaseuser",
  piUid: "pi-uid-release",
  piUsername: "releaseuser",
  xp: 0,
  tier: "Beginner",
};

function mockPostRequest(body: unknown) {
  return new Request("http://localhost/api/marketplace/order/release", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as any;
}

describe("POST /api/marketplace/order/release — rate limiting (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 429 with RATE_LIMITED code when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ paymentId: UUID_A });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("uses RATE_LIMITS.payment config for rate limiting", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: UUID_A,
      userId: mockUser.id,
      status: "ESCROWED",
    } as any);
    mockPrisma.piPayment.update.mockResolvedValue({ status: "RELEASED" } as any);

    const req = mockPostRequest({ paymentId: UUID_A });
    await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("order-release:"),
      RATE_LIMITS.payment
    );
  });

  it("uses client IP in rate limit key", async () => {
    mockGetClientIp.mockReturnValue("192.0.2.1");
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: UUID_A, userId: mockUser.id, status: "ESCROWED",
    } as any);
    mockPrisma.piPayment.update.mockResolvedValue({ status: "RELEASED" } as any);

    const req = mockPostRequest({ paymentId: UUID_A });
    await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "order-release:192.0.2.1",
      expect.anything()
    );
  });

  it("rate limit check happens before auth check", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({});
    await POST(req);

    expect(mockRequireAuth).not.toHaveBeenCalled();
  });
});

describe("POST /api/marketplace/order/release — auth and validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 401 when authentication fails", async () => {
    const { apiError } = jest.requireActual("@/lib/errors") as any;
    mockRequireAuth.mockResolvedValue({ error: apiError("UNAUTHORIZED", "Unauthorized"), user: null });

    const req = mockPostRequest({ paymentId: UUID_A });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/marketplace/order/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{{invalid",
    }) as any;
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for missing paymentId", async () => {
    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/marketplace/order/release — business logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 404 when payment does not exist", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({ paymentId: UUID_A });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 403 when payment belongs to a different user", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: UUID_A,
      userId: "another-user",
      status: "ESCROWED",
    } as any);

    const req = mockPostRequest({ paymentId: UUID_A });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
  });

  it("returns 409 when payment is not in ESCROWED status", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: UUID_A,
      userId: mockUser.id,
      status: "REFUNDED",
    } as any);

    const req = mockPostRequest({ paymentId: UUID_A });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe("CONFLICT");
  });

  it("returns success with RELEASED status on valid release", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: UUID_A,
      userId: mockUser.id,
      status: "ESCROWED",
    } as any);
    mockPrisma.piPayment.update.mockResolvedValue({ status: "RELEASED" } as any);

    const req = mockPostRequest({ paymentId: UUID_A });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("RELEASED");
  });

  it("updates payment status to RELEASED in the database", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: UUID_A,
      userId: mockUser.id,
      status: "ESCROWED",
    } as any);
    mockPrisma.piPayment.update.mockResolvedValue({ status: "RELEASED" } as any);

    const req = mockPostRequest({ paymentId: UUID_A });
    await POST(req);

    expect(mockPrisma.piPayment.update).toHaveBeenCalledWith({
      where: { id: UUID_A },
      data: { status: "RELEASED" },
    });
  });

  it("release differs from refund: status is RELEASED not REFUNDED", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: UUID_B,
      userId: mockUser.id,
      status: "ESCROWED",
    } as any);
    mockPrisma.piPayment.update.mockResolvedValue({ status: "RELEASED" } as any);

    const req = mockPostRequest({ paymentId: UUID_B });
    const res = await POST(req);
    const data = await res.json();

    expect(data.status).toBe("RELEASED");
    expect(data.status).not.toBe("REFUNDED");
  });
});
