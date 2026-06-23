import { deriveKeypair, signPayload, verifySignature, ROOT_AGENT_ID } from "@axiomid/crypto";

export { ROOT_AGENT_ID };

/**
 * Deterministically derives an agent keypair from a Stellar address and agent ID.
 *
 * @param stellarAddress - A Stellar blockchain address
 * @param agentId - An agent identifier string
 * @returns An object containing the PEM-encoded public and private keys
 * @throws If `SOVEREIGN_KEY_SALT` is not configured in production environment
 */
export function deriveSovereignAgentKeypair(stellarAddress: string, agentId: string): { publicKey: string; privateKey: string } {
  const salt = process.env.SOVEREIGN_KEY_SALT || (process.env.NODE_ENV === "production" ? undefined : "development_fallback_salt_3f43ec47");
  if (!salt) {
    throw new Error("SOVEREIGN_KEY_SALT is not configured");
  }
  return deriveKeypair(stellarAddress, agentId, salt);
}

/**
 * Signs a payload using the provided private key.
 *
 * @param payload - The message to be signed
 * @param privateKeyPem - The private key in PEM/PKCS#8 format
 * @returns The signature as a hexadecimal-encoded string
 */
export function signPayloadWithAgentKey(payload: string, privateKeyPem: string): string {
  return signPayload(payload, privateKeyPem);
}

/**
 * Derives the root keypair for a user.
 *
 * @param piUid - The user identifier
 * @returns The derived root keypair containing public and private keys as PEM-encoded strings
 * @throws If `SOVEREIGN_KEY_SALT` is not configured in a production environment
 */
export function deriveUserRootKey(piUid: string): { publicKey: string; privateKey: string } {
  const salt = process.env.SOVEREIGN_KEY_SALT || (process.env.NODE_ENV === "production" ? undefined : "development_fallback_salt_3f43ec47");
  if (!salt) {
    throw new Error("SOVEREIGN_KEY_SALT is not configured");
  }
  return deriveKeypair(piUid, ROOT_AGENT_ID, salt);
}

/**
 * Verifies that a signature is valid for a payload.
 *
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifyAgentSignature(payload: string, signatureHex: string, publicKeyPem: string): boolean {
  return verifySignature(payload, signatureHex, publicKeyPem);
}
