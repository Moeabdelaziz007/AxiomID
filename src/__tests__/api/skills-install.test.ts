/**
 * @jest-environment node
 *
 * Tests for src/app/api/skills/[slug]/install/route.ts
 * Covers: POST /api/skills/[slug]/install, DELETE /api/skills/[slug]/install
 */

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => {
  const prismaMock: Record<string, unknown> = {
    skill: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userAgent: {
      findUnique: jest.fn(),
    },
    skillInstallation: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    piPayment: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    // Support both the array form ($transaction([...])) and the interactive
    // callback form ($transaction(async (tx) => {...})). The callback receives
    // the same mocked prisma client as the transaction client.
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === "function"
        ? (arg as (tx: unknown) => unknown)(prismaMock)
        : Promise.all(arg as unknown[])
    ),
  };
  return { prisma: prismaMock };
});

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    authenticated: { windowMs: 60000, maxRequests: 20 },
  },
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { POST, DELETE } from "@/app/api/skills/[slug]/install/route";
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

const SLUG = "test-skill";
const PUBLISHED_SKILL = {
  id: "skill-1",
  slug: SLUG,
  name: "Test Skill",
  pricePi: 0,
  version: "1.0.0",
  tier: "BASIC_TOOL",
  isPublished: true,
  status: "PUBLISHED",
  authorId: "author-1",
};

const AGENT = {
  id: "agent-1",
  userId: mockUser.id,
  name: "My Agent",
};

function makeInstallRequest(method: string, body?: unknown) {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  return new Request(`http://localhost/api/skills/${SLUG}/install`, opts) as any;
}

function makeParams(slug = SLUG) {
  return { params: Promise.resolve({ slug }) };
}

// ─── POST /api/skills/[slug]/install ───────────────────────────

describe("POST /api/skills/[slug]/install — rate limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("rate limit check happens before auth", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = makeInstallRequest("POST");
    await POST(req, makeParams());

    expect(mockRequireAuth).not.toHaveBeenCalled();
  });
});

describe("POST /api/skills/[slug]/install — auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 401 when authentication fails", async () => {
    const { apiError } = jest.requireActual("@/lib/errors") as any;
    mockRequireAuth.mockResolvedValue({ error: apiError("UNAUTHORIZED", "Unauthorized"), user: null });

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(401);
  });
});

describe("POST /api/skills/[slug]/install — business logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 404 when skill does not exist", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null);

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 403 when skill is not published", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ ...PUBLISHED_SKILL, isPublished: false });

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
  });

  it("returns 403 when skill status is DRAFT", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ ...PUBLISHED_SKILL, status: "DRAFT" });

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
  });

  it("returns 404 when user has no agent", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(PUBLISHED_SKILL);
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain("No agent found");
  });

  it("returns 409 when skill is already installed (active)", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(PUBLISHED_SKILL);
    mockPrisma.userAgent.findUnique.mockResolvedValue(AGENT);
    mockPrisma.skillInstallation.findFirst.mockResolvedValue({
      id: "inst-1",
      skillId: "skill-1",
      agentId: AGENT.id,
      status: "active",
    });

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe("CONFLICT");
  });

  it("creates new installation when none exists", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(PUBLISHED_SKILL);
    mockPrisma.userAgent.findUnique.mockResolvedValue(AGENT);
    mockPrisma.skillInstallation.findFirst.mockResolvedValue(null);
    mockPrisma.skillInstallation.create.mockResolvedValue({ id: "inst-new" } as any);

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.installed).toBe(true);
    expect(mockPrisma.skillInstallation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          skillId: "skill-1",
          agentId: AGENT.id,
          status: "active",
        }),
      })
    );
  });

  it("reactivates previously uninstalled skill", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(PUBLISHED_SKILL);
    mockPrisma.userAgent.findUnique.mockResolvedValue(AGENT);
    mockPrisma.skillInstallation.findFirst.mockResolvedValue({
      id: "inst-old",
      skillId: "skill-1",
      agentId: AGENT.id,
      status: "inactive",
    });
    mockPrisma.skillInstallation.update.mockResolvedValue({} as any);

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.installed).toBe(true);
    expect(mockPrisma.skillInstallation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inst-old" },
        data: expect.objectContaining({ status: "active" }),
      })
    );
  });

  it("increments install count after successful install", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(PUBLISHED_SKILL);
    mockPrisma.userAgent.findUnique.mockResolvedValue(AGENT);
    mockPrisma.skillInstallation.findFirst.mockResolvedValue(null);
    mockPrisma.skillInstallation.create.mockResolvedValue({ id: "inst-new" } as any);
    mockPrisma.skill.update.mockResolvedValue(PUBLISHED_SKILL);

    const req = makeInstallRequest("POST");
    await POST(req, makeParams());

    expect(mockPrisma.skill.update).toHaveBeenCalledWith({
      where: { slug: SLUG },
      data: { installCount: { increment: 1 } },
    });
  });

  it("returns 500 on database error", async () => {
    mockPrisma.skill.findUnique.mockRejectedValue(new Error("DB failure"));

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

// ─── DELETE /api/skills/[slug]/install ──────────────────────────

describe("DELETE /api/skills/[slug]/install — rate limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = makeInstallRequest("DELETE");
    const res = await DELETE(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });
});

