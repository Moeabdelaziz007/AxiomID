/**
 * @jest-environment node
 */

jest.mock("@/lib/sovereign-keys", () => ({
  deriveSovereignAgentKeypair: jest.fn(),
  ROOT_AGENT_ID: "axiom-root",
}));

import { exportJwks } from "@/lib/jwks";
import { deriveSovereignAgentKeypair } from "@/lib/sovereign-keys";

const mockDerive = deriveSovereignAgentKeypair as jest.Mock;

// Valid Ed25519 key PEM (generated for test purposes)
const VALID_ED25519_PUBLIC_PEM = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAOKH3MUqXr7DXFp9IHtf6LebKtA+Mtwfon8CHJX6tz5E=\n-----END PUBLIC KEY-----\n";

describe("JWKS", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDerive.mockReturnValue({
      publicKey: VALID_ED25519_PUBLIC_PEM,
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

  it("returns empty keys array for wildcard '*'", () => {
    const jwks = exportJwks("*");

    expect(jwks).toHaveProperty("keys");
    expect(jwks.keys).toHaveLength(0);
    expect(mockDerive).not.toHaveBeenCalled();
  });

  it("returns empty keys array for empty string DID", () => {
    const jwks = exportJwks("");

    expect(jwks.keys).toHaveLength(0);
    expect(mockDerive).not.toHaveBeenCalled();
  });

  it("calls deriveSovereignAgentKeypair with the DID and ROOT_AGENT_ID", () => {
    const did = "did:axiom:axiomid.app:pi:abc123";
    exportJwks(did);

    expect(mockDerive).toHaveBeenCalledWith(did, "axiom-root");
  });

  it("x field is a base64url string", () => {
    const jwks = exportJwks("did:axiom:axiomid.app:pi:abc123");
    const x = jwks.keys[0].x;

    // base64url: no padding, uses - and _ instead of + and /
    expect(x).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("exports exactly one key for a single DID", () => {
    const jwks = exportJwks("did:axiom:axiomid.app:pi:abc123");
    expect(jwks.keys).toHaveLength(1);
  });

  it("throws when deriveSovereignAgentKeypair returns invalid PEM", () => {
    mockDerive.mockReturnValue({
      publicKey: "-----BEGIN PUBLIC KEY-----\nINVALID_PEM\n-----END PUBLIC KEY-----\n",
      privateKey: "",
    });

    expect(() => exportJwks("did:axiom:axiomid.app:pi:abc123")).toThrow();
  });
});
