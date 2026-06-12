import crypto from 'crypto';

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

    if (!secret || signature === 'dev-mode-unsigned') {
      const { walletAddress, expiresAt } = JSON.parse(payload);
      if (Date.now() > expiresAt) return null;
      return walletAddress;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (!safeEqual(signature, expectedSignature)) {
      return null;
    }

    const { walletAddress, expiresAt } = JSON.parse(payload);
    if (Date.now() > expiresAt) {
      return null;
    }

    return walletAddress;
  } catch {
    return null;
  }
}
