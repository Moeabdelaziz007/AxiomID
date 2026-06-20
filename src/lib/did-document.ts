import { z } from "zod";

const DID_CONTEXT = "https://www.w3.org/ns/did/v1";

export const DidDocumentSchema = z.object({
  "@context": z.array(z.string()),
  id: z.string(),
  verificationMethod: z.array(z.object({
    id: z.string(),
    type: z.string(),
    controller: z.string(),
    publicKeyMultibase: z.string(),
  })).optional(),
  authentication: z.array(z.string()).optional(),
  assertionMethod: z.array(z.string()).optional(),
});

export type DidDocument = z.infer<typeof DidDocumentSchema>;

export function buildDidDocument(
  did: string,
  publicKeyMultibase?: string,
  keyVersion = 1
): DidDocument {
  const keyId = `${did}#key-${keyVersion}`;
  const keyRef = `#key-${keyVersion}`;

  const doc: DidDocument = {
    "@context": [DID_CONTEXT],
    id: did,
  };

  if (publicKeyMultibase) {
    doc.verificationMethod = [{
      id: keyId,
      type: "Ed25519VerificationKey2020",
      controller: did,
      publicKeyMultibase,
    }];
    doc.authentication = [keyRef];
    doc.assertionMethod = [keyRef];
  }

  return doc;
}

export async function resolveDidDocument(did: string): Promise<DidDocument | null> {
  void did;
  return null;
}
