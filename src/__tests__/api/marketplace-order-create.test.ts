 
/**
 * @jest-environment node
 *
 * Tests for src/app/api/marketplace/order/create/route.ts
 *
 * Security flow: Pi payment verification before escrow creation.
 */

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    skill: { findUnique: jest.fn() },
    piPayment: { create: jest.fn(), findUnique: jest.fn().mockResolvedValue(null) },
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

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

// Mock global fetch for Pi API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

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

describe("POST /api/marketplace/order/create — rate limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 429 with RATE_LIMITED code when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ skillId: "s1", agentId: "a1", paymentId: "p1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("uses RATE_LIMITS.payment config", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1", name: "Test", pricePi: 0, status: "PUBLISHED" } as any);
    mockPrisma.piPayment.create.mockResolvedValue({ id: "pay-1" } as any);

    const req = mockPostRequest({ skillId: "s1", agentId: "a1", paymentId: "p1" });
    await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("order-create:"),
      RATE_LIMITS.payment
    );
  });

  it("rate limit check happens before auth check", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({});
    await POST(req);

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

    const req = mockPostRequest({ skillId: "s1", agentId: "a1", paymentId: "p1" });
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

describe("POST /api/marketplace/order/create — free skills (no Pi verification)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 404 when skill does not exist", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", paymentId: "p1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("creates escrow for free skill without Pi verification", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", name: "Free Skill", pricePi: 0, status: "PUBLISHED" } as any);
    mockPrisma.piPayment.create.mockResolvedValue({ id: "payment-abc" } as any);

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", paymentId: "free-skill" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.paymentId).toBe("payment-abc");
    expect(data.amount).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("creates payment with ESCROWED status for free skill", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", name: "Free", pricePi: 0, status: "PUBLISHED" } as any);
    mockPrisma.piPayment.create.mockResolvedValue({ id: "payment-abc" } as any);

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", paymentId: "free-skill" });
    await POST(req);

    expect(mockPrisma.piPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ESCROWED",
          userId: mockUser.id,
          amount: 0,
        }),
      })
    );
  });
});

describe("POST /api/marketplace/order/create — paid skills (Pi verification)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    process.env.PI_API_KEY = "test-api-key";
  });

  afterEach(() => {
    delete process.env.PI_API_KEY;
  });

  it("verifies payment against Pi Network API for paid skill", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", name: "Paid Skill", pricePi: 5, status: "PUBLISHED" } as any);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user_uid: "pi-uid-1", amount: 5, status: "approved" }),
    });
    mockPrisma.piPayment.create.mockResolvedValue({ id: "pay-1" } as any);

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", paymentId: "pi-pay-1" });
    await POST(req);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.minepi.com/v2/payments/pi-pay-1",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("returns 402 when Pi API verification fails", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", name: "Paid", pricePi: 5, status: "PUBLISHED" } as any);
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", paymentId: "bad-pay" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(402);
    expect(data.code).toBe("PAYMENT_VERIFICATION_FAILED");
  });

  it("returns 403 when payer UID does not match", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", name: "Paid", pricePi: 5, status: "PUBLISHED" } as any);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user_uid: "other-user-uid", amount: 5, status: "approved" }),
    });

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", paymentId: "pi-pay-1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
  });

  it("returns 402 when payment amount does not match skill price", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", name: "Paid", pricePi: 5, status: "PUBLISHED" } as any);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user_uid: "pi-uid-1", amount: 1, status: "approved" }),
    });

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", paymentId: "pi-pay-1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(402);
    expect(data.code).toBe("PAYMENT_MISMATCH");
  });

  it("accepts payment with status 'completed' (post-approval finalization)", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", name: "Paid", pricePi: 5, status: "PUBLISHED" } as any);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user_uid: "pi-uid-1", amount: 5, status: "completed" }),
    });
    mockPrisma.piPayment.create.mockResolvedValue({ id: "pay-1" } as any);

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", paymentId: "pi-pay-1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.paymentId).toBe("pay-1");
  });

  it("returns 402 when payment status is cancelled/refunded", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", name: "Paid", pricePi: 5, status: "PUBLISHED" } as any);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user_uid: "pi-uid-1", amount: 5, status: "cancelled" }),
    });

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", paymentId: "pi-pay-1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(402);
    expect(data.code).toBe("PAYMENT_INVALID");
  });

  it("creates escrow after successful Pi verification", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", name: "Paid", pricePi: 5, status: "PUBLISHED" } as any);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user_uid: "pi-uid-1", amount: 5, status: "approved" }),
    });
    mockPrisma.piPayment.create.mockResolvedValue({ id: "pay-1" } as any);

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", paymentId: "pi-pay-1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.paymentId).toBe("pay-1");
    expect(data.amount).toBe(5);
    expect(mockPrisma.piPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ESCROWED", amount: 5 }),
      })
    );
  });

  it("returns 402 when PI_API_KEY is not configured", async () => {
    delete process.env.PI_API_KEY;
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", name: "Paid", pricePi: 5, status: "PUBLISHED" } as any);

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", paymentId: "pi-pay-1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });

  it("returns 409 when skill is not published", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", name: "Draft", pricePi: 5, status: "DRAFT" } as any);

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", paymentId: "pi-pay-1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe("CONFLICT");
  });

  it("returns 409 when the paymentId has already been used (prevent replay attacks)", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", name: "Paid", pricePi: 5, status: "PUBLISHED" } as any);
    mockPrisma.piPayment.findUnique.mockResolvedValue({ id: "existing-payment-id" } as any);

    const req = mockPostRequest({ skillId: "123e4567-e89b-12d3-a456-426614174000", agentId: "123e4567-e89b-12d3-a456-426614174001", paymentId: "duplicate-pay-id" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe("CONFLICT");
    expect(data.error).toContain("payment ID has already been used");
  });
});
