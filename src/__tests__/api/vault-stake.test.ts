/**
 * @jest-environment node
 *
 * Tests for src/app/api/vault/stake/route.ts
 */

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    stake: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn(),
  RATE_LIMITS: {
    authenticated: { windowMs: 60_000, maxRequests: 100 },
  },
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { GET, POST } from "@/app/api/vault/stake/route";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { checkRateLimit } from "@/lib/rate-limiter";

const mockRequireAuth = requireAuth as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockUser = {
  id: "user-123",
};

function mockRequest(method: "GET" | "POST", body?: any) {
  return new Request("http://localhost/api/vault/stake", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as any;
}

describe("GET /api/vault/stake", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("returns user stakes successfully", async () => {
    const mockStakes = [
      { id: "stake-1", userId: "user-123", amount: 100, status: "staked", createdAt: new Date() },
    ];
    mockPrisma.stake.findMany.mockResolvedValue(mockStakes as any);

    const req = mockRequest("GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.stakes).toHaveLength(1);
    expect(data.stakes[0].amount).toBe(100);
    expect(mockPrisma.stake.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns rate limited error", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockRequest("GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });
});

describe("POST /api/vault/stake", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: mockUser });
  });

  it("stakes successfully", async () => {
    const mockStake = { id: "stake-123", userId: "user-123", amount: 50, status: "staked" };
    mockPrisma.stake.create.mockResolvedValue(mockStake as any);

    const req = mockRequest("POST", { action: "stake", amount: 50 });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.stake.amount).toBe(50);
    expect(mockPrisma.stake.create).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        amount: 50,
        status: "staked",
      },
    });
  });

  it("unstakes a specific stakeId successfully", async () => {
    const validUuid = "4ef60647-f509-4ed8-a873-c1519c7246ea";
    const mockStake = { id: validUuid, userId: "user-123", amount: 50, status: "staked" };
    const mockUpdatedStake = { ...mockStake, status: "unstaked" };
    mockPrisma.stake.findFirst.mockResolvedValue(mockStake as any);
    mockPrisma.stake.update.mockResolvedValue(mockUpdatedStake as any);

    const req = mockRequest("POST", { action: "unstake", stakeId: validUuid });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.stake.status).toBe("unstaked");
    expect(mockPrisma.stake.findFirst).toHaveBeenCalledWith({
      where: { id: validUuid, userId: "user-123" },
    });
    expect(mockPrisma.stake.update).toHaveBeenCalledWith({
      where: { id: validUuid },
      data: { status: "unstaked" },
    });
  });

  it("unstakes all active stakes successfully", async () => {
    const mockStakes = [
      { id: "stake-1", status: "staked" },
      { id: "stake-2", status: "staked" },
    ];
    mockPrisma.stake.findMany.mockResolvedValue(mockStakes as any);
    mockPrisma.stake.updateMany.mockResolvedValue({ count: 2 } as any);

    const req = mockRequest("POST", { action: "unstake" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toContain("Successfully unstaked 2 stakes");
    expect(mockPrisma.stake.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["stake-1", "stake-2"] } },
      data: { status: "unstaked" },
    });
  });
});
