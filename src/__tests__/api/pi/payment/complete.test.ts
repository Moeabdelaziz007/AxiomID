import { POST } from "@/app/api/pi/payment/complete/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateTier } from "@/lib/tiers";

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn().mockResolvedValue({ user: { id: "test-user-id" }, error: null }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    piPayment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    xpLedger: {
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

describe("POST /api/pi/payment/complete", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, PI_API_KEY: "test-key" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("handles missing paymentId or txid", async () => {
    const req = new NextRequest("http://localhost/api/pi/payment/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    
    const res = await POST(req);
    expect(res.status).toBe(400); // Validation error
    const json = await res.json();
    expect(json.error).toBeDefined(); // apiError returns success: false
  });

  it("validates successful payment completion", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "COMPLETED" }),
    });

    // Mock DB calls
    (prisma.piPayment.findUnique as jest.Mock).mockResolvedValue({
      paymentId: "pay-123",
      userId: "test-user-id",
      status: "CREATED",
      amount: 10,
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "test-user-id",
      xp: 100,
      tier: "Citizen",
    });

    const req = new NextRequest("http://localhost/api/pi/payment/complete", {
      method: "POST",
      body: JSON.stringify({ paymentId: "pay-123", txid: "tx-abc" }),
    });
    
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("completed");
    expect(json.txid).toBe("tx-abc");
  });
});
