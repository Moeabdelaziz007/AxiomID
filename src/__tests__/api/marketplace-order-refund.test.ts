/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 *
 * Tests for src/app/api/marketplace/order/refund/route.ts
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

import { POST } from "@/app/api/marketplace/order/refund/route";
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

const mockUser = {
  id: "user-refund",
  walletAddress: "pi:refunduser",
  piUid: "pi-uid-refund",
  piUsername: "refunduser",
  xp: 0,
  tier: "Beginner",
};

function mockPostRequest(body: unknown) {
  return new Request("http://localhost/api/marketplace/order/refund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as any;
}

describe("POST /api/marketplace/order/refund — rate limiting (PR change)", () => {
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
    mockPrisma.piPayment.update.mockResolvedValue({ status: "REFUNDED" } as any);

    const req = mockPostRequest({ paymentId: UUID_A });
    await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("order-refund:"),
      RATE_LIMITS.payment
    );
  });

  it("uses client IP in rate limit key", async () => {
    mockGetClientIp.mockReturnValue("172.16.0.1");
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: UUID_A, userId: mockUser.id, status: "ESCROWED",
    } as any);
    mockPrisma.piPayment.update.mockResolvedValue({ status: "REFUNDED" } as any);

    const req = mockPostRequest({ paymentId: UUID_A });
    await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "order-refund:172.16.0.1",
      expect.anything()
    );
  });

  it("rate limit check happens before auth", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({});
    await POST(req);

    expect(mockRequireAuth).not.toHaveBeenCalled();
  });
});

describe("POST /api/marketplace/order/refund — auth and validation", () => {
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
    const req = new Request("http://localhost/api/marketplace/order/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{broken",
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

describe("POST /api/marketplace/order/refund — business logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 404 when payment does not exist", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({ paymentId: "123e4567-e89b-12d3-a456-426614174000" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 403 when payment belongs to different user", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "other-user",
      status: "ESCROWED",
    } as any);

    const req = mockPostRequest({ paymentId: "123e4567-e89b-12d3-a456-426614174000" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
  });

  it("returns 409 when payment is not in ESCROWED status", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: mockUser.id,
      status: "RELEASED",
    } as any);

    const req = mockPostRequest({ paymentId: "123e4567-e89b-12d3-a456-426614174000" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe("CONFLICT");
  });

  it("returns success with REFUNDED status on valid refund", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: mockUser.id,
      status: "ESCROWED",
    } as any);
    mockPrisma.piPayment.update.mockResolvedValue({ status: "REFUNDED" } as any);

    const req = mockPostRequest({ paymentId: "123e4567-e89b-12d3-a456-426614174000" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("REFUNDED");
  });

  it("updates payment status to REFUNDED in the database", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: mockUser.id,
      status: "ESCROWED",
    } as any);
    mockPrisma.piPayment.update.mockResolvedValue({ status: "REFUNDED" } as any);

    const req = mockPostRequest({ paymentId: "123e4567-e89b-12d3-a456-426614174000" });
    await POST(req);

    expect(mockPrisma.piPayment.update).toHaveBeenCalledWith({
      where: { id: "123e4567-e89b-12d3-a456-426614174000" },
      data: { status: "REFUNDED" },
    });
  });
});