import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

import { z } from 'zod';

const PlaintextSchema = z.string().min(1);
const CiphertextSchema = z.string().min(1);

function getKey(): Buffer {
  const raw = process.env.PI_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('PI_TOKEN_ENCRYPTION_KEY not set');
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new Error('PI_TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  PlaintextSchema.parse(plaintext);
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptToken(ciphertext: string): string {
  CiphertextSchema.parse(ciphertext);
  const key = getKey();
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('decryptToken: ciphertext must be a non-empty string');
  }
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('decryptToken: malformed ciphertext, expected iv:authTag:encrypted');
  }
  const [ivB64, authTagB64, encryptedB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function getIssuerPrivateKey(): { key: string; alg: string } {
  const key = process.env.ISSUER_PRIVATE_KEY;
  if (!key) throw new Error("ISSUER_PRIVATE_KEY not set");
  const alg = key.includes("Ed25519") ? "EdDSA" : key.includes("RSA") ? "RS256" : "EdDSA";
  return { key, alg };
}
