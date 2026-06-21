/**
 * @jest-environment node
 *
 * Tests for src/app/api/skills/[slug]/install/route.ts
 * Covers: POST /api/skills/[slug]/install, DELETE /api/skills/[slug]/install
 */

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
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
  },
}));

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
