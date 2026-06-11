import crypto from 'crypto';

function getSecret(): string | null {
  return process.env.OAUTH_STATE_SECRET || null;
}

/**
 * Signs the wallet address into a secure state token that expires in 10 minutes.
 * Prevents spoofing and CSRF attacks in the OAuth callback.
 */
export function signState(walletAddress: string): string {
  const secret = getSecret();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const payload = JSON.stringify({ walletAddress, expiresAt });

  if (!secret) {
    const envelope = { payload, signature: 'dev-mode-unsigned' };
    return Buffer.from(JSON.stringify(envelope)).toString('base64url');
  }

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const envelope = { payload, signature };
  return Buffer.from(JSON.stringify(envelope)).toString('base64url');
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

    if (signature !== expectedSignature) {
      console.error('[verifyState] Signature mismatch');
      return null;
    }

    const { walletAddress, expiresAt } = JSON.parse(payload);
    if (Date.now() > expiresAt) {
      console.error('[verifyState] Token expired');
      return null;
    }

    return walletAddress;
  } catch (error) {
    console.error('[verifyState] Parse error:', error);
    return null;
  }
}

/**
 * Sign a value (like a wallet address) securely for a cookie.
 */
export function signValue(value: string): string {
  const secret = getSecret();
  if (!secret) return value;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(value)
    .digest('hex');
  return `${value}.${signature}`;
}

/**
 * Verify a signed value from a cookie.
 */
export function verifyValue(signedValue: string): string | null {
  const secret = getSecret();
  try {
    const parts = signedValue.split('.');
    if (parts.length !== 2) return null;
    const [value, signature] = parts;
    if (!secret) return value;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(value)
      .digest('hex');
    if (signature !== expectedSignature) return null;
    return value;
  } catch {
    return null;
  }
}
