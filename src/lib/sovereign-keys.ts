import crypto from "crypto";

/**
 * Server-only sovereign agent key utilities.
 *
 * These functions use the Node.js `crypto` module and MUST only be imported
 * from server-side code (API routes / Server Components). They live in their
 * own module — separate from `pi-sdk.ts`, which is imported by client
 * components — so the Node `crypto` dependency is never pulled into the
 * client bundle.
 */
export function deriveSovereignAgentKeypair(stellarAddress: string, agentId: string): { publicKey: string; privateKey: string } {
  const salt = process.env.SOVEREIGN_KEY_SALT || (process.env.NODE_ENV === "production" ? undefined : "development_fallback_salt_3f43ec47");
  if (!salt) {
    throw new Error("SOVEREIGN_KEY_SALT is not configured in production environment");
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
    type: "pkcs8"
  });

  const publicKeyObj = crypto.createPublicKey(privateKeyObj);

  return {
    privateKey: privateKeyObj.export({ format: "pem", type: "pkcs8" }) as string,
    publicKey: publicKeyObj.export({ format: "pem", type: "spki" }) as string
  };
}

export function signPayloadWithAgentKey(payload: string, privateKeyPem: string): string {
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKeyPem,
    format: "pem",
    type: "pkcs8"
  });
  return crypto.sign(null, Buffer.from(payload, "utf8"), privateKeyObj).toString("hex");
}

export function verifyAgentSignature(payload: string, signatureHex: string, publicKeyPem: string): boolean {
  const publicKeyObj = crypto.createPublicKey({
    key: publicKeyPem,
    format: "pem",
    type: "spki"
  });
  return crypto.verify(null, Buffer.from(payload, "utf8"), publicKeyObj, Buffer.from(signatureHex, "hex"));
}
