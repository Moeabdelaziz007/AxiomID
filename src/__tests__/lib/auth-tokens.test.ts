/**
 * @jest-environment node
 */

import { createIdentityAssertion, verifyIdentityAssertion } from "@/lib/auth-tokens";

describe("Auth Tokens", () => {
  const TEST_DID = "did:axiom:axiomid.app:pi:test123";
  const TEST_SCOPES = ["api.read", "api.write"] as const;

  it("creates a valid identity assertion JWT", async () => {
    const token = await createIdentityAssertion(TEST_DID, [...TEST_SCOPES]);

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("verifies a valid identity assertion", async () => {
    const token = await createIdentityAssertion(TEST_DID, [...TEST_SCOPES]);
    const payload = await verifyIdentityAssertion(token);

    expect(payload.sub).toBe(TEST_DID);
    expect(payload.iss).toBe("https://axiomid.app");
    expect(payload.scopes).toEqual([...TEST_SCOPES]);
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it("rejects expired tokens", async () => {
    const token = await createIdentityAssertion(TEST_DID, [...TEST_SCOPES], 0);
    await expect(verifyIdentityAssertion(token)).rejects.toThrow("Token has expired");
  });

  it("rejects tokens with wrong issuer", async () => {
    await expect(verifyIdentityAssertion("garbage")).rejects.toThrow();
  });
});
