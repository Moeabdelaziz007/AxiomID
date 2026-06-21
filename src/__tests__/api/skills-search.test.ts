/**
 * @jest-environment node
 *
 * Tests for enhanced GET /api/skills — search, tag filtering, sorting, price range
 */

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    skill: {
      findMany: jest.fn(),
      count: jest.fn(),
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

import { GET } from "@/app/api/skills/route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function mockGetRequest(url: string) {
  return new Request(url, { method: "GET" }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.skill.findMany.mockResolvedValue([]);
  mockPrisma.skill.count.mockResolvedValue(0);
});

// ─── Tag Filtering ───────────────────────────────────────────

describe("GET /api/skills — tag filtering", () => {
  it("filters skills by single tag slug", async () => {
    const req = mockGetRequest("http://localhost/api/skills?tags=ai");
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: expect.objectContaining({
            some: expect.objectContaining({
              tag: expect.objectContaining({ slug: "ai" }),
            }),
          }),
        }),
      })
    );
  });

  it("filters skills by multiple tag slugs (AND logic)", async () => {
    const req = mockGetRequest("http://localhost/api/skills?tags=ai,web3");
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { tags: { some: { tag: { slug: "ai" } } } },
            { tags: { some: { tag: { slug: "web3" } } } },
          ]),
        }),
      })
    );
  });

  it("ignores empty tags param", async () => {
    const req = mockGetRequest("http://localhost/api/skills?tags=");
    await GET(req);

    const call = mockPrisma.skill.findMany.mock.calls[0][0];
    expect(call.where).not.toHaveProperty("AND");
    expect(call.where).not.toHaveProperty("tags");
  });
});

// ─── Sorting ─────────────────────────────────────────────────

describe("GET /api/skills — sorting", () => {
  it("sorts by newest (createdAt desc)", async () => {
    const req = mockGetRequest("http://localhost/api/skills?sort=newest");
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }],
      })
    );
  });

  it("sorts by popular (installCount desc)", async () => {
    const req = mockGetRequest("http://localhost/api/skills?sort=popular");
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ installCount: "desc" }],
      })
    );
  });

  it("sorts by rating (avgRating desc)", async () => {
    const req = mockGetRequest("http://localhost/api/skills?sort=rating");
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ avgRating: "desc" }],
      })
    );
  });

  it("sorts by price ascending (pricePi asc)", async () => {
    const req = mockGetRequest("http://localhost/api/skills?sort=price_asc");
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ pricePi: "asc" }],
      })
    );
  });

  it("sorts by price descending (pricePi desc)", async () => {
    const req = mockGetRequest("http://localhost/api/skills?sort=price_desc");
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ pricePi: "desc" }],
      })
    );
  });

  it("defaults to installCount+avgRating when sort not provided", async () => {
    const req = mockGetRequest("http://localhost/api/skills");
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { installCount: "desc" },
          { avgRating: "desc" },
        ],
      })
    );
  });

  it("rejects invalid sort values with 400", async () => {
    const req = mockGetRequest("http://localhost/api/skills?sort=invalid");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

// ─── Price Range ─────────────────────────────────────────────

describe("GET /api/skills — price range", () => {
  it("filters by minPrice", async () => {
    const req = mockGetRequest("http://localhost/api/skills?minPrice=5");
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          pricePi: expect.objectContaining({ gte: 5 }),
        }),
      })
    );
  });

  it("filters by maxPrice", async () => {
    const req = mockGetRequest("http://localhost/api/skills?maxPrice=20");
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          pricePi: expect.objectContaining({ lte: 20 }),
        }),
      })
    );
  });

  it("filters by both minPrice and maxPrice", async () => {
    const req = mockGetRequest("http://localhost/api/skills?minPrice=5&maxPrice=20");
    await GET(req);

    expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          pricePi: { gte: 5, lte: 20 },
        }),
      })
    );
  });

  it("ignores price params when not provided", async () => {
    const req = mockGetRequest("http://localhost/api/skills");
    await GET(req);

    const call = mockPrisma.skill.findMany.mock.calls[0][0];
    expect(call.where).not.toHaveProperty("pricePi");
  });

  it("rejects negative minPrice with 400", async () => {
    const req = mockGetRequest("http://localhost/api/skills?minPrice=-1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

// ─── Combined Filters ────────────────────────────────────────

describe("GET /api/skills — combined filters", () => {
  it("combines text search, tag filter, sort, and price range", async () => {
    mockPrisma.skill.findMany.mockResolvedValue([
      { id: "s1", slug: "ai-tool", name: "AI Tool", description: "desc", tier: "PRO", pricePi: 10, version: "1.0.0", installCount: 100, avgRating: 4.5, ratingCount: 20, authorId: "a1", createdAt: new Date() },
    ]);
    mockPrisma.skill.count.mockResolvedValue(1);

    const req = mockGetRequest("http://localhost/api/skills?q=ai&tags=ai,web3&sort=rating&minPrice=5&maxPrice=50");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.skills).toHaveLength(1);
    expect(data.total).toBe(1);
  });
});
