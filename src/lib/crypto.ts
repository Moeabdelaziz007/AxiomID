import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

import { z } from 'zod';

const PlaintextSchema = z.string().min(1);

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
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  } catch (error) {
    throw new Error(`Token encryption failed: ${(error as Error).message}`);
  }
}


export function getIssuerPrivateKey(): { key: string; alg: string } {
  const key = process.env.ISSUER_PRIVATE_KEY;
  if (!key) throw new Error("ISSUER_PRIVATE_KEY not set");
  const alg = key.includes("Ed25519") ? "EdDSA" : key.includes("RSA") ? "RS256" : "EdDSA";
  return { key, alg };
}
