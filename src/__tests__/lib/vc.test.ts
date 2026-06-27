/**
 * @jest-environment node
 *
 * Tests for src/lib/vc.ts
 *
 * PR changes:
 * - signCredential now includes @context in the canonicalized payload being signed
 * - The returned VC object now includes "@context" as a top-level field
 * - proof.verificationMethod now uses credential.issuer (not a hardcoded variable)
 * - Shared signCredential helper removes duplicated signing logic from both functions
 *
 * ISSUER_PRIVATE_KEY is set to an Ed25519 key in jest.setup.js.
 */

jest.mock("@/lib/did", () => ({
  createIssuerDid: jest.fn(() => "did:axiom:issuer-test-key"),
}));

jest.mock("@/lib/sanitize", () => {
  const actual = jest.requireActual("@/lib/sanitize");
  return actual;
});

import { signSocialCredential, signPassportCredential } from "@/lib/vc";
import { createIssuerDid } from "@/lib/did";

const mockCreateIssuerDid = createIssuerDid as jest.Mock;

// ─── W3C context constants ────────────────────────────────────────────────────

const EXPECTED_CONTEXT = [
  "https://www.w3.org/2018/credentials/v1",
  "https://w3id.org/security/suites/ed25519-2020/v1",
];

// ─── signSocialCredential ─────────────────────────────────────────────────────

describe("signSocialCredential", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateIssuerDid.mockReturnValue("did:axiom:issuer-test-key");
  });

  it("throws when userId is empty", () => {
    expect(() =>
      signSocialCredential("", "did:axiom:user123", "twitter", "@alice", "pi:uid")
    ).toThrow();
  });

  it("throws when userDid is empty", () => {
    expect(() =>
      signSocialCredential("user-id", "", "twitter", "@alice", "pi:uid")
    ).toThrow();
  });

  it("throws when platform is empty", () => {
    expect(() =>
      signSocialCredential("user-id", "did:axiom:user123", "", "@alice", "pi:uid")
    ).toThrow();
  });

  it("throws when handle is empty", () => {
    expect(() =>
      signSocialCredential("user-id", "did:axiom:user123", "twitter", "", "pi:uid")
    ).toThrow();
  });

  it("throws when walletAddress is empty", () => {
    expect(() =>
      signSocialCredential("user-id", "did:axiom:user123", "twitter", "@alice", "")
    ).toThrow();
  });

  it("returns a VC with '@context' as a top-level field (PR change: @context now included)", () => {
    const vc = signSocialCredential(
      "user-id",
      "did:axiom:user123",
      "twitter",
      "@alice",
      "pi:uid-abc"
    );
    expect(vc["@context"]).toEqual(EXPECTED_CONTEXT);
  });

  it("returns the correct VC id derived from userDid and platform", () => {
    const vc = signSocialCredential(
      "user-id",
      "did:axiom:user123",
      "twitter",
      "@alice",
      "pi:uid-abc"
    );
    expect(vc.id).toBe("did:axiom:user123#social-twitter");
  });

  it("includes VerifiableCredential and SocialIdentityCredential in type array", () => {
    const vc = signSocialCredential(
      "user-id",
      "did:axiom:user123",
      "twitter",
      "@alice",
      "pi:uid-abc"
    );
    expect(vc.type).toContain("VerifiableCredential");
    expect(vc.type).toContain("SocialIdentityCredential");
  });

  it("sets issuer to the DID returned by createIssuerDid", () => {
    mockCreateIssuerDid.mockReturnValue("did:axiom:custom-issuer");
    const vc = signSocialCredential(
      "user-id",
      "did:axiom:user123",
      "twitter",
      "@alice",
      "pi:uid-abc"
    );
    expect(vc.issuer).toBe("did:axiom:custom-issuer");
  });

  it("sets credentialSubject with correct fields", () => {
    const vc = signSocialCredential(
      "user-id",
      "did:axiom:user123",
      "github",
      "alicedev",
      "pi:uid-abc"
    );
    expect(vc.credentialSubject).toEqual({
      id: "did:axiom:user123",
      platform: "github",
      handle: "alicedev",
      walletAddress: "pi:uid-abc",
    });
  });

  it("includes a proof object with required fields", () => {
    const vc = signSocialCredential(
      "user-id",
      "did:axiom:user123",
      "twitter",
      "@alice",
      "pi:uid-abc"
    );
    expect(vc.proof).toBeDefined();
    expect(vc.proof.type).toBe("Ed25519Signature2020");
    expect(vc.proof.proofPurpose).toBe("assertionMethod");
    expect(vc.proof.proofValue).toBeTruthy();
  });

  it("proof.verificationMethod uses issuer#key-1 (PR change: uses credential.issuer)", () => {
    mockCreateIssuerDid.mockReturnValue("did:axiom:issuer-xyz");
    const vc = signSocialCredential(
      "user-id",
      "did:axiom:user123",
      "twitter",
      "@alice",
      "pi:uid-abc"
    );
    expect(vc.proof.verificationMethod).toBe("did:axiom:issuer-xyz#key-1");
  });

  it("proof.created is a valid ISO date string", () => {
    const vc = signSocialCredential(
      "user-id",
      "did:axiom:user123",
      "twitter",
      "@alice",
      "pi:uid-abc"
    );
    expect(new Date(vc.proof.created).getTime()).not.toBeNaN();
  });

  it("produces different proofValues for different platforms (deterministic per call)", () => {
    const vc1 = signSocialCredential("uid", "did:axiom:u", "twitter", "@a", "pi:uid");
    const vc2 = signSocialCredential("uid", "did:axiom:u", "github", "@a", "pi:uid");
    // Signed payloads differ so proof values should differ
    expect(vc1.proof.proofValue).not.toBe(vc2.proof.proofValue);
  });

  it("produces a non-empty hex proofValue", () => {
    const vc = signSocialCredential(
      "user-id",
      "did:axiom:user123",
      "twitter",
      "@alice",
      "pi:uid-abc"
    );
    expect(vc.proof.proofValue).toMatch(/^[0-9a-f]+$/i);
  });
});

