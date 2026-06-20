import crypto from "crypto";
import { deriveSovereignAgentKeypair } from "@/lib/sovereign-keys";

interface Jwk {
  kty: string;
  crv: string;
  x: string;
  kid: string;
  alg: string;
  use: string;
}

interface Jwks {
  keys: Jwk[];
}

/**
 * Exports a JSON Web Key Set for the given DID.
 *
 * @param did - The Decentralized Identifier (DID) for which to export the JWKS
 * @returns A JWKS object containing the derived public key for the DID, or an empty JWKS if the DID is falsy or the string "*"
 */
export function exportJwks(did: string): Jwks {
  const keys: Jwk[] = [];

  if (did && did !== "*") {
    // Derive from the uid (last DID segment) to match the signing key
    // derivation in /api/agent/sign, so the published public key verifies
    // signatures produced there.
    const didParts = did.split(":");
    const uid = decodeURIComponent(didParts[didParts.length - 1]);
    const keypair = deriveSovereignAgentKeypair(uid, "axiom-root");
    const kid = `${did}#key-1`;
    keys.push(pemToJwk(keypair.publicKey, kid));
  }

  return { keys };
}

/**
 * Converts a PEM-encoded public key to a JSON Web Key.
 *
 * `@param` publicKeyPem - The PEM-encoded public key string
 * `@param` kid - The key identifier to assign to the JWK
 * `@throws` Throws an error if the key type is not Ed25519.
 * `@returns` A JWK representation of the public key.
 */
export function pemToJwk(publicKeyPem: string, kid: string): Jwk {
  const keyObject = crypto.createPublicKey(publicKeyPem);
  const keyType = keyObject.asymmetricKeyType;

  if (keyType === "ed25519") {
    const rawKey = keyObject.export({ type: "spki", format: "der" });
    const publicKeyBytes = rawKey.subarray(rawKey.length - 32);
    const x = publicKeyBytes.toString("base64url");

    return {
      kty: "OKP",
      crv: "Ed25519",
      x,
      kid,
      alg: "EdDSA",
      use: "sig",
    };
  }

  throw new Error(`Unsupported key type: ${keyType}`);
}
