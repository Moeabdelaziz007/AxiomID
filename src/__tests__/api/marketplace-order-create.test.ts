/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 *
 * Tests for src/app/api/marketplace/order/create/route.ts
 *
 * PR change: added rate limiting via checkRateLimit(RATE_LIMITS.payment).
 */

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    skill: { findUnique: jest.fn() },
    piPayment: { create: jest.fn() },
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

import { POST } from "@/app/api/marketplace/order/create/route";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireAuth = requireAuth as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockGetClientIp = getClientIp as jest.Mock;

const mockUser = {
  id: "user-1",
  walletAddress: "pi:testuser",
  piUid: "pi-uid-1",
  piUsername: "testuser",
  xp: 0,
  tier: "Beginner",
};

function mockPostRequest(body: unknown) {
  return new Request("http://localhost/api/marketplace/order/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as any;
}

describe("POST /api/marketplace/order/create — rate limiting (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 429 with RATE_LIMITED code when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ skillId: "s1", agentId: "a1", amount: 1, paymentId: "p1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("uses RATE_LIMITS.payment config", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1", name: "Test Skill" } as any);
    mockPrisma.piPayment.create.mockResolvedValue({ id: "pay-1" } as any);

    const req = mockPostRequest({ skillId: "s1", agentId: "a1", amount: 1, paymentId: "p1" });
    await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("order-create:"),
      RATE_LIMITS.payment
    );
  });

  it("uses client IP in rate limit key", async () => {
    mockGetClientIp.mockReturnValue("10.10.10.10");
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1" } as any);
    mockPrisma.piPayment.create.mockResolvedValue({ id: "pay-1" } as any);

    const req = mockPostRequest({ skillId: "s1", agentId: "a1", amount: 1, paymentId: "p1" });
    await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "order-create:10.10.10.10",
      expect.anything()
    );
  });

  it("rate limit check happens before auth check", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({});
    await POST(req);

    // Auth should not have been called
    expect(mockRequireAuth).not.toHaveBeenCalled();
  });
});

describe("POST /api/marketplace/order/create — auth and validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 401 when authentication fails", async () => {
    const { apiError } = jest.requireActual("@/lib/errors") as any;
    mockRequireAuth.mockResolvedValue({ error: apiError("UNAUTHORIZED", "Unauthorized"), user: null });

    const req = mockPostRequest({ skillId: "s1", agentId: "a1", amount: 1, paymentId: "p1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/marketplace/order/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    }) as any;
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for missing required fields", async () => {
    const req = mockPostRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/marketplace/order/create — business logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 404 when skill does not exist", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", amount: 1, paymentId: "p1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("creates escrow payment and returns paymentId on success", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", name: "Test" } as any);
    mockPrisma.piPayment.create.mockResolvedValue({ id: "payment-abc" } as any);

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", amount: 5, paymentId: "pi-pay-1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.paymentId).toBe("payment-abc");
  });

  it("creates payment with ESCROWED status", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1" } as any);
    mockPrisma.piPayment.create.mockResolvedValue({ id: "payment-abc" } as any);

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", amount: 5, paymentId: "pi-pay-1" });
    await POST(req);

    expect(mockPrisma.piPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ESCROWED",
          userId: mockUser.id,
        }),
      })
    );
  });
});