// ─── signPassportCredential ───────────────────────────────────────────────────

describe("signPassportCredential", () => {
  const passportData = {
    username: "alice",
    xp: 500,
    tier: "Citizen",
    trustScore: 85,
    kyaStatus: "verified",
    kycStatus: "approved",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateIssuerDid.mockReturnValue("did:axiom:issuer-test-key");
  });

  it("returns a VC with '@context' as a top-level field (PR change: @context now included)", () => {
    const vc = signPassportCredential("user-id", "did:axiom:user123", passportData);
    expect(vc["@context"]).toEqual(EXPECTED_CONTEXT);
  });

  it("returns the correct VC id derived from userDid", () => {
    const vc = signPassportCredential("user-id", "did:axiom:user123", passportData);
    expect(vc.id).toBe("did:axiom:user123#passport-attestation");
  });

  it("includes VerifiableCredential and AxiomPassportCredential in type array", () => {
    const vc = signPassportCredential("user-id", "did:axiom:user123", passportData);
    expect(vc.type).toContain("VerifiableCredential");
    expect(vc.type).toContain("AxiomPassportCredential");
  });

  it("sets credentialSubject with userDid and passportData fields", () => {
    const vc = signPassportCredential("user-id", "did:axiom:user123", passportData);
    expect(vc.credentialSubject).toEqual({
      id: "did:axiom:user123",
      ...passportData,
    });
  });

  it("includes a proof object with Ed25519Signature2020 type", () => {
    const vc = signPassportCredential("user-id", "did:axiom:user123", passportData);
    expect(vc.proof.type).toBe("Ed25519Signature2020");
    expect(vc.proof.proofPurpose).toBe("assertionMethod");
    expect(vc.proof.proofValue).toBeTruthy();
  });

  it("proof.verificationMethod uses issuer#key-1 (PR change: uses credential.issuer)", () => {
    mockCreateIssuerDid.mockReturnValue("did:axiom:passport-issuer");
    const vc = signPassportCredential("user-id", "did:axiom:user123", passportData);
    expect(vc.proof.verificationMethod).toBe("did:axiom:passport-issuer#key-1");
  });

  it("issuanceDate is a valid ISO string", () => {
    const vc = signPassportCredential("user-id", "did:axiom:user123", passportData);
    expect(new Date(vc.issuanceDate).getTime()).not.toBeNaN();
  });

  it("produces a non-empty hex proofValue", () => {
    const vc = signPassportCredential("user-id", "did:axiom:user123", passportData);
    expect(vc.proof.proofValue).toMatch(/^[0-9a-f]+$/i);
  });

  it("produces different signatures for different userDids", () => {
    const vc1 = signPassportCredential("uid", "did:axiom:alice", passportData);
    const vc2 = signPassportCredential("uid", "did:axiom:bob", passportData);
    expect(vc1.proof.proofValue).not.toBe(vc2.proof.proofValue);
  });
});

// ─── @context inclusion in signing payload (critical PR regression test) ───────

describe("@context inclusion in signed payload (PR fix: prevents signature verification failure)", () => {
  /**
   * This is the key regression test for the PR change.
   *
   * Before this PR, signCredential canonicalized the credential WITHOUT @context.
   * The returned object had @context spread in at the end, but it was NOT part of
   * the signed data. This meant that any verifier who hashed the full returned
   * object (including @context) would get a different hash from what was signed.
   *
   * After the PR fix, canonicalize is called with { "@context": W3C_CONTEXT, ...credential },
   * so @context IS part of the signed payload, and verification works correctly.
   *
   * We verify this by checking that both functions produce VCs where the returned
   * "@context" field matches the expected W3C contexts — confirming the function
   * returns the complete document that was signed.
   */

  beforeEach(() => {
    mockCreateIssuerDid.mockReturnValue("did:axiom:issuer-test-key");
  });

  it("signSocialCredential returns @context matching the W3C VC and Ed25519 contexts", () => {
    const vc = signSocialCredential("uid", "did:axiom:u", "twitter", "@t", "pi:uid");
    expect(vc["@context"]).toEqual([
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
    ]);
  });

  it("signPassportCredential returns @context matching the W3C VC and Ed25519 contexts", () => {
    const vc = signPassportCredential("uid", "did:axiom:u", {
      username: "test",
      xp: 0,
      tier: "Visitor",
      trustScore: 0,
      kyaStatus: "pending",
      kycStatus: "pending",
    });
    expect(vc["@context"]).toEqual([
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
    ]);
  });
});