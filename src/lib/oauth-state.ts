import crypto from 'crypto';
import { logger } from './logger';

function getSecret(): string | null {
  return process.env.OAUTH_STATE_SECRET || null;
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Verifies a secure state token and returns the verified wallet address,
 * or null if verification fails or the token has expired.
 */
export function verifyState(stateToken: string): string | null {
  const secret = getSecret();
  try {
    const jsonStr = Buffer.from(stateToken, 'base64url').toString('utf8');
    const envelope = JSON.parse(jsonStr);
    const { payload, signature } = envelope;

    if (!secret) {
      logger.warn('[OAUTH-STATE] OAUTH_STATE_SECRET not set — verification skipped');
      return null;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (!safeEqual(signature, expectedSignature)) {
      logger.warn('[OAUTH-STATE] Signature mismatch — possible tampered state token');
      return null;
    }

    const { walletAddress, expiresAt } = JSON.parse(payload);
    if (Date.now() > expiresAt) {
      logger.warn('[OAUTH-STATE] State token expired for wallet:', walletAddress);
      return null;
    }

    return walletAddress;
  } catch (err) {
    logger.warn('[OAUTH-STATE] Failed to parse state token:', err);
    return null;
  }
}
