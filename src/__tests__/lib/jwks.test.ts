/**
 * @jest-environment node
 */

jest.mock("@/lib/sovereign-keys", () => ({
  deriveSovereignAgentKeypair: jest.fn(),
}));

import { exportJwks } from "@/lib/jwks";
import { deriveSovereignAgentKeypair } from "@/lib/sovereign-keys";

const mockDerive = deriveSovereignAgentKeypair as jest.Mock;

describe("JWKS", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDerive.mockReturnValue({
      publicKey: "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAOKH3MUqXr7DXFp9IHtf6LebKtA+Mtwfon8CHJX6tz5E=\n-----END PUBLIC KEY-----\n",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIMA5vVnREIasSgrFZI8aJgMCoPEyYm21lk5c4N6nuLd/\n-----END PRIVATE KEY-----\n",
    });
  });

  it("exports public keys in JWK format", async () => {
    const jwks = await exportJwks("did:axiom:axiomid.app:pi:abc123");

    expect(jwks).toHaveProperty("keys");
    expect(Array.isArray(jwks.keys)).toBe(true);
    expect(jwks.keys.length).toBeGreaterThan(0);
    expect(jwks.keys[0]).toHaveProperty("kty");
    expect(jwks.keys[0]).toHaveProperty("crv");
    expect(jwks.keys[0]).toHaveProperty("x");
    expect(jwks.keys[0]).toHaveProperty("kid");
    expect(jwks.keys[0].kty).toBe("OKP");
    expect(jwks.keys[0].crv).toBe("Ed25519");
    expect(jwks.keys[0].alg).toBe("EdDSA");
    expect(jwks.keys[0].use).toBe("sig");
  });

  it("derives the correct kid from DID and key version", async () => {
    const jwks = await exportJwks("did:axiom:axiomid.app:pi:abc123");
    expect(jwks.keys[0].kid).toBe("did:axiom:axiomid.app:pi:abc123#key-1");
  });
});
