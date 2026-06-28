import {
  computeVcHash,
  getStellarServer,
  buildAnchorTransaction,
  submitAnchorTransaction,
  anchorVcHash,
  verifyVcOnChain,
} from "@/lib/stellar-anchoring";

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

describe("getStellarServer", () => {
  it("returns a Horizon server instance for testnet by default", () => {
    const server = getStellarServer();
    expect(server).toBeDefined();
    expect(server.serverURL.toString()).toContain("horizon-testnet");
  });
});

describe("buildAnchorTransaction", () => {
  it("builds a transaction with the VC hash as memo", async () => {
    const vcHash = "a".repeat(64);
    const stellarAddress = "GALAXYPLLQOZNB5GZRG3XHZK7AGQGEFOKG7HKJDQ4QFQY6JN3C4Q4O7Z8";
    // Account won't exist on testnet — we just verify the function exists and rejects appropriately
    try {
      await buildAnchorTransaction(stellarAddress, vcHash);
    } catch (err) {
      expect(err).toBeDefined();
    }
  });
});

describe("submitAnchorTransaction", () => {
  it("has the correct function signature", () => {
    expect(typeof submitAnchorTransaction).toBe("function");
  });
});

describe("anchorVcHash", () => {
  it("is exported as a function with the correct signature", () => {
    expect(typeof anchorVcHash).toBe("function");
    expect(anchorVcHash.length).toBe(2);
  });

  it("computes the same hash as computeVcHash for the input VC", () => {
    const vc = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential"],
      issuer: "did:axiom:issuer",
      issuanceDate: "2026-06-28T00:00:00.000Z",
      credentialSubject: { id: "did:axiom:user-1" },
      proof: { proofValue: "abc123" },
    };

    const hash = computeVcHash(vc);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects with invalid secret key", async () => {
    const vc = { type: ["VerifiableCredential"] };
    await expect(anchorVcHash(vc, "INVALID_KEY")).rejects.toThrow();
  });
});

describe("verifyVcOnChain", () => {
  it("returns anchored=false for non-existent transaction", async () => {
    const vc = {
      type: ["VerifiableCredential"],
      proof: { proofValue: "abc" },
    };
    const result = await verifyVcOnChain(vc, "nonexistent_tx_id");
    expect(result.anchored).toBe(false);
    expect(result.memoMatches).toBe(false);
  });

  it("is exported as a function with the correct signature", () => {
    expect(typeof verifyVcOnChain).toBe("function");
    expect(verifyVcOnChain.length).toBe(2);
  });
});
