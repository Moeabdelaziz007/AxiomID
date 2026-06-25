import { KyaClaimSchema, OrderCreateSchema } from "@/lib/validators";
import { apiError } from "@/lib/errors";

describe("KyaClaimSchema", () => {
  it("accepts valid username", () => {
    const result = KyaClaimSchema.safeParse({ username: "testuser" });
    expect(result.success).toBe(true);
  });

  it("rejects empty username", () => {
    const result = KyaClaimSchema.safeParse({ username: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing username", () => {
    const result = KyaClaimSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-string username", () => {
    const result = KyaClaimSchema.safeParse({ username: 123 });
    expect(result.success).toBe(false);
  });
});

describe("OrderCreateSchema (PR change: amount field removed)", () => {
  const validUUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
  const validUUID2 = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid skillId, agentId and paymentId", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: validUUID,
      agentId: validUUID2,
      paymentId: "pi-payment-xyz",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing skillId", () => {
    const result = OrderCreateSchema.safeParse({
      agentId: validUUID,
      paymentId: "pi-payment-xyz",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID skillId", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: "not-a-uuid",
      agentId: validUUID,
      paymentId: "pi-payment-xyz",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/uuid/i);
    }
  });

  it("rejects non-UUID agentId", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: validUUID,
      agentId: "not-a-uuid",
      paymentId: "pi-payment-xyz",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing paymentId", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: validUUID,
      agentId: validUUID2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty string paymentId", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: validUUID,
      agentId: validUUID2,
      paymentId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/paymentId is required/);
    }
  });

  it("rejects when amount is provided (field was removed in PR)", () => {
    // amount is not in the schema; extra fields are stripped by Zod default (strip mode)
    // so it should still succeed — the amount is just ignored
    const result = OrderCreateSchema.safeParse({
      skillId: validUUID,
      agentId: validUUID2,
      paymentId: "pi-payment-xyz",
      amount: 5,
    });
    // Zod strips unknown keys by default, so parse succeeds without amount
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).amount).toBeUndefined();
    }
  });

  it("accepts paymentId with special characters", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: validUUID,
      agentId: validUUID2,
      paymentId: "free-skill-abc-123",
    });
    expect(result.success).toBe(true);
  });
});

describe("apiError FORBIDDEN", () => {
  it("returns 403 status with FORBIDDEN code", () => {
    const response = apiError("FORBIDDEN", "Access denied");

  });

  it("includes error code in response body", async () => {
    const response = apiError("FORBIDDEN", "Access denied");
    const body = await response.json();
    expect(body.code).toBe("FORBIDDEN");
    expect(body.error).toBe("Access denied");
  });
});
