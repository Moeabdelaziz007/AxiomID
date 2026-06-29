import crypto from 'crypto';
import { verifyState } from '@/lib/oauth-state';

describe('verifyState', () => {
  const secret = 'test-secret';
  let originalSecret: string | undefined;

  beforeAll(() => {
    originalSecret = process.env.OAUTH_STATE_SECRET;
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.OAUTH_STATE_SECRET;
    } else {
      process.env.OAUTH_STATE_SECRET = originalSecret;
    }
  });

  beforeEach(() => {
    process.env.OAUTH_STATE_SECRET = secret;
  });

  function createToken(payload: any, signSecret: string = secret, customSignature?: string): string {
    const payloadStr = JSON.stringify(payload);
    const signature = customSignature !== undefined
      ? customSignature
      : crypto
          .createHmac('sha256', signSecret)
          .update(payloadStr)
          .digest('hex');
    const envelope = { payload: payloadStr, signature };
    return Buffer.from(JSON.stringify(envelope)).toString('base64url');
  }

  it('should return walletAddress for a valid token', () => {
    const token = createToken({
      walletAddress: '0x123',
      expiresAt: Date.now() + 10000,
    });
    expect(verifyState(token)).toBe('0x123');
  });

  it('should return null if OAUTH_STATE_SECRET is not set', () => {
    delete process.env.OAUTH_STATE_SECRET;
    const token = createToken({
      walletAddress: '0x123',
      expiresAt: Date.now() + 10000,
    });
    expect(verifyState(token)).toBeNull();
  });

  it('should return null if token is expired (with walletAddress)', () => {
    const token = createToken({
      walletAddress: '0x123',
      expiresAt: Date.now() - 10000,
    });
    expect(verifyState(token)).toBeNull();
  });

  it('should return null if token is expired (without walletAddress)', () => {
    const token = createToken({
      expiresAt: Date.now() - 10000,
    });
    expect(verifyState(token)).toBeNull();
  });

  it('should return null if signature is invalid', () => {
    const token = createToken({
      walletAddress: '0x123',
      expiresAt: Date.now() + 10000,
    }, 'wrong-secret');
    expect(verifyState(token)).toBeNull();
  });

  it('should return null if signature length is different (safeEqual check)', () => {
    const token = createToken({
      walletAddress: '0x123',
      expiresAt: Date.now() + 10000,
    }, secret, 'tooshort');
    expect(verifyState(token)).toBeNull();
  });


  it('should return null if signature is intentionally corrupted (same length)', () => {
    const payload = {
      walletAddress: '0x123',
      expiresAt: Date.now() + 10000,
    };
    const payloadStr = JSON.stringify(payload);
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadStr)
      .digest('hex');

    // Corrupt the signature by changing the first character, keeping the same length
    const corruptedSignature = (validSignature[0] === 'a' ? 'b' : 'a') + validSignature.slice(1);

    const token = createToken(payload, secret, corruptedSignature);
    expect(verifyState(token)).toBeNull();
  });

  it('should return null for malformed token', () => {
    expect(verifyState('not-a-token')).toBeNull();
  });
});
