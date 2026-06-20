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

export function exportJwks(did: string): Jwks {
  const keys: Jwk[] = [];

  if (did && did !== "*") {
    const keypair = deriveSovereignAgentKeypair(did, "axiom-root");
    const kid = `${did}#key-1`;
    keys.push(pemToJwk(keypair.publicKey, kid));
  }

  return { keys };
}

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
