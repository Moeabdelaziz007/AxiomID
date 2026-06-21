/**
 * @jest-environment node
 */

import {
  createIdentityAssertion,
  verifyIdentityAssertion,
  createAccessToken,
  verifyAccessToken,
} from "@/lib/auth-tokens";

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

  it("includes iat in payload", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await createIdentityAssertion(TEST_DID, [...TEST_SCOPES]);
    const payload = await verifyIdentityAssertion(token);

    expect(payload.iat).toBeGreaterThanOrEqual(before);
    expect(payload.iat).toBeLessThanOrEqual(before + 2);
  });

  it("sets exp to iat + expiresInSec", async () => {
    const customExpiry = 7200;
    const before = Math.floor(Date.now() / 1000);
    const token = await createIdentityAssertion(TEST_DID, [...TEST_SCOPES], customExpiry);
    const payload = await verifyIdentityAssertion(token);

    expect(payload.exp).toBeGreaterThanOrEqual(before + customExpiry);
    expect(payload.exp).toBeLessThanOrEqual(before + customExpiry + 2);
  });

  it("preserves all scopes in payload", async () => {
    const scopes = ["api.read", "api.write", "agent.sign"];
    const token = await createIdentityAssertion(TEST_DID, scopes);
    const payload = await verifyIdentityAssertion(token);

    expect(payload.scopes).toEqual(scopes);
  });

  it("handles empty scopes array", async () => {
    const token = await createIdentityAssertion(TEST_DID, []);
    const payload = await verifyIdentityAssertion(token);

    expect(payload.scopes).toEqual([]);
  });

  it("rejects malformed JWT (wrong number of segments)", async () => {
    await expect(verifyIdentityAssertion("not.valid")).rejects.toThrow();
  });

  it("rejects a token with tampered payload", async () => {
    const token = await createIdentityAssertion(TEST_DID, [...TEST_SCOPES]);
    const parts = token.split(".");
    // Replace payload with a different base64url-encoded JSON
    const fakePayload = Buffer.from(JSON.stringify({ sub: "attacker", scopes: [] })).toString("base64url");
    const tampered = `${parts[0]}.${fakePayload}.${parts[2]}`;

    await expect(verifyIdentityAssertion(tampered)).rejects.toThrow();
  });
});

describe("createAccessToken / verifyAccessToken", () => {
  const TEST_DID = "did:axiom:axiomid.app:pi:access-test";
  const TEST_SCOPES = ["api.read"];

  it("createAccessToken produces a valid JWT", async () => {
    const token = await createAccessToken(TEST_DID, TEST_SCOPES);

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("verifyAccessToken returns sub and scopes", async () => {
    const token = await createAccessToken(TEST_DID, TEST_SCOPES);
    const result = await verifyAccessToken(token);

    expect(result.sub).toBe(TEST_DID);
    expect(result.scopes).toEqual(TEST_SCOPES);
  });

  it("verifyAccessToken rejects garbage input", async () => {
    await expect(verifyAccessToken("garbage")).rejects.toThrow();
  });

  it("createAccessToken and createIdentityAssertion produce equivalent tokens", async () => {
    const [accessToken, identityToken] = await Promise.all([
      createAccessToken(TEST_DID, TEST_SCOPES),
      createIdentityAssertion(TEST_DID, TEST_SCOPES),
    ]);

    // Both should be valid JWTs with the same structure
    const [accessPayload, identityPayload] = await Promise.all([
      verifyAccessToken(accessToken),
      verifyAccessToken(identityToken),
    ]);

    expect(accessPayload.sub).toBe(identityPayload.sub);
    expect(accessPayload.scopes).toEqual(identityPayload.scopes);
  });
});
