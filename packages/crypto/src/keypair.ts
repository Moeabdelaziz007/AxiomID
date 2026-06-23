import crypto from "crypto";
import { Keypair } from "./types";

export const ROOT_AGENT_ID = "axiom-root";

/**
 * Deterministically derives an Ed25519 keypair from a Stellar address and agent ID.
 *
 * @param stellarAddress - A Stellar blockchain address
 * @param agentId - An agent identifier string
 * @param salt - HMAC key material (must be SOVEREIGN_KEY_SALT from env)
 * @returns PEM-encoded public and private keys
 * @throws If salt is empty or crypto operations fail
 */
export function deriveKeypair(stellarAddress: string, agentId: string, salt: string): Keypair {
  if (!salt) {
    throw new Error("SOVEREIGN_KEY_SALT is required for key derivation");
  }

  const hmac = crypto.createHmac("sha256", salt);
  hmac.update(stellarAddress);
  hmac.update(agentId);
  const seed = hmac.digest();

  const privateKeyPrefix = Buffer.from("302e020100300506032b657004220420", "hex");
  const pkcs8Key = Buffer.concat([privateKeyPrefix, seed]);

  const privateKeyObj = crypto.createPrivateKey({
    key: pkcs8Key,
    format: "der",
    type: "pkcs8",
  });

  const publicKeyObj = crypto.createPublicKey(privateKeyObj);

  return {
    privateKey: privateKeyObj.export({ format: "pem", type: "pkcs8" }) as string,
    publicKey: publicKeyObj.export({ format: "pem", type: "spki" }) as string,
  };
}

/**
 * Signs a payload using an Ed25519 private key.
 *
 * @param payload - The message to sign (UTF-8 encoded)
 * @param privateKeyPem - PEM-encoded PKCS#8 private key
 * @returns Hex-encoded signature
 */
export function signPayload(payload: string, privateKeyPem: string): string {
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKeyPem,
    format: "pem",
    type: "pkcs8",
  });
  return crypto.sign(null, Buffer.from(payload, "utf8"), privateKeyObj).toString("hex");
}

/**
 * Verifies an Ed25519 signature against a payload and public key.
 *
 * @param payload - The original message (UTF-8 encoded)
 * @param signatureHex - Hex-encoded signature
 * @param publicKeyPem - PEM-encoded SPKI public key
 * @returns true if signature is valid
 */
export function verifySignature(payload: string, signatureHex: string, publicKeyPem: string): boolean {
  const publicKeyObj = crypto.createPublicKey({
    key: publicKeyPem,
    format: "pem",
    type: "spki",
  });
  return crypto.verify(null, Buffer.from(payload, "utf8"), publicKeyObj, Buffer.from(signatureHex, "hex"));
}

/**
 * Derives the root keypair for a user (convenience wrapper).
 *
 * @param piUid - The user's Pi Network UID
 * @param salt - HMAC key material
 * @returns PEM-encoded keypair
 */
export function deriveUserRootKey(piUid: string, salt: string): Keypair {
  return deriveKeypair(piUid, ROOT_AGENT_ID, salt);
}
