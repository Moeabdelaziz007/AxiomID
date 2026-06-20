import { deriveSovereignAgentKeypair, signPayloadWithAgentKey, verifyAgentSignature } from "@/lib/sovereign-keys";

describe("Sovereign Key Cascade Derivation", () => {
  const stellarAddress = "GD5T6YZRMCK7O4JRGXNKH2S3W3E42J2DT3R4J33J4H46J4G4H4K4L4M4";
  const agentId = "agent-alpha-1";

  it("derives deterministic keypairs", () => {
    const keys1 = deriveSovereignAgentKeypair(stellarAddress, agentId);
    const keys2 = deriveSovereignAgentKeypair(stellarAddress, agentId);
    expect(keys1.publicKey).toBe(keys2.publicKey);
    expect(keys1.privateKey).toBe(keys2.privateKey);
    expect(keys1.publicKey).toContain("BEGIN PUBLIC KEY");
    expect(keys1.privateKey).toContain("BEGIN PRIVATE KEY");
  });

  it("signs and verifies payload correctly using derived keys", () => {
    const keys = deriveSovereignAgentKeypair(stellarAddress, agentId);
    const payload = "verifiable-identity-claim-123";
    const signature = signPayloadWithAgentKey(payload, keys.privateKey);
    const isValid = verifyAgentSignature(payload, signature, keys.publicKey);
    expect(isValid).toBe(true);

    const isInvalid = verifyAgentSignature(payload + "-tampered", signature, keys.publicKey);
    expect(isInvalid).toBe(false);
  });
});
