 
/**
 * @jest-environment node
 *
 * Tests for src/app/api/sync/route.ts
 *
 * PR changes:
 * - SyncRequestSchema (Zod) replaces raw interface for request body validation
 * - GET now requires authentication (requireAuth added)
 */

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    harvestResult: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    agentPresence: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    authenticated: { windowMs: 60000, maxRequests: 100 },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/math-physics", () => ({
  exponentialBackoff: jest.fn(() => 0),
  shannonEntropy: jest.fn(() => 3.5),
  dataFreshness: jest.fn(() => 0.95),
}));

import { POST, GET } from "@/app/api/sync/route";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { checkRateLimit } from "@/lib/rate-limiter";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireAuth = requireAuth as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

const mockUser = {
  id: "mock-user-id",
  walletAddress: "pi:mockuser",
  piUid: "mock-pi-uid",
  piUsername: "mockuser",
  xp: 0,
  tier: "Beginner",
};

function mockPostRequest(body: unknown) {
  return new Request("http://localhost/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer mock-token" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as any;
}

function mockGetRequest() {
  return new Request("http://localhost/api/sync", {
    method: "GET",
    headers: { Authorization: "Bearer mock-token" },
  }) as any;
}

describe("POST /api/sync — authentication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it("returns 401 when user is not authenticated", async () => {
    const { apiError } = jest.requireActual("@/lib/errors") as any;
    mockRequireAuth.mockResolvedValue({ error: apiError("UNAUTHORIZED", "Unauthorized"), user: null });

    const req = mockPostRequest({ source: "all" });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("proceeds when authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockPrisma.harvestResult.findMany.mockResolvedValue([]);
    mockPrisma.agentPresence.findMany.mockResolvedValue([]);

    const req = mockPostRequest({ source: "all" });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});

describe("POST /api/sync — rate limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ source: "all" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });
});

describe("POST /api/sync — SyncRequestSchema validation (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockPrisma.harvestResult.findMany.mockResolvedValue([]);
    mockPrisma.agentPresence.findMany.mockResolvedValue([]);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer mock-token" },
      body: "not-json{",
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("accepts valid source=d1", async () => {
    const req = mockPostRequest({ source: "d1" });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it("accepts valid source=all", async () => {
    const req = mockPostRequest({ source: "all" });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it("rejects invalid source value", async () => {
    const req = mockPostRequest({ source: "invalid-source" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("uses default source=all when not provided", async () => {
    const req = mockPostRequest({});
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it("rejects maxRetries > 10", async () => {
    const req = mockPostRequest({ source: "all", maxRetries: 11 });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("rejects maxRetries < 0", async () => {
    const req = mockPostRequest({ source: "all", maxRetries: -1 });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("accepts maxRetries=0", async () => {
    const req = mockPostRequest({ source: "all", maxRetries: 0 });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it("accepts maxRetries=10", async () => {
    const req = mockPostRequest({ source: "all", maxRetries: 10 });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it("rejects non-boolean dryRun", async () => {
    const req = mockPostRequest({ source: "all", dryRun: "yes" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns dry-run message when dryRun=true", async () => {
    const req = mockPostRequest({ source: "all", dryRun: true });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Dry run completed");
  });

  it("returns sync completed message when dryRun=false", async () => {
    const req = mockPostRequest({ source: "all", dryRun: false });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Sync completed");
  });

  it("response includes results and timestamp", async () => {
    const req = mockPostRequest({ source: "all" });
    const res = await POST(req);
    const data = await res.json();

    expect(data).toHaveProperty("results");
    expect(data).toHaveProperty("timestamp");
  });
});

describe("GET /api/sync — authentication (PR change: auth now required)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.harvestResult.findFirst.mockResolvedValue(null);
    mockPrisma.harvestResult.findMany.mockResolvedValue([]);
    mockPrisma.agentPresence.findFirst.mockResolvedValue(null);
  });

  it("returns 401 when user is not authenticated", async () => {
    const { apiError } = jest.requireActual("@/lib/errors") as any;
    mockRequireAuth.mockResolvedValue({ error: apiError("UNAUTHORIZED", "Unauthorized"), user: null });

    const req = mockGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("returns sync status when authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
  });

  it("returns lastSync and metrics in response", async () => {
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(data).toHaveProperty("lastSync");
    expect(data).toHaveProperty("metrics");
    expect(data.lastSync).toHaveProperty("harvestResults");
    expect(data.lastSync).toHaveProperty("agentPresence");
    expect(data.metrics).toHaveProperty("queryEntropy");
    expect(data.metrics).toHaveProperty("totalQueries");
  });

  it("returns lastSync timestamps when data exists", async () => {
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    const harvestDate = new Date("2025-06-01T00:00:00.000Z");
    const presenceDate = new Date("2025-06-01T01:00:00.000Z");

    mockPrisma.harvestResult.findFirst.mockResolvedValue({
      createdAt: harvestDate,
      query: "test query",
    } as any);
    mockPrisma.agentPresence.findFirst.mockResolvedValue({
      updatedAt: presenceDate,
      status: "ONLINE",
    } as any);
    mockPrisma.harvestResult.findMany.mockResolvedValue([
      { query: "test query" },
    ] as any);

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(data.lastSync.harvestResults).toBe(harvestDate.toISOString());
    expect(data.lastSync.agentPresence).toBe(presenceDate.toISOString());
  });

  it("returns null lastSync when no data exists", async () => {
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(data.lastSync.harvestResults).toBeNull();
    expect(data.lastSync.agentPresence).toBeNull();
  });

  it("returns 500 when database throws on GET", async () => {
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
    mockPrisma.harvestResult.findFirst.mockRejectedValue(new Error("DB error"));

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});