import { deriveKeypair, signPayload, verifySignature, deriveUserRootKey, ROOT_AGENT_ID } from "../keypair";

const TEST_SALT = "test-salt-for-unit-tests";

describe("@axiomid/crypto", () => {
  describe("deriveKeypair", () => {
    it("returns PEM-encoded public and private keys", () => {
      const keys = deriveKeypair("GABC123", "agent-1", TEST_SALT);
      expect(keys.publicKey).toContain("BEGIN PUBLIC KEY");
      expect(keys.privateKey).toContain("BEGIN PRIVATE KEY");
    });

    it("is deterministic — same inputs produce same keys", () => {
      const keys1 = deriveKeypair("GABC123", "agent-1", TEST_SALT);
      const keys2 = deriveKeypair("GABC123", "agent-1", TEST_SALT);
      expect(keys1.publicKey).toBe(keys2.publicKey);
      expect(keys1.privateKey).toBe(keys2.privateKey);
    });

    it("produces different keys for different addresses", () => {
      const keys1 = deriveKeypair("GABC123", "agent-1", TEST_SALT);
      const keys2 = deriveKeypair("GDEF456", "agent-1", TEST_SALT);
      expect(keys1.publicKey).not.toBe(keys2.publicKey);
    });

    it("produces different keys for different agent IDs", () => {
      const keys1 = deriveKeypair("GABC123", "agent-1", TEST_SALT);
      const keys2 = deriveKeypair("GABC123", "agent-2", TEST_SALT);
      expect(keys1.publicKey).not.toBe(keys2.publicKey);
    });

    it("produces different keys for different salts", () => {
      const keys1 = deriveKeypair("GABC123", "agent-1", "salt-a");
      const keys2 = deriveKeypair("GABC123", "agent-1", "salt-b");
      expect(keys1.publicKey).not.toBe(keys2.publicKey);
    });

    it("throws when salt is empty", () => {
      expect(() => deriveKeypair("GABC123", "agent-1", "")).toThrow("SOVEREIGN_KEY_SALT is required");
    });
  });

  describe("signPayload + verifySignature", () => {
    it("signs and verifies a payload", () => {
      const keys = deriveKeypair("GABC123", "agent-1", TEST_SALT);
      const payload = "hello axiomid";
      const sig = signPayload(payload, keys.privateKey);
      expect(typeof sig).toBe("string");
      expect(sig.length).toBeGreaterThan(0);
      expect(verifySignature(payload, sig, keys.publicKey)).toBe(true);
    });

    it("rejects invalid signature", () => {
      const keys = deriveKeypair("GABC123", "agent-1", TEST_SALT);
      const fakeSig = "a".repeat(128);
      expect(verifySignature("hello", fakeSig, keys.publicKey)).toBe(false);
    });

    it("rejects wrong public key", () => {
      const keys1 = deriveKeypair("GABC123", "agent-1", TEST_SALT);
      const keys2 = deriveKeypair("GDEF456", "agent-2", TEST_SALT);
      const sig = signPayload("hello", keys1.privateKey);
      expect(verifySignature("hello", sig, keys2.publicKey)).toBe(false);
    });

    it("rejects modified payload", () => {
      const keys = deriveKeypair("GABC123", "agent-1", TEST_SALT);
      const sig = signPayload("hello", keys.privateKey);
      expect(verifySignature("hello!", sig, keys.publicKey)).toBe(false);
    });
  });

  describe("deriveUserRootKey", () => {
    it("uses ROOT_AGENT_ID as agent ID", () => {
      const rootKeys = deriveUserRootKey("user-123", TEST_SALT);
      const manualKeys = deriveKeypair("user-123", ROOT_AGENT_ID, TEST_SALT);
      expect(rootKeys.publicKey).toBe(manualKeys.publicKey);
    });

    it("ROOT_AGENT_ID is axiom-root", () => {
      expect(ROOT_AGENT_ID).toBe("axiom-root");
    });
  });
});
