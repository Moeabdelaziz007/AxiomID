import { Keypair } from "./types";
export declare const ROOT_AGENT_ID = "axiom-root";
/**
 * Deterministically derives an Ed25519 keypair from a Stellar address and agent ID.
 *
 * @param stellarAddress - A Stellar blockchain address
 * @param agentId - An agent identifier string
 * @param salt - HMAC key material (must be SOVEREIGN_KEY_SALT from env)
 * @returns PEM-encoded public and private keys
 * @throws If salt is empty or crypto operations fail
 */
export declare function deriveKeypair(stellarAddress: string, agentId: string, salt: string): Keypair;
/**
 * Signs a payload using an Ed25519 private key.
 *
 * @param payload - The message to sign (UTF-8 encoded)
 * @param privateKeyPem - PEM-encoded PKCS#8 private key
 * @returns Hex-encoded signature
 */
export declare function signPayload(payload: string, privateKeyPem: string): string;
/**
 * Verifies an Ed25519 signature against a payload and public key.
 *
 * @param payload - The original message (UTF-8 encoded)
 * @param signatureHex - Hex-encoded signature
 * @param publicKeyPem - PEM-encoded SPKI public key
 * @returns true if signature is valid
 */
export declare function verifySignature(payload: string, signatureHex: string, publicKeyPem: string): boolean;
/**
 * Derives the root keypair for a user (convenience wrapper).
 *
 * @param piUid - The user's Pi Network UID
 * @param salt - HMAC key material
 * @returns PEM-encoded keypair
 */
export declare function deriveUserRootKey(piUid: string, salt: string): Keypair;
