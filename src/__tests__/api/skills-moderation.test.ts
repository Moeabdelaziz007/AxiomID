/**
 * @jest-environment node
 *
 * Tests for src/app/api/admin/skills/route.ts and src/app/api/admin/skills/[id]/route.ts
 * Covers: GET /api/admin/skills, POST /api/admin/skills/[id]
 */

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    skillModeration: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    skill: {
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    authenticated: { windowMs: 60000, maxRequests: 20 },
    public: { windowMs: 60000, maxRequests: 30 },
  },
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/admin", () => ({
  isAdmin: jest.fn(),
}));

import { GET } from "@/app/api/admin/skills/route";
import { POST } from "@/app/api/admin/skills/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { isAdmin } from "@/lib/admin";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireAuth = requireAuth as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockGetClientIp = getClientIp as jest.Mock;
const mockIsAdmin = isAdmin as jest.Mock;

const mockAdminUser = {
  id: "admin-user",
  walletAddress: "pi:admin123",
  piUid: "pi-uid-admin",
  piUsername: "admin",
  xp: 1000,
  tier: "Admin",
};

const mockNonAdminUser = {
  id: "regular-user",
  walletAddress: "pi:user456",
  piUid: "pi-uid-user",
  piUsername: "user",
  xp: 100,
  tier: "Beginner",
};

const MOCK_MODERATION = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  skillId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  status: "PENDING",
  reviewerId: null,
  reason: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  skill: {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    slug: "test-skill",
    name: "Test Skill",
    description: "A test skill",
    authorId: "author-1",
  },
};

function mockGetRequest(url?: string) {
  return new NextRequest(url || "http://localhost/api/admin/skills", {
    method: "GET",
  }) as any;
}

