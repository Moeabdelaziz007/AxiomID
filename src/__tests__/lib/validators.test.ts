import { KyaClaimSchema } from "@/lib/validators";
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

describe("apiError FORBIDDEN", () => {
  it("returns 403 status with FORBIDDEN code", () => {
    const response = apiError("FORBIDDEN", "Access denied");
    expect(response.status).toBe(403);
  });

  it("includes error code in response body", async () => {
    const response = apiError("FORBIDDEN", "Access denied");
    const body = await response.json();
    expect(body.code).toBe("FORBIDDEN");
    expect(body.error).toBe("Access denied");
  });
});