describe("DELETE /api/skills/[slug]/install — auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 401 when authentication fails", async () => {
    const { apiError } = jest.requireActual("@/lib/errors") as any;
    mockRequireAuth.mockResolvedValue({ error: apiError("UNAUTHORIZED", "Unauthorized"), user: null });

    const req = makeInstallRequest("DELETE");
    const res = await DELETE(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/skills/[slug]/install — business logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 404 when skill does not exist", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null);

    const req = makeInstallRequest("DELETE");
    const res = await DELETE(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 404 when user has no agent", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(PUBLISHED_SKILL);
    mockPrisma.userAgent.findUnique.mockResolvedValue(null);

    const req = makeInstallRequest("DELETE");
    const res = await DELETE(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
  });

  it("returns 404 when skill is not installed", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(PUBLISHED_SKILL);
    mockPrisma.userAgent.findUnique.mockResolvedValue(AGENT);
    mockPrisma.skillInstallation.findFirst.mockResolvedValue(null);

    const req = makeInstallRequest("DELETE");
    const res = await DELETE(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain("not installed");
  });

  it("deletes installation and returns success", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(PUBLISHED_SKILL);
    mockPrisma.userAgent.findUnique.mockResolvedValue(AGENT);
    mockPrisma.skillInstallation.findFirst.mockResolvedValue({
      id: "inst-1",
      skillId: "skill-1",
      agentId: AGENT.id,
      status: "active",
    });
    mockPrisma.skillInstallation.delete.mockResolvedValue({} as any);
    mockPrisma.skill.update.mockResolvedValue(PUBLISHED_SKILL);

    const req = makeInstallRequest("DELETE");
    const res = await DELETE(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.uninstalled).toBe(true);
  });

  it("decrements install count after uninstall", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(PUBLISHED_SKILL);
    mockPrisma.userAgent.findUnique.mockResolvedValue(AGENT);
    mockPrisma.skillInstallation.findFirst.mockResolvedValue({
      id: "inst-1",
      skillId: "skill-1",
      agentId: AGENT.id,
      status: "active",
    });
    mockPrisma.skillInstallation.delete.mockResolvedValue({} as any);
    mockPrisma.skill.update.mockResolvedValue(PUBLISHED_SKILL);

    const req = makeInstallRequest("DELETE");
    await DELETE(req, makeParams());

    expect(mockPrisma.skill.update).toHaveBeenCalledWith({
      where: { slug: SLUG },
      data: { installCount: { decrement: 1 } },
    });
  });

  it("returns 500 on database error", async () => {
    mockPrisma.skill.findUnique.mockRejectedValue(new Error("DB failure"));

    const req = makeInstallRequest("DELETE");
    const res = await DELETE(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

// ─── POST /api/skills/[slug]/install — paid skill payment gate (PR change) ──

// Paid skill fixture
const PAID_SKILL = {
  ...PUBLISHED_SKILL,
  pricePi: 1.5,
};

describe("POST /api/skills/[slug]/install — paid skill: payment gate (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockPrisma.skill.findUnique.mockResolvedValue(PAID_SKILL);
    mockPrisma.userAgent.findUnique.mockResolvedValue(AGENT);
    mockPrisma.skillInstallation.findFirst.mockResolvedValue(null);
    mockPrisma.skillInstallation.create.mockResolvedValue({ id: "inst-new" } as any);
    mockPrisma.skill.update.mockResolvedValue(PAID_SKILL);
  });

  it("returns 402 PAYMENT_INVALID when no RELEASED payments exist for user", async () => {
    (mockPrisma.piPayment.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(402);
    expect(data.code).toBe("PAYMENT_INVALID");
  });

  it("returns 402 PAYMENT_INVALID when payment is for a different skill", async () => {
    (mockPrisma.piPayment.findMany as jest.Mock).mockResolvedValue([
      {
        id: "pay-1",
        userId: mockUser.id,
        status: "RELEASED",
        consumedByInstallationId: null,
        amount: 2.0,
        metadata: JSON.stringify({ skillId: "different-skill-id" }),
      },
    ]);

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(402);
    expect(data.code).toBe("PAYMENT_INVALID");
  });

  it("returns 402 PAYMENT_INVALID when payment amount is below skill price", async () => {
    (mockPrisma.piPayment.findMany as jest.Mock).mockResolvedValue([
      {
        id: "pay-1",
        userId: mockUser.id,
        status: "RELEASED",
        consumedByInstallationId: null,
        amount: 0.5, // below pricePi=1.5
        metadata: JSON.stringify({ skillId: PUBLISHED_SKILL.id }),
      },
    ]);

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(402);
    expect(data.code).toBe("PAYMENT_INVALID");
  });

  it("queries piPayment.findMany with consumedByInstallationId: null filter (PR change)", async () => {
    // Return an unconsumed payment matching the skill
    (mockPrisma.piPayment.findMany as jest.Mock).mockResolvedValue([
      {
        id: "pay-unconsumed",
        userId: mockUser.id,
        status: "RELEASED",
        consumedByInstallationId: null,
        amount: 2.0,
        metadata: JSON.stringify({ skillId: PUBLISHED_SKILL.id }),
      },
    ]);
    (mockPrisma.piPayment.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const req = makeInstallRequest("POST");
    await POST(req, makeParams());

    expect(mockPrisma.piPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: mockUser.id,
          status: "RELEASED",
          consumedByInstallationId: null,
        }),
      })
    );
  });

  it("skips consumed payments (consumedByInstallationId non-null) and finds the next valid one", async () => {
    // First payment is already consumed; second is unconsumed and valid
    (mockPrisma.piPayment.findMany as jest.Mock).mockResolvedValue([
      {
        id: "pay-consumed",
        userId: mockUser.id,
        status: "RELEASED",
        consumedByInstallationId: "old-install-id", // already consumed
        amount: 2.0,
        metadata: JSON.stringify({ skillId: PUBLISHED_SKILL.id }),
      },
      {
        id: "pay-unconsumed",
        userId: mockUser.id,
        status: "RELEASED",
        consumedByInstallationId: null, // available
        amount: 2.0,
        metadata: JSON.stringify({ skillId: PUBLISHED_SKILL.id }),
      },
    ]);
    (mockPrisma.piPayment.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    // Should succeed using the unconsumed payment
    expect(res.status).toBe(200);
    expect(data.installed).toBe(true);
  });

  it("succeeds and marks payment consumed on new install (PR change)", async () => {
    const validPaymentId = "pay-valid";
    (mockPrisma.piPayment.findMany as jest.Mock).mockResolvedValue([
      {
        id: validPaymentId,
        userId: mockUser.id,
        status: "RELEASED",
        consumedByInstallationId: null,
        amount: 2.0,
        metadata: JSON.stringify({ skillId: PUBLISHED_SKILL.id }),
      },
    ]);
    (mockPrisma.piPayment.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.installed).toBe(true);

    // The payment must be atomically claimed inside the transaction
    expect(mockPrisma.piPayment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: validPaymentId,
          consumedByInstallationId: null,
        }),
        data: expect.objectContaining({
          consumedByInstallationId: "inst-new",
        }),
      })
    );
  });

  it("marks payment consumed with new installation id on first-time install (PR change)", async () => {
    const newInstallId = "inst-brand-new";
    mockPrisma.skillInstallation.create.mockResolvedValue({ id: newInstallId } as any);

    (mockPrisma.piPayment.findMany as jest.Mock).mockResolvedValue([
      {
        id: "pay-first",
        userId: mockUser.id,
        status: "RELEASED",
        consumedByInstallationId: null,
        amount: 2.0,
        metadata: JSON.stringify({ skillId: PUBLISHED_SKILL.id }),
      },
    ]);
    (mockPrisma.piPayment.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const req = makeInstallRequest("POST");
    await POST(req, makeParams());

    expect(mockPrisma.piPayment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { consumedByInstallationId: newInstallId },
      })
    );
  });
});

