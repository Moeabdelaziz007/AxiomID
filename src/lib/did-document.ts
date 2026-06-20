import { createPublicKey } from "crypto";
import { z } from "zod";

const DID_CONTEXT = "https://www.w3.org/ns/did/v1";
const ED25519_CONTEXT = "https://w3id.org/security/suites/ed25519-2020/v1";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function encodeBase58(buffer: Buffer): string {
  let num = BigInt("0x" + buffer.toString("hex"));
  let result = "";
  const zero = BigInt(0);
  const fiftyEight = BigInt(58);
  while (num > zero) {
    const remainder = Number(num % fiftyEight);
    result = ALPHABET[remainder] + result;
    num = num / fiftyEight;
  }
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0x00) {
      result = ALPHABET[0] + result;
    } else {
      break;
    }
  }
  return result;
}

/**
 * Converts an Ed25519 PEM public key to a `z`-prefixed base58 multibase string.
 *
 * @param publicKeyPem - PEM-encoded Ed25519 public key
 * @returns The multibase (base58-btc, multicodec 0xed01) representation
 * @throws If the key is not a valid Ed25519 PEM key
 */
function pemToMultibase(publicKeyPem: string): string {
  const key = createPublicKey({ key: publicKeyPem, format: "pem" });
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error(`Expected Ed25519 public key, got ${key.asymmetricKeyType}`);
  }
  const der = key.export({ format: "der", type: "spki" });
  const rawPublicKey = der.subarray(-32);
  const multicodecKey = Buffer.concat([Buffer.from([0xed, 0x01]), rawPublicKey]);
  return "z" + encodeBase58(multicodecKey);
}

export const DidDocumentSchema = z.object({
  "@context": z.array(z.string()).refine(
    (arr) => arr.includes(DID_CONTEXT),
    { message: `DID context must include ${DID_CONTEXT}` }
  ),
  id: z.string(),
  verificationMethod: z.array(z.object({
    id: z.string(),
    type: z.string(),
    controller: z.string(),
    publicKeyMultibase: z.string(),
  })).optional(),
  authentication: z.array(z.string()).optional(),
  assertionMethod: z.array(z.string()).optional(),
  service: z.array(z.object({
    id: z.string(),
    type: z.string(),
    serviceEndpoint: z.string(),
  })).optional(),
});

export type DidDocument = z.infer<typeof DidDocumentSchema>;

/**
 * Constructs a DID document from a DID identifier and optional public key.
 *
 * @param did - The DID identifier
 * @param publicKey - The public key, either an Ed25519 PEM (auto-converted to
 *   multibase) or an already-encoded `z`-prefixed multibase string
 * @param keyVersion - Version number used to generate the key identifier
 * @returns A DID document with verification methods if a public key is provided
 */
export function buildDidDocument(
  did: string,
  publicKey?: string,
  keyVersion = 1
): DidDocument {
  const keyId = `${did}#key-${keyVersion}`;
  const keyRef = `#key-${keyVersion}`;

  const doc: DidDocument = {
    "@context": [DID_CONTEXT, ED25519_CONTEXT],
    id: did,
    service: [{
      id: `${did}#credential-status`,
      type: "CredentialStatusList",
      serviceEndpoint: "https://axiomid.app/api/credential-status",
    }],
  };

  if (publicKey) {
    // Accept either a PEM (convert) or an already-encoded multibase string.
    const publicKeyMultibase = publicKey.includes("-----BEGIN")
      ? pemToMultibase(publicKey)
      : publicKey;

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

/**
 * Resolves a DID document.
 *
 * @param _did - The DID identifier to resolve
 * @returns The resolved DID document, or `null` if it cannot be resolved
 */
export async function resolveDidDocument(_did: string): Promise<DidDocument | null> {
  return null;
}
