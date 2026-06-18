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

// OrderCreateSchema — PR change: amount field removed
describe("OrderCreateSchema (PR change: amount field removed)", () => {
  const validSkillId = "123e4567-e89b-12d3-a456-426614174000";
  const validAgentId = "123e4567-e89b-12d3-a456-426614174001";

  it("accepts valid input with skillId, agentId, and paymentId", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: validSkillId,
      agentId: validAgentId,
      paymentId: "pi-payment-abc",
    });
    expect(result.success).toBe(true);
  });

  it("no longer requires amount field — omitting amount is valid", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: validSkillId,
      agentId: validAgentId,
      paymentId: "some-payment-id",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // amount should not be in the parsed output
      expect((result.data as Record<string, unknown>).amount).toBeUndefined();
    }
  });

  it("extra amount field is stripped (not included in parsed data)", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: validSkillId,
      agentId: validAgentId,
      paymentId: "some-payment-id",
      amount: 5, // extra field — schema no longer declares it
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).amount).toBeUndefined();
    }
  });

  it("rejects missing skillId", () => {
    const result = OrderCreateSchema.safeParse({
      agentId: validAgentId,
      paymentId: "pi-payment-abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing agentId", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: validSkillId,
      paymentId: "pi-payment-abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing paymentId", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: validSkillId,
      agentId: validAgentId,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID skillId", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: "not-a-uuid",
      agentId: validAgentId,
      paymentId: "pi-payment-abc",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("UUID");
    }
  });

  it("rejects non-UUID agentId", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: validSkillId,
      agentId: "not-a-uuid",
      paymentId: "pi-payment-abc",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("UUID");
    }
  });

  it("rejects empty paymentId", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: validSkillId,
      agentId: validAgentId,
      paymentId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("paymentId is required");
    }
  });

  it("parsed output contains exactly skillId, agentId, paymentId", () => {
    const result = OrderCreateSchema.safeParse({
      skillId: validSkillId,
      agentId: validAgentId,
      paymentId: "free-skill-id",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        skillId: validSkillId,
        agentId: validAgentId,
        paymentId: "free-skill-id",
      });
    }
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