describe("POST /api/skills/[slug]/install — paid skill: TOCTOU guard on new install (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockPrisma.skill.findUnique.mockResolvedValue(PAID_SKILL);
    mockPrisma.userAgent.findUnique.mockResolvedValue(AGENT);
    mockPrisma.skillInstallation.findFirst.mockResolvedValue(null);
    mockPrisma.skillInstallation.create.mockResolvedValue({ id: "inst-new" } as any);
    mockPrisma.skill.update.mockResolvedValue(PAID_SKILL);
  });

  it("returns 500 when concurrent install claims the payment first (TOCTOU: count=0)", async () => {
    (mockPrisma.piPayment.findMany as jest.Mock).mockResolvedValue([
      {
        id: "pay-race",
        userId: mockUser.id,
        status: "RELEASED",
        consumedByInstallationId: null,
        amount: 2.0,
        metadata: JSON.stringify({ skillId: PUBLISHED_SKILL.id }),
      },
    ]);
    // Simulate another request won the race — updateMany returns count=0
    (mockPrisma.piPayment.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe("CONFLICT");
  });
});

describe("POST /api/skills/[slug]/install — paid skill: TOCTOU guard on reinstall (PR change)", () => {
  const INACTIVE_INSTALL = {
    id: "inst-inactive",
    skillId: PUBLISHED_SKILL.id,
    agentId: AGENT.id,
    status: "inactive",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockPrisma.skill.findUnique.mockResolvedValue(PAID_SKILL);
    mockPrisma.userAgent.findUnique.mockResolvedValue(AGENT);
    mockPrisma.skillInstallation.findFirst.mockResolvedValue(INACTIVE_INSTALL as any);
    mockPrisma.skillInstallation.update.mockResolvedValue({} as any);
    mockPrisma.skill.update.mockResolvedValue(PAID_SKILL);
  });

  it("marks payment consumed with existing installation id on reinstall (PR change)", async () => {
    (mockPrisma.piPayment.findMany as jest.Mock).mockResolvedValue([
      {
        id: "pay-reinstall",
        userId: mockUser.id,
        status: "RELEASED",
        consumedByInstallationId: null,
        amount: 2.0,
        metadata: JSON.stringify({ skillId: PUBLISHED_SKILL.id }),
      },
    ]);
    (mockPrisma.piPayment.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.installed).toBe(true);

    // Payment must be consumed with the EXISTING (inactive) installation id
    expect(mockPrisma.piPayment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "pay-reinstall",
          consumedByInstallationId: null,
        }),
        data: expect.objectContaining({
          consumedByInstallationId: INACTIVE_INSTALL.id,
        }),
      })
    );
  });

  it("returns 500 when concurrent reinstall claims the payment first (TOCTOU)", async () => {
    (mockPrisma.piPayment.findMany as jest.Mock).mockResolvedValue([
      {
        id: "pay-race-reinstall",
        userId: mockUser.id,
        status: "RELEASED",
        consumedByInstallationId: null,
        amount: 2.0,
        metadata: JSON.stringify({ skillId: PUBLISHED_SKILL.id }),
      },
    ]);
    (mockPrisma.piPayment.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe("CONFLICT");
  });
});

describe("POST /api/skills/[slug]/install — free skill: no payment required (baseline)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    // Free skill (pricePi=0)
    mockPrisma.skill.findUnique.mockResolvedValue(PUBLISHED_SKILL);
    mockPrisma.userAgent.findUnique.mockResolvedValue(AGENT);
    mockPrisma.skillInstallation.findFirst.mockResolvedValue(null);
    mockPrisma.skillInstallation.create.mockResolvedValue({ id: "inst-free" } as any);
    mockPrisma.skill.update.mockResolvedValue(PUBLISHED_SKILL);
  });

  it("installs free skill without querying payments", async () => {
    const req = makeInstallRequest("POST");
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.installed).toBe(true);
    expect(mockPrisma.piPayment.findMany).not.toHaveBeenCalled();
  });

  it("does not call piPayment.updateMany for free skills", async () => {
    const req = makeInstallRequest("POST");
    await POST(req, makeParams());

    expect(mockPrisma.piPayment.updateMany).not.toHaveBeenCalled();
  });
});
