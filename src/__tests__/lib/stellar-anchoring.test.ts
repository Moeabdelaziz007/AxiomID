import { computeVcHash } from "@/lib/stellar-anchoring";

describe("computeVcHash", () => {
  it("returns a hex-encoded SHA-256 hash of the canonicalized VC", () => {
    const vc = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential"],
      issuer: "did:axiom:issuer",
      issuanceDate: "2026-06-28T00:00:00.000Z",
      credentialSubject: { id: "did:axiom:user-1" },
      proof: { proofValue: "abc123" },
    };
    const hash = computeVcHash(vc);
    expect(hash).toMatch(/^[a-f0-9]{64}$/); // 64 hex chars = SHA-256
  });

  it("produces the same hash for the same VC (deterministic)", () => {
    const vc1 = {
      issuer: "did:axiom:issuer",
      credentialSubject: { role: "member", id: "did:axiom:user-1" },
      type: ["VerifiableCredential"],
    };
    const vc2 = {
      type: ["VerifiableCredential"],
      credentialSubject: { id: "did:axiom:user-1", role: "member" },
      issuer: "did:axiom:issuer",
    };
    expect(computeVcHash(vc1)).toBe(computeVcHash(vc2));
  });

  it("produces different hashes for different VCs", () => {
    const vc1 = { type: ["VerifiableCredential"], issuer: "did:axiom:issuer" };
    const vc2 = { type: ["VerifiableCredential"], issuer: "did:axiom:other" };
    expect(computeVcHash(vc1)).not.toBe(computeVcHash(vc2));
  });
});
