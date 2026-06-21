/**
 * @jest-environment node
 */

jest.mock("@/lib/sovereign-keys", () => ({
  deriveSovereignAgentKeypair: jest.fn(),
}));

import { buildDidDocument, resolveDidDocument, DidDocumentSchema } from "@/lib/did-document";
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
    expect(doc).toBeNull();
  });

  it("sets the correct key ID using DID + key version", () => {
    const did = "did:axiom:axiomid.app:pi:abc123";
    const doc = buildDidDocument(did, "z6MkhaXgBZD...");

    const keyId = `${did}#key-1`;
    expect(doc.verificationMethod![0].id).toBe(keyId);
  });

  it("sets publicKeyMultibase on the verification method", () => {
    const doc = buildDidDocument("did:axiom:axiomid.app:pi:abc123", "z6MkhaXgBZD...");

    expect(doc.verificationMethod![0].publicKeyMultibase).toBe("z6MkhaXgBZD...");
  });

  it("builds document without verificationMethod when no publicKeyMultibase given", () => {
    const doc = buildDidDocument("did:axiom:axiomid.app:pi:abc123");

    expect(doc.verificationMethod).toBeUndefined();
    expect(doc.authentication).toBeUndefined();
    expect(doc.assertionMethod).toBeUndefined();
  });

  it("uses custom keyVersion in key ID", () => {
    const did = "did:axiom:axiomid.app:pi:abc123";
    const doc = buildDidDocument(did, "z6MkhaXgBZD...", 2);

    expect(doc.verificationMethod![0].id).toBe(`${did}#key-2`);
    expect(doc.authentication).toContain("#key-2");
    expect(doc.assertionMethod).toContain("#key-2");
  });

  it("does not include key-1 references when keyVersion is 2", () => {
    const doc = buildDidDocument("did:axiom:axiomid.app:pi:abc123", "z6MkhaXgBZD...", 2);

    expect(doc.authentication).not.toContain("#key-1");
    expect(doc.assertionMethod).not.toContain("#key-1");
  });

  it("builds context as array with W3C DID v1 URL", () => {
    const doc = buildDidDocument("did:axiom:axiomid.app:pi:abc123", "z6MkhaXgBZD...");

    expect(Array.isArray(doc["@context"])).toBe(true);
    expect(doc["@context"][0]).toBe("https://www.w3.org/ns/did/v1");
  });

  it("passes Zod schema validation", () => {
    const doc = buildDidDocument("did:axiom:axiomid.app:pi:abc123", "z6MkhaXgBZD...");
    const result = DidDocumentSchema.safeParse(doc);

    expect(result.success).toBe(true);
  });

  it("resolveDidDocument returns null for unknown DIDs", async () => {
    const doc = await resolveDidDocument("did:axiom:axiomid.app:pi:unknown");
    expect(doc).toBeNull();
  });

  it("resolveDidDocument returns null for empty string DID", async () => {
    const doc = await resolveDidDocument("");
    expect(doc).toBeNull();
  });
});
