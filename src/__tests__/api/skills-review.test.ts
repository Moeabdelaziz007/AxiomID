/**
 * @jest-environment node
 *
 * Tests for src/app/api/skills/[slug]/review/route.ts
 * Covers: POST /api/skills/[slug]/review, GET /api/skills/[slug]/review
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
    skillReview: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
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

import { POST, GET } from "@/app/api/skills/[slug]/review/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireAuth = requireAuth as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockGetClientIp = getClientIp as jest.Mock;

const mockUser = {
  id: "user-review",
  walletAddress: "pi:reviewuser",
  piUid: "pi-uid-review",
  piUsername: "reviewuser",
  xp: 0,
  tier: "Beginner",
};

const SLUG = "test-skill";
const SKILL = { id: "skill-1", slug: SLUG, name: "Test Skill" };

function mockPostRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/skills/${SLUG}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function mockGetRequest(url?: string): NextRequest {
  return new NextRequest(url || `http://localhost/api/skills/${SLUG}/review`, {
    method: "GET",
  });
}

function makeParams(slug = SLUG) {
  return { params: Promise.resolve({ slug }) };
}

// ─── POST /api/skills/[slug]/review ────────────────────────────

describe("POST /api/skills/[slug]/review — rate limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ rating: 5 });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("auth check happens before rate limit check", async () => {
    const { apiError } = jest.requireActual<typeof import("@/lib/errors")>("@/lib/errors");
    mockRequireAuth.mockResolvedValue({ error: apiError("UNAUTHORIZED", "Unauthorized"), user: null });

    const req = mockPostRequest({ rating: 5 });
    await POST(req, makeParams());

    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });
});

describe("POST /api/skills/[slug]/review — auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 401 when authentication fails", async () => {
    const { apiError } = jest.requireActual<typeof import("@/lib/errors")>("@/lib/errors");
    mockRequireAuth.mockResolvedValue({ error: apiError("UNAUTHORIZED", "Unauthorized"), user: null });

    const req = mockPostRequest({ rating: 5 });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(401);
  });
});

describe("POST /api/skills/[slug]/review — validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest(`http://localhost/api/skills/${SLUG}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for missing rating", async () => {
    const req = mockPostRequest({});
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for rating below 1", async () => {
    const req = mockPostRequest({ rating: 0 });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for rating above 5", async () => {
    const req = mockPostRequest({ rating: 6 });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid slug param", async () => {
    const req = mockPostRequest({ rating: 5 });
    const res = await POST(req, makeParams(""));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/skills/[slug]/review — business logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 404 when skill does not exist", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null);

    const req = mockPostRequest({ rating: 5 });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("creates review with correct data", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(SKILL);
    mockPrisma.skillReview.create.mockResolvedValue({
      id: "rev-1",
      skillId: SKILL.id,
      userId: mockUser.id,
      rating: 5,
      review: "Great skill!",
      createdAt: new Date(),
    } as Awaited<ReturnType<typeof mockPrisma.skillReview.create>>);
    mockPrisma.skillReview.aggregate.mockResolvedValue({ _avg: { rating: 5 }, _count: { rating: 1 } });
    mockPrisma.skill.update.mockResolvedValue({} as Awaited<ReturnType<typeof mockPrisma.skill.update>>);

    const req = mockPostRequest({ rating: 5, review: "Great skill!" });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(mockPrisma.skillReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          skillId: SKILL.id,
          userId: mockUser.id,
          rating: 5,
          review: "Great skill!",
        }),
      })
    );
  });

  it("creates review with null review text when omitted", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(SKILL);
    mockPrisma.skillReview.create.mockResolvedValue({ id: "rev-2", rating: 3 } as Awaited<ReturnType<typeof mockPrisma.skillReview.create>>);
    mockPrisma.skillReview.aggregate.mockResolvedValue({ _avg: { rating: 3 }, _count: { rating: 1 } });
    mockPrisma.skill.update.mockResolvedValue({} as Awaited<ReturnType<typeof mockPrisma.skill.update>>);

    const req = mockPostRequest({ rating: 3 });
    const res = await POST(req, makeParams());

    expect(res.status).toBe(201);
    expect(mockPrisma.skillReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ review: null }),
      })
    );
  });

  it("updates skill avgRating and ratingCount after review", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(SKILL);
    mockPrisma.skillReview.create.mockResolvedValue({ id: "rev-3", rating: 4 } as Awaited<ReturnType<typeof mockPrisma.skillReview.create>>);
    mockPrisma.skillReview.aggregate.mockResolvedValue({ _avg: { rating: 4.0 }, _count: { rating: 5 } });
    mockPrisma.skill.update.mockResolvedValue({} as Awaited<ReturnType<typeof mockPrisma.skill.update>>);

    const req = mockPostRequest({ rating: 4 });
    await POST(req, makeParams());

    expect(mockPrisma.skillReview.aggregate).toHaveBeenCalledWith({
      where: { skillId: SKILL.id },
      _avg: { rating: true },
      _count: { rating: true },
    });
    expect(mockPrisma.skill.update).toHaveBeenCalledWith({
      where: { id: SKILL.id },
      data: { avgRating: 4.0, ratingCount: 5 },
    });
  });

  it("returns 500 on database error", async () => {
    mockPrisma.skill.findUnique.mockRejectedValue(new Error("DB failure"));

    const req = mockPostRequest({ rating: 5 });
    const res = await POST(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

// ─── GET /api/skills/[slug]/review ─────────────────────────────

describe("GET /api/skills/[slug]/review — rate limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockPrisma.skill.findUnique.mockResolvedValue(SKILL);
    mockPrisma.skillReview.findMany.mockResolvedValue([]);
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockGetRequest();
    const res = await GET(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("uses RATE_LIMITS.public config", async () => {
    const req = mockGetRequest();
    await GET(req, makeParams());

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("review-get:"),
      RATE_LIMITS.public
    );
  });
});

describe("GET /api/skills/[slug]/review — validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 400 for empty slug", async () => {
    const req = mockGetRequest();
    const res = await GET(req, makeParams(""));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/skills/[slug]/review — business logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 404 when skill does not exist", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null);

    const req = mockGetRequest();
    const res = await GET(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns reviews list for skill", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(SKILL);
    const reviews = [
      { id: "r1", skillId: SKILL.id, userId: "u1", rating: 5, review: "Great!", createdAt: new Date() },
      { id: "r2", skillId: SKILL.id, userId: "u2", rating: 3, review: null, createdAt: new Date() },
    ];
    mockPrisma.skillReview.findMany.mockResolvedValue(reviews);

    const req = mockGetRequest();
    const res = await GET(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
  });

  it("returns empty array when no reviews exist", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(SKILL);
    mockPrisma.skillReview.findMany.mockResolvedValue([]);

    const req = mockGetRequest();
    const res = await GET(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("orders reviews by createdAt descending", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(SKILL);
    mockPrisma.skillReview.findMany.mockResolvedValue([]);

    const req = mockGetRequest();
    await GET(req, makeParams());

    expect(mockPrisma.skillReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } })
    );
  });

  it("returns 500 on database error", async () => {
    mockPrisma.skill.findUnique.mockRejectedValue(new Error("DB failure"));

    const req = mockGetRequest();
    const res = await GET(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});