function mockPostRequest(body: unknown, id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890") {
  return new NextRequest(`http://localhost/api/admin/skills/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as any;
}

function makeParams(id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890") {
  return { params: Promise.resolve({ id }) };
}

// ─── GET /api/admin/skills ────────────────────────────────────

describe("GET /api/admin/skills — rate limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockAdminUser });
    mockIsAdmin.mockReturnValue(true);
    mockPrisma.skillModeration.findMany.mockResolvedValue([]);
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("auth check happens before rate limit check", async () => {
    const { apiError } = jest.requireActual("@/lib/errors") as any;
    mockRequireAuth.mockResolvedValue({ error: apiError("UNAUTHORIZED", "Unauthorized"), user: null });

    const req = mockGetRequest();
    await GET(req);

    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/skills — auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 401 when authentication fails", async () => {
    const { apiError } = jest.requireActual("@/lib/errors") as any;
    mockRequireAuth.mockResolvedValue({ error: apiError("UNAUTHORIZED", "Unauthorized"), user: null });

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/skills — admin check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 403 when user is not admin", async () => {
    mockRequireAuth.mockResolvedValue({ error: null, user: mockNonAdminUser });
    mockIsAdmin.mockReturnValue(false);

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
  });

  it("allows admin user", async () => {
    mockRequireAuth.mockResolvedValue({ error: null, user: mockAdminUser });
    mockIsAdmin.mockReturnValue(true);
    mockPrisma.skillModeration.findMany.mockResolvedValue([]);

    const req = mockGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
  });
});

describe("GET /api/admin/skills — business logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockAdminUser });
    mockIsAdmin.mockReturnValue(true);
  });

  it("returns pending moderation entries", async () => {
    mockPrisma.skillModeration.findMany.mockResolvedValue([MOCK_MODERATION]);

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.moderations).toHaveLength(1);
    expect(data.moderations[0].id).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  });

  it("returns empty array when no pending entries", async () => {
    mockPrisma.skillModeration.findMany.mockResolvedValue([]);

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.moderations).toEqual([]);
  });

  it("filters by PENDING status", async () => {
    mockPrisma.skillModeration.findMany.mockResolvedValue([]);

    const req = mockGetRequest();
    await GET(req);

    expect(mockPrisma.skillModeration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PENDING" }),
      })
    );
  });

  it("includes skill relation", async () => {
    mockPrisma.skillModeration.findMany.mockResolvedValue([MOCK_MODERATION]);

    const req = mockGetRequest();
    await GET(req);

    expect(mockPrisma.skillModeration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ skill: true }),
      })
    );
  });

  it("returns 500 on database error", async () => {
    mockPrisma.skillModeration.findMany.mockRejectedValue(new Error("DB failure"));

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

// ─── POST /api/admin/skills/[id] ─────────────────────────────

describe("POST /api/admin/skills/[id] — rate limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockAdminUser });
    mockIsAdmin.mockReturnValue(true);
    mockPrisma.skillModeration.findUnique.mockResolvedValue(MOCK_MODERATION);
    mockPrisma.skillModeration.update.mockResolvedValue(MOCK_MODERATION);
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ action: "approve" });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("auth check happens before rate limit check", async () => {
    const { apiError } = jest.requireActual("@/lib/errors") as any;
    mockRequireAuth.mockResolvedValue({ error: apiError("UNAUTHORIZED", "Unauthorized"), user: null });

    const req = mockPostRequest({ action: "approve" });
    await POST(req, makeParams());

    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/skills/[id] — auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 401 when authentication fails", async () => {
    const { apiError } = jest.requireActual("@/lib/errors") as any;
    mockRequireAuth.mockResolvedValue({ error: apiError("UNAUTHORIZED", "Unauthorized"), user: null });

    const req = mockPostRequest({ action: "approve" });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/skills/[id] — admin check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 403 when user is not admin", async () => {
    mockRequireAuth.mockResolvedValue({ error: null, user: mockNonAdminUser });
    mockIsAdmin.mockReturnValue(false);

    const req = mockPostRequest({ action: "approve" });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
  });

  it("allows admin user", async () => {
    mockRequireAuth.mockResolvedValue({ error: null, user: mockAdminUser });
    mockIsAdmin.mockReturnValue(true);
    mockPrisma.skillModeration.findUnique.mockResolvedValue(MOCK_MODERATION);
    mockPrisma.skillModeration.update.mockResolvedValue(MOCK_MODERATION);

    const req = mockPostRequest({ action: "approve" });
    const res = await POST(req, makeParams());

    expect(res.status).toBe(200);
  });
});

describe("POST /api/admin/skills/[id] — validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockAdminUser });
    mockIsAdmin.mockReturnValue(true);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/admin/skills/mod-1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    }) as any;
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for missing action", async () => {
    const req = mockPostRequest({});
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid action", async () => {
    const req = mockPostRequest({ action: "invalid" });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for empty id param", async () => {
    const req = mockPostRequest({ action: "approve" }, "");
    const res = await POST(req, makeParams(""));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/admin/skills/[id] — business logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockAdminUser });
    mockIsAdmin.mockReturnValue(true);
  });

  it("returns 404 when moderation entry does not exist", async () => {
    mockPrisma.skillModeration.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({ action: "approve" });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("approves a skill moderation entry", async () => {
    mockPrisma.skillModeration.findUnique.mockResolvedValue(MOCK_MODERATION);
    mockPrisma.skillModeration.update.mockResolvedValue({
      ...MOCK_MODERATION,
      status: "APPROVED",
      reviewerId: mockAdminUser.id,
    });
    mockPrisma.skill.update.mockResolvedValue({} as any);

    const req = mockPostRequest({ action: "approve" });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.moderation.status).toBe("APPROVED");
    expect(data.moderation.reviewerId).toBe(mockAdminUser.id);
  });

  it("rejects a skill moderation entry with reason", async () => {
    mockPrisma.skillModeration.findUnique.mockResolvedValue(MOCK_MODERATION);
    mockPrisma.skillModeration.update.mockResolvedValue({
      ...MOCK_MODERATION,
      status: "REJECTED",
      reviewerId: mockAdminUser.id,
      reason: "Does not meet quality standards",
      notes: "Please improve documentation",
    });
    mockPrisma.skill.update.mockResolvedValue({} as any);

    const req = mockPostRequest({
      action: "reject",
      reason: "Does not meet quality standards",
      notes: "Please improve documentation",
    });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.moderation.status).toBe("REJECTED");
    expect(data.moderation.reason).toBe("Does not meet quality standards");
    expect(data.moderation.notes).toBe("Please improve documentation");
  });

  it("updates skill status to PUBLISHED on approve", async () => {
    mockPrisma.skillModeration.findUnique.mockResolvedValue(MOCK_MODERATION);
    mockPrisma.skillModeration.update.mockResolvedValue({
      ...MOCK_MODERATION,
      status: "APPROVED",
    });
    mockPrisma.skill.update.mockResolvedValue({} as any);

    const req = mockPostRequest({ action: "approve" });
    await POST(req, makeParams());

    expect(mockPrisma.skill.update).toHaveBeenCalledWith({
      where: { id: MOCK_MODERATION.skillId },
      data: { status: "PUBLISHED", isPublished: true },
    });
  });

  it("updates skill status to DRAFT on reject", async () => {
    mockPrisma.skillModeration.findUnique.mockResolvedValue(MOCK_MODERATION);
    mockPrisma.skillModeration.update.mockResolvedValue({
      ...MOCK_MODERATION,
      status: "REJECTED",
    });
    mockPrisma.skill.update.mockResolvedValue({} as any);

    const req = mockPostRequest({ action: "reject", reason: "Bad skill" });
    await POST(req, makeParams());

    expect(mockPrisma.skill.update).toHaveBeenCalledWith({
      where: { id: MOCK_MODERATION.skillId },
      data: { status: "DRAFT", isPublished: false },
    });
  });

  it("returns 500 on database error", async () => {
    mockPrisma.skillModeration.findUnique.mockRejectedValue(new Error("DB failure"));

    const req = mockPostRequest({ action: "approve" });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});