"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROOT_AGENT_ID = void 0;
exports.deriveKeypair = deriveKeypair;
exports.signPayload = signPayload;
exports.verifySignature = verifySignature;
exports.deriveUserRootKey = deriveUserRootKey;
const crypto_1 = __importDefault(require("crypto"));
exports.ROOT_AGENT_ID = "axiom-root";
/**
 * Deterministically derives an Ed25519 keypair from a Stellar address and agent ID.
 *
 * @param stellarAddress - A Stellar blockchain address
 * @param agentId - An agent identifier string
 * @param salt - HMAC key material (must be SOVEREIGN_KEY_SALT from env)
 * @returns PEM-encoded public and private keys
 * @throws If salt is empty or crypto operations fail
 */
function deriveKeypair(stellarAddress, agentId, salt) {
    if (!salt) {
        throw new Error("SOVEREIGN_KEY_SALT is required for key derivation");
    }
    const hmac = crypto_1.default.createHmac("sha256", salt);
    hmac.update(stellarAddress);
    hmac.update(agentId);
    const seed = hmac.digest();
    const privateKeyPrefix = Buffer.from("302e020100300506032b657004220420", "hex");
    const pkcs8Key = Buffer.concat([privateKeyPrefix, seed]);
    const privateKeyObj = crypto_1.default.createPrivateKey({
        key: pkcs8Key,
        format: "der",
        type: "pkcs8",
    });
    const publicKeyObj = crypto_1.default.createPublicKey(privateKeyObj);
    return {
        privateKey: privateKeyObj.export({ format: "pem", type: "pkcs8" }),
        publicKey: publicKeyObj.export({ format: "pem", type: "spki" }),
    };
}
/**
 * Signs a payload using an Ed25519 private key.
 *
 * @param payload - The message to sign (UTF-8 encoded)
 * @param privateKeyPem - PEM-encoded PKCS#8 private key
 * @returns Hex-encoded signature
 */
function signPayload(payload, privateKeyPem) {
    const privateKeyObj = crypto_1.default.createPrivateKey({
        key: privateKeyPem,
        format: "pem",
        type: "pkcs8",
    });
    return crypto_1.default.sign(null, Buffer.from(payload, "utf8"), privateKeyObj).toString("hex");
}
/**
 * Verifies an Ed25519 signature against a payload and public key.
 *
 * @param payload - The original message (UTF-8 encoded)
 * @param signatureHex - Hex-encoded signature
 * @param publicKeyPem - PEM-encoded SPKI public key
 * @returns true if signature is valid
 */
function verifySignature(payload, signatureHex, publicKeyPem) {
    const publicKeyObj = crypto_1.default.createPublicKey({
        key: publicKeyPem,
        format: "pem",
        type: "spki",
    });
    return crypto_1.default.verify(null, Buffer.from(payload, "utf8"), publicKeyObj, Buffer.from(signatureHex, "hex"));
}
/**
 * Derives the root keypair for a user (convenience wrapper).
 *
 * @param piUid - The user's Pi Network UID
 * @param salt - HMAC key material
 * @returns PEM-encoded keypair
 */
function deriveUserRootKey(piUid, salt) {
    return deriveKeypair(piUid, exports.ROOT_AGENT_ID, salt);
}
