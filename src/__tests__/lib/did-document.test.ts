/**
 * @jest-environment node
 */

jest.mock("@/lib/sovereign-keys", () => ({
  deriveSovereignAgentKeypair: jest.fn(),
}));

import { buildDidDocument, resolveDidDocument } from "@/lib/did-document";
import { deriveSovereignAgentKeypair } from "@/lib/sovereign-keys";

const mockDerive = deriveSovereignAgentKeypair as jest.Mock;

describe("DID Document", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDerive.mockReturnValue({
      publicKey: "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwA...\n-----END PUBLIC KEY-----",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQ...\n-----END PRIVATE KEY-----",
    });
  });

  it("builds a valid W3C DID Document", () => {
    const doc = buildDidDocument("did:axiom:axiomid.app:pi:abc123", "z6MkhaXgBZD...");

    expect(doc["@context"]).toContain("https://www.w3.org/ns/did/v1");
    expect(doc.id).toBe("did:axiom:axiomid.app:pi:abc123");
    expect(doc.verificationMethod).toHaveLength(1);
    expect(doc.verificationMethod![0].type).toBe("Ed25519VerificationKey2020");
    expect(doc.verificationMethod![0].controller).toBe("did:axiom:axiomid.app:pi:abc123");
    expect(doc.authentication).toContain("#key-1");
    expect(doc.assertionMethod).toContain("#key-1");
  });

  it("resolves DID Document from store", async () => {
    // resolveDidDocument will be implemented to look up by DID string
    // For now, test that it returns the document or null
    const doc = await resolveDidDocument("did:axiom:axiomid.app:pi:abc123");
    // Will be mocked in later steps
  });
});
