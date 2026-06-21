/**
 * @jest-environment node
 *
 * Tests for src/app/api/skills/route.ts
 * Covers: GET /api/skills (listing) and POST /api/skills (publish)
 */

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    skill: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
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

import { GET, POST } from "@/app/api/skills/route";
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

function mockGetRequest(url: string) {
  return new Request(url, { method: "GET" }) as any;
}

function mockPostRequest(body: unknown) {
  return new Request("http://localhost/api/skills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as any;
}

// ─── GET /api/skills ───────────────────────────────────────────

describe("GET /api/skills — rate limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockPrisma.skill.findMany.mockResolvedValue([]);
    mockPrisma.skill.count.mockResolvedValue(0);
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockGetRequest("http://localhost/api/skills");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("uses RATE_LIMITS.anonymous config", async () => {
    const req = mockGetRequest("http://localhost/api/skills");
    await GET(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("skills-list:"),
      RATE_LIMITS.anonymous
    );
  });
});

describe("GET /api/skills — query validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockPrisma.skill.findMany.mockResolvedValue([]);
    mockPrisma.skill.count.mockResolvedValue(0);
  });

  it("applies default limit=50 and offset=0", async () => {
    const req = mockGetRequest("http://localhost/api/skills");
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, skip: 0 })
    );
  });

  it("filters by tier when provided", async () => {
    const req = mockGetRequest("http://localhost/api/skills?tier=PRO");
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tier: "PRO" }),
      })
    );
  });

  it("searches by name/description when q is provided", async () => {
    const req = mockGetRequest("http://localhost/api/skills?q=test");
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.objectContaining({ contains: "test" }) }),
          ]),
        }),
      })
    );
  });
});

describe("GET /api/skills — success responses", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns skills list with metadata", async () => {
    const skills = [
      { id: "s1", slug: "skill-1", name: "Skill One", description: "desc", tier: "BASIC_TOOL", pricePi: 0, version: "1.0.0", installCount: 5, avgRating: 4.5, ratingCount: 10, authorId: "a1", createdAt: new Date() },
    ];
    mockPrisma.skill.findMany.mockResolvedValue(skills);
    mockPrisma.skill.count.mockResolvedValue(1);

    const req = mockGetRequest("http://localhost/api/skills");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.skills).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.hasMore).toBe(false);
  });

  it("returns hasMore=true when more results exist", async () => {
    mockPrisma.skill.findMany.mockResolvedValue([{}]);
    mockPrisma.skill.count.mockResolvedValue(60);

    const req = mockGetRequest("http://localhost/api/skills?limit=50&offset=0");
    const res = await GET(req);
    const data = await res.json();

    expect(data.hasMore).toBe(true);
  });

  it("returns empty array when no skills match", async () => {
    mockPrisma.skill.findMany.mockResolvedValue([]);
    mockPrisma.skill.count.mockResolvedValue(0);

    const req = mockGetRequest("http://localhost/api/skills");
    const res = await GET(req);
    const data = await res.json();

    expect(data.skills).toEqual([]);
    expect(data.total).toBe(0);
  });

  it("returns 500 on database error", async () => {
    mockPrisma.skill.findMany.mockRejectedValue(new Error("DB down"));

    const req = mockGetRequest("http://localhost/api/skills");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

// ─── POST /api/skills ──────────────────────────────────────────

describe("POST /api/skills — rate limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ slug: "test", name: "Test", manifestMd: "# manifest" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("rate limit check happens before auth", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({});
    await POST(req);

    expect(mockRequireAuth).not.toHaveBeenCalled();
  });

  it("uses RATE_LIMITS.authenticated config", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null);
    mockPrisma.skill.create.mockResolvedValue({ id: "s1", slug: "test", name: "Test", tier: "BASIC_TOOL", version: "1.0.0", status: "PUBLISHED" } as any);

    const req = mockPostRequest({ slug: "test", name: "Test", manifestMd: "# manifest" });
    await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("skills-create:"),
      RATE_LIMITS.authenticated
    );
  });
});

describe("POST /api/skills — auth and validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 401 when authentication fails", async () => {
    const { apiError } = jest.requireActual("@/lib/errors") as any;
    mockRequireAuth.mockResolvedValue({ error: apiError("UNAUTHORIZED", "Unauthorized"), user: null });

    const req = mockPostRequest({ slug: "test", name: "Test", manifestMd: "# m" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/skills", {
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

  it("returns 400 for invalid slug format", async () => {
    const req = mockPostRequest({ slug: "INVALID SLUG!", name: "Test", manifestMd: "# m" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/skills — business logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 409 when slug already exists", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "existing", slug: "taken" } as any);

    const req = mockPostRequest({ slug: "taken", name: "Test", manifestMd: "# m" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe("CONFLICT");
  });

  it("creates skill with correct defaults", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null);
    mockPrisma.skill.create.mockResolvedValue({
      id: "s1", slug: "new-skill", name: "New Skill", tier: "BASIC_TOOL", version: "1.0.0", status: "PUBLISHED",
    } as any);

    const req = mockPostRequest({ slug: "new-skill", name: "New Skill", manifestMd: "# manifest" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(mockPrisma.skill.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tier: "BASIC_TOOL",
          pricePi: 0,
          version: "1.0.0",
          status: "PUBLISHED",
          isPublished: true,
          authorId: mockUser.id,
        }),
      })
    );
  });

  it("creates skill with custom tier and price", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null);
    mockPrisma.skill.create.mockResolvedValue({
      id: "s2", slug: "pro-skill", name: "Pro Skill", tier: "PRO", version: "2.0.0", status: "PUBLISHED",
    } as any);

    const req = mockPostRequest({
      slug: "pro-skill",
      name: "Pro Skill",
      manifestMd: "# manifest",
      tier: "PRO",
      pricePi: 10,
      version: "2.0.0",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(mockPrisma.skill.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tier: "PRO",
          pricePi: 10,
          version: "2.0.0",
        }),
      })
    );
  });

  it("returns 500 on database error", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null);
    mockPrisma.skill.create.mockRejectedValue(new Error("DB failure"));

    const req = mockPostRequest({ slug: "fail-skill", name: "Fail", manifestMd: "# m" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});
