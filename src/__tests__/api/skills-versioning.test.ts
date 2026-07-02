/**
 * @jest-environment node
 *
 * Tests for skill versioning:
 * - GET /api/skills/[slug]/versions — list version history
 * - Auto-creation of SkillVersion on PATCH /api/skills/[slug]
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
    skillVersion: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    anonymous: { windowMs: 60000, maxRequests: 30 },
    authenticated: { windowMs: 60000, maxRequests: 20 },
  },
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { GET } from "@/app/api/skills/[slug]/versions/route";
import { PATCH } from "@/app/api/skills/[slug]/route";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireAuth = requireAuth as jest.Mock;

const VALID_MANIFEST = [
  "## الغرض — Purpose",
  "Test skill purpose",
  "",
  "## التوافق الروحي — SOUL Alignment",
  "Muraqabah",
  "",
  "## سير التشغيل — Operational Flow",
  "1. Step one",
  "2. Step two",
  "",
  "## أنماط الفشل — Failure Modes",
  "| Error | Log | Retry |",
].join('\n');

const SLUG = "test-skill";
const mockUser = { id: "user-1", walletAddress: "pi:testuser", piUid: "pi-uid-1", piUsername: "testuser", xp: 0, tier: "Beginner" };

const SKILL_FULL = {
  id: "skill-1",
  slug: SLUG,
  name: "Test Skill",
  description: "A test skill",
      manifestMd: VALID_MANIFEST,
  agentScript: null,
  testSuite: null,
  tier: "BASIC_TOOL" as const,
  pricePi: 0,
  version: "1.0.0",
  status: "PUBLISHED" as const,
  isPublished: true,
  installCount: 0,
  avgRating: 0,
  ratingCount: 0,
  authorId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { installations: 0, reviews: 0 },
};

const VERSIONS = [
  { id: "v3", skillId: "skill-1", version: "2.0.0", manifestMd: VALID_MANIFEST, agentScript: "console.log('hi')", testSuite: null, changelog: "Major rewrite", authorId: "user-1", status: "DRAFT", createdAt: new Date("2026-02-01") },
  { id: "v2", skillId: "skill-1", version: "1.1.0", manifestMd: VALID_MANIFEST, agentScript: null, testSuite: null, changelog: "Updated manifest", authorId: "user-1", status: "PUBLISHED", createdAt: new Date("2026-01-15") },
  { id: "v1", skillId: "skill-1", version: "1.0.0", manifestMd: VALID_MANIFEST, agentScript: null, testSuite: null, changelog: null, authorId: "user-1", status: "PUBLISHED", createdAt: new Date("2026-01-01") },
];

function mockVersionsRequest(method: string, body?: unknown) {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  return new Request(`http://localhost/api/skills/${SLUG}/versions`, opts) as any;
}

function mockSlugRequest(method: string, body?: unknown) {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  return new Request(`http://localhost/api/skills/${SLUG}`, opts) as any;
}

function makeVersionsParams(slug = SLUG) {
  return { params: Promise.resolve({ slug }) };
}

function makeSlugParams(slug = SLUG) {
  return { params: Promise.resolve({ slug }) };
}

// ─── GET /api/skills/[slug]/versions ────────────────────────────

describe("GET /api/skills/[slug]/versions — rate limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.skill.findUnique.mockResolvedValue(SKILL_FULL);
    mockPrisma.skillVersion.findMany.mockResolvedValue(VERSIONS);
  });

  it("returns 429 when rate limit exceeded", async () => {
    const { checkRateLimit } = jest.requireMock("@/lib/rate-limiter") as any;
    checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockVersionsRequest("GET");
    const res = await GET(req, makeVersionsParams());
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });
});

describe("GET /api/skills/[slug]/versions — validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.skill.findUnique.mockResolvedValue(SKILL_FULL);
    mockPrisma.skillVersion.findMany.mockResolvedValue(VERSIONS);
  });

  it("returns 400 for empty slug", async () => {
    const req = mockVersionsRequest("GET");
    const res = await GET(req, makeVersionsParams(""));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/skills/[slug]/versions — business logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.skill.findUnique.mockResolvedValue(SKILL_FULL);
    mockPrisma.skillVersion.findMany.mockResolvedValue(VERSIONS);
  });

  it("returns 404 when skill does not exist", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null);

    const req = mockVersionsRequest("GET");
    const res = await GET(req, makeVersionsParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns version list sorted by createdAt desc", async () => {
    const req = mockVersionsRequest("GET");
    const res = await GET(req, makeVersionsParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.versions).toHaveLength(3);
    expect(data.versions[0].version).toBe("2.0.0");
    expect(data.versions[1].version).toBe("1.1.0");
    expect(data.versions[2].version).toBe("1.0.0");
    expect(data.total).toBe(3);
  });

  it("queries versions for the correct skillId", async () => {
    const req = mockVersionsRequest("GET");
    await GET(req, makeVersionsParams());

    expect(mockPrisma.skillVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { skillId: "skill-1" },
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("returns empty list when skill has no versions", async () => {
    mockPrisma.skillVersion.findMany.mockResolvedValue([]);

    const req = mockVersionsRequest("GET");
    const res = await GET(req, makeVersionsParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.versions).toHaveLength(0);
    expect(data.total).toBe(0);
  });

  it("returns 500 on database error", async () => {
    mockPrisma.skill.findUnique.mockRejectedValue(new Error("DB failure"));

    const req = mockVersionsRequest("GET");
    const res = await GET(req, makeVersionsParams());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

// ─── Auto-version creation on PATCH /api/skills/[slug] ──────────

describe("PATCH /api/skills/[slug] — auto-version creation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockPrisma.skill.findUnique.mockResolvedValue(SKILL_FULL);
    mockPrisma.skill.update.mockResolvedValue({ ...SKILL_FULL, version: "1.1.0" });
    mockPrisma.skillVersion.findFirst.mockResolvedValue(null);
    mockPrisma.skillVersion.create.mockResolvedValue({
      id: "v-new",
      skillId: "skill-1",
      version: "1.1.0",
      manifestMd: VALID_MANIFEST,
      agentScript: null,
      testSuite: null,
      changelog: null,
      authorId: "user-1",
      status: "PUBLISHED",
      createdAt: new Date(),
    });
  });

  it("creates a SkillVersion when version field changes", async () => {
    const req = mockSlugRequest("PATCH", { version: "1.1.0" });
    const res = await PATCH(req, makeSlugParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.skillVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          skillId: "skill-1",
          version: "1.1.0",
        }),
      })
    );
  });

  it("creates a SkillVersion when manifestMd changes", async () => {
    mockPrisma.skill.update.mockResolvedValue({ ...SKILL_FULL, manifestMd: "## الغرض — Purpose\nUpdated purpose\n\n## التوافق الروحي — SOUL Alignment\nMuraqabah\n\n## سير التشغيل — Operational Flow\n1. Step\n\n## أنماط الفشل — Failure Modes\n| Error | Log |" });
    mockPrisma.skillVersion.create.mockResolvedValue({
      id: "v-new",
      skillId: "skill-1",
      version: "1.0.0",
      manifestMd: "## الغرض — Purpose\nUpdated purpose\n\n## التوافق الروحي — SOUL Alignment\nMuraqabah\n\n## سير التشغيل — Operational Flow\n1. Step\n\n## أنماط الفشل — Failure Modes\n| Error | Log |",
      agentScript: null,
      testSuite: null,
      changelog: null,
      authorId: "user-1",
      status: "PUBLISHED",
      createdAt: new Date(),
    });

    const req = mockSlugRequest("PATCH", { manifestMd: "## الغرض — Purpose\nUpdated purpose\n\n## التوافق الروحي — SOUL Alignment\nMuraqabah\n\n## سير التشغيل — Operational Flow\n1. Step\n\n## أنماط الفشل — Failure Modes\n| Error | Log |" });
    const res = await PATCH(req, makeSlugParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.skillVersion.create).toHaveBeenCalled();
  });

  it("does NOT create a SkillVersion when only name changes", async () => {
    mockPrisma.skill.update.mockResolvedValue({ ...SKILL_FULL, name: "New Name" });

    const req = mockSlugRequest("PATCH", { name: "New Name" });
    const res = await PATCH(req, makeSlugParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.skillVersion.create).not.toHaveBeenCalled();
  });

  it("does NOT create a SkillVersion when only tier changes", async () => {
    mockPrisma.skill.update.mockResolvedValue({ ...SKILL_FULL, tier: "PRO" });

    const req = mockSlugRequest("PATCH", { tier: "PRO" });
    const res = await PATCH(req, makeSlugParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.skillVersion.create).not.toHaveBeenCalled();
  });

  it("does NOT create duplicate version if same version already exists", async () => {
    mockPrisma.skillVersion.findFirst.mockResolvedValue({ id: "existing-v", version: "1.0.0" });

    const req = mockSlugRequest("PATCH", { version: "1.0.0", manifestMd: "## الغرض — Purpose\nSame purpose\n\n## التوافق الروحي — SOUL Alignment\nMuraqabah\n\n## سير التشغيل — Operational Flow\n1. Step\n\n## أنماط الفشل — Failure Modes\n| Error | Log |" });
    const res = await PATCH(req, makeSlugParams());

    expect(res.status).toBe(200);
    expect(mockPrisma.skillVersion.create).not.toHaveBeenCalled();
  });

  it("still returns success even if version creation fails", async () => {
    mockPrisma.skillVersion.create.mockRejectedValue(new Error("DB failure"));

    const req = mockSlugRequest("PATCH", { version: "2.0.0" });
    const res = await PATCH(req, makeSlugParams());
    const data = await res.json();

    // The skill update itself should still succeed
    expect(res.status).toBe(200);
    expect(data.version).toBe("1.1.0");
  });

  it("captures changelog in version when provided", async () => {
    mockPrisma.skill.update.mockResolvedValue({ ...SKILL_FULL, version: "2.0.0" });
    mockPrisma.skillVersion.create.mockResolvedValue({
      id: "v-new",
      skillId: "skill-1",
      version: "2.0.0",
  manifestMd: VALID_MANIFEST,
      agentScript: null,
      testSuite: null,
      changelog: "Breaking changes",
      authorId: "user-1",
      status: "PUBLISHED",
      createdAt: new Date(),
    });

    const req = mockSlugRequest("PATCH", { version: "2.0.0", changelog: "Breaking changes" });
    const res = await PATCH(req, makeSlugParams());

    expect(res.status).toBe(200);
    expect(mockPrisma.skillVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          changelog: "Breaking changes",
        }),
      })
    );
  });
});
