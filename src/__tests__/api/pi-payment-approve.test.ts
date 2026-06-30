/**
 * @jest-environment node
 *
 * Tests for src/app/api/pi/payment/approve/route.ts
 *
 * PR change: The upsert now uses fields from paymentData (the verified GET
 * response) rather than approveData (the POST approve response), so that
 * amount/memo/metadata are always populated correctly even when Pi's approve
 * payload omits them.
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    piPayment: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest
    .fn()
    .mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    payment: { windowMs: 60000, maxRequests: 5 },
  },
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/sanitize", () => ({
  safeJsonStringify: jest.fn((v: unknown) =>
    v === undefined || v === null ? null : JSON.stringify(v)
  ),
}));

import { POST } from "@/app/api/pi/payment/approve/route";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { checkRateLimit } from "@/lib/rate-limiter";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireAuth = requireAuth as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

const AUTH_USER = {
  id: "user-1",
  piUid: "pi-uid-123",
  piUsername: "testuser",
  walletAddress: "pi:pi-uid-123",
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/pi/payment/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

// Helper: build a mock fetch that returns different values for successive calls.
// First call = GET payment details, second call = POST approve.
function mockFetchSequence(getResponse: object, approveResponse: object) {
  let callCount = 0;
  return jest.fn().mockImplementation(async () => {
    callCount++;
    if (callCount === 1) {
      return { ok: true, json: async () => getResponse };
    }
    return { ok: true, json: async () => approveResponse };
  });
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

describe("POST /api/pi/payment/approve — rate limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ error: null, user: AUTH_USER });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });

    const req = makeRequest({ paymentId: "pay-1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("checks rate limit before auth", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });

    const req = makeRequest({ paymentId: "pay-1" });
    await POST(req);

    expect(mockRequireAuth).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe("POST /api/pi/payment/approve — authentication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 60000,
    });
  });

  it("returns 401 when auth fails", async () => {
    const { apiError } = jest.requireActual("@/lib/errors") as any;
    mockRequireAuth.mockResolvedValue({
      error: apiError("UNAUTHORIZED", "Unauthorized"),
      user: null,
    });

    const req = makeRequest({ paymentId: "pay-1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("POST /api/pi/payment/approve — input validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 60000,
    });
    mockRequireAuth.mockResolvedValue({ error: null, user: AUTH_USER });
  });

  it("returns 400 when paymentId is missing", async () => {
    const req = makeRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request("http://localhost/api/pi/payment/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// PI_API_KEY not configured
// ---------------------------------------------------------------------------

describe("POST /api/pi/payment/approve — missing PI_API_KEY", () => {
  let prevKey: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    prevKey = process.env.PI_API_KEY;
    delete process.env.PI_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 60000,
    });
    mockRequireAuth.mockResolvedValue({ error: null, user: AUTH_USER });
    mockPrisma.piPayment.findUnique.mockResolvedValue(null);
  });

  afterEach(() => {
    if (prevKey === undefined) {
      delete process.env.PI_API_KEY;
    } else {
      process.env.PI_API_KEY = prevKey;
    }
  });

  it("returns 500 INTERNAL_ERROR when PI_API_KEY is not configured", async () => {
    const req = makeRequest({ paymentId: "pay-1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
    expect(data.error).toMatch(/not configured/i);
  });
});

// ---------------------------------------------------------------------------
// Existing payment idempotency
// ---------------------------------------------------------------------------

describe("POST /api/pi/payment/approve — existing payment early return", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PI_API_KEY = "test-pi-api-key";
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 60000,
    });
    mockRequireAuth.mockResolvedValue({ error: null, user: AUTH_USER });
    global.fetch = jest.fn();
  });

  it("returns { status: 'approved' } when payment is already ESCROWED", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: "db-1",
      paymentId: "pay-escrowed",
      userId: AUTH_USER.id,
      status: "ESCROWED",
      amount: 1.5,
    } as any);

    const req = makeRequest({ paymentId: "pay-escrowed" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("approved");
    expect(data.paymentId).toBe("pay-escrowed");
    // No Pi API call should be made when payment is already in final state
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns { status: 'completed' } when payment is already RELEASED", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: "db-1",
      paymentId: "pay-released",
      userId: AUTH_USER.id,
      status: "RELEASED",
      amount: 2.0,
    } as any);

    const req = makeRequest({ paymentId: "pay-released" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("completed");
    expect(data.paymentId).toBe("pay-released");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 403 when existing payment belongs to a different user", async () => {
    mockPrisma.piPayment.findUnique.mockResolvedValue({
      id: "db-1",
      paymentId: "pay-other",
      userId: "other-user-id",
      status: "ESCROWED",
    } as any);

    const req = makeRequest({ paymentId: "pay-other" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// Pi API GET + IDOR prevention
// ---------------------------------------------------------------------------

describe("POST /api/pi/payment/approve — IDOR prevention and Pi API verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PI_API_KEY = "test-pi-api-key";
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 60000,
    });
    mockRequireAuth.mockResolvedValue({ error: null, user: AUTH_USER });
    mockPrisma.piPayment.findUnique.mockResolvedValue(null);
  });

  it("returns 403 when payer UID in Pi API response does not match authenticated user", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        identifier: "pay-1",
        user_uid: "different-pi-uid", // does NOT match AUTH_USER.piUid
        amount: 1.0,
        memo: "Test",
        metadata: {},
      }),
    });

    const req = makeRequest({ paymentId: "pay-1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
    expect(data.error).toMatch(/payer UID does not match/i);
  });

  it("returns 402 PI_PAYMENT_FAILED when Pi GET fails", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    const req = makeRequest({ paymentId: "pay-fail" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(402);
    expect(data.code).toBe("PI_PAYMENT_FAILED");
  });

  it("returns 402 PI_PAYMENT_FAILED when Pi approve POST fails", async () => {
    global.fetch = jest
      .fn()
      // GET succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          identifier: "pay-1",
          user_uid: "pi-uid-123",
          amount: 1.0,
          memo: "Test",
          metadata: {},
        }),
      })
      // POST approve fails
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "bad request" }),
      });

    const req = makeRequest({ paymentId: "pay-1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(402);
    expect(data.code).toBe("PI_PAYMENT_FAILED");
  });

  it("returns 403 when authenticated user has no piUid", async () => {
    mockRequireAuth.mockResolvedValue({
      error: null,
      user: { ...AUTH_USER, piUid: null },
    });

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        identifier: "pay-1",
        user_uid: "pi-uid-123",
        amount: 1.0,
        metadata: {},
      }),
    });

    const req = makeRequest({ paymentId: "pay-1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// PR change: paymentData (not approveData) used for upsert fields
// ---------------------------------------------------------------------------

describe("POST /api/pi/payment/approve — uses paymentData (GET) for upsert (PR change)", () => {
  const PI_PAYMENT_ID = "pay-xyz-123";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PI_API_KEY = "test-pi-api-key";
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 60000,
    });
    mockRequireAuth.mockResolvedValue({ error: null, user: AUTH_USER });
    mockPrisma.piPayment.findUnique.mockResolvedValue(null);
    mockPrisma.piPayment.upsert.mockResolvedValue({} as any);
  });

  it("stores amount from paymentData (GET response), not approveData", async () => {
    // GET returns amount=3.14; approve response omits amount (would default to 0)
    global.fetch = mockFetchSequence(
      {
        identifier: PI_PAYMENT_ID,
        user_uid: "pi-uid-123",
        amount: 3.14,
        memo: "Skill purchase",
        metadata: { skillId: "skill-abc" },
      },
      // Approve response intentionally omits amount/memo/metadata
      {}
    );

    const req = makeRequest({ paymentId: PI_PAYMENT_ID });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("approved");

    // The upsert must use 3.14 (from paymentData), not 0 (from empty approveData)
    expect(mockPrisma.piPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ amount: 3.14 }),
        create: expect.objectContaining({ amount: 3.14 }),
      })
    );
  });

  it("stores memo from paymentData (GET response)", async () => {
    global.fetch = mockFetchSequence(
      {
        identifier: PI_PAYMENT_ID,
        user_uid: "pi-uid-123",
        amount: 1.0,
        memo: "From verified GET response",
        metadata: null,
      },
      { memo: "This memo from approve should be ignored" }
    );

    const req = makeRequest({ paymentId: PI_PAYMENT_ID });
    await POST(req);

    expect(mockPrisma.piPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ memo: "From verified GET response" }),
        create: expect.objectContaining({ memo: "From verified GET response" }),
      })
    );
  });

  it("stores metadata from paymentData (GET response), not approveData", async () => {
    const verifiedMetadata = { skillId: "skill-id-from-get", tier: "BASIC" };

    global.fetch = mockFetchSequence(
      {
        identifier: PI_PAYMENT_ID,
        user_uid: "pi-uid-123",
        amount: 1.0,
        metadata: verifiedMetadata,
      },
      // approveData has different (wrong) metadata — should be ignored
      { metadata: { skillId: "wrong-skill-id" } }
    );

    const req = makeRequest({ paymentId: PI_PAYMENT_ID });
    await POST(req);

    expect(mockPrisma.piPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          metadata: JSON.stringify(verifiedMetadata),
        }),
        create: expect.objectContaining({
          metadata: JSON.stringify(verifiedMetadata),
        }),
      })
    );
  });

  it("sets status to ESCROWED on upsert", async () => {
    global.fetch = mockFetchSequence(
      {
        identifier: PI_PAYMENT_ID,
        user_uid: "pi-uid-123",
        amount: 1.0,
        metadata: {},
      },
      {}
    );

    const req = makeRequest({ paymentId: PI_PAYMENT_ID });
    await POST(req);

    expect(mockPrisma.piPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "ESCROWED" }),
        create: expect.objectContaining({ status: "ESCROWED" }),
      })
    );
  });

  it("stores the correct paymentId and userId in the create branch", async () => {
    global.fetch = mockFetchSequence(
      {
        identifier: PI_PAYMENT_ID,
        user_uid: "pi-uid-123",
        amount: 2.5,
        metadata: {},
      },
      {}
    );

    const req = makeRequest({ paymentId: PI_PAYMENT_ID });
    await POST(req);

    expect(mockPrisma.piPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { paymentId: PI_PAYMENT_ID },
        create: expect.objectContaining({
          paymentId: PI_PAYMENT_ID,
          userId: AUTH_USER.id,
          network: "pi",
        }),
      })
    );
  });

  it("handles null amount gracefully by storing 0", async () => {
    global.fetch = mockFetchSequence(
      {
        identifier: PI_PAYMENT_ID,
        user_uid: "pi-uid-123",
        amount: null,
        metadata: {},
      },
      {}
    );

    const req = makeRequest({ paymentId: PI_PAYMENT_ID });
    await POST(req);

    expect(mockPrisma.piPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ amount: 0 }),
        create: expect.objectContaining({ amount: 0 }),
      })
    );
  });

  it("handles null memo gracefully by storing null", async () => {
    global.fetch = mockFetchSequence(
      {
        identifier: PI_PAYMENT_ID,
        user_uid: "pi-uid-123",
        amount: 1.0,
        memo: null,
        metadata: {},
      },
      {}
    );

    const req = makeRequest({ paymentId: PI_PAYMENT_ID });
    await POST(req);

    expect(mockPrisma.piPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ memo: null }),
        create: expect.objectContaining({ memo: null }),
      })
    );
  });

  it("returns 200 with { status: 'approved', paymentId } on success", async () => {
    global.fetch = mockFetchSequence(
      {
        identifier: PI_PAYMENT_ID,
        user_uid: "pi-uid-123",
        amount: 1.0,
        metadata: {},
      },
      {}
    );

    const req = makeRequest({ paymentId: PI_PAYMENT_ID });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("approved");
    expect(data.paymentId).toBe(PI_PAYMENT_ID);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("POST /api/pi/payment/approve — database/fetch error handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PI_API_KEY = "test-pi-api-key";
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 60000,
    });
    mockRequireAuth.mockResolvedValue({ error: null, user: AUTH_USER });
    mockPrisma.piPayment.findUnique.mockResolvedValue(null);
  });

  it("returns 500 INTERNAL_ERROR when database upsert throws", async () => {
    global.fetch = mockFetchSequence(
      {
        identifier: "pay-db-err",
        user_uid: "pi-uid-123",
        amount: 1.0,
        metadata: {},
      },
      {}
    );

    mockPrisma.piPayment.upsert.mockRejectedValue(new Error("DB failure"));

    const req = makeRequest({ paymentId: "pay-db-err" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });

  it("returns 500 INTERNAL_ERROR when fetch throws a network error", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const req = makeRequest({ paymentId: "pay-net-err" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});