import { encryptToken, getIssuerPrivateKey } from '../../lib/crypto';
import crypto from 'crypto';

describe('crypto.ts', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key in process.env) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  describe('encryptToken', () => {
    it('throws when PI_TOKEN_ENCRYPTION_KEY is not set', () => {
      delete process.env.PI_TOKEN_ENCRYPTION_KEY;
      expect(() => encryptToken('valid-plaintext')).toThrow('PI_TOKEN_ENCRYPTION_KEY not set');
    });

    it('throws when PI_TOKEN_ENCRYPTION_KEY is not 32 bytes (64 hex characters)', () => {
      process.env.PI_TOKEN_ENCRYPTION_KEY = 'invalid-length';
      expect(() => encryptToken('valid-plaintext')).toThrow('PI_TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
    });

    it('throws when plaintext is empty', () => {
      process.env.PI_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      expect(() => encryptToken('')).toThrow(); // Zod validation error
    });

    it('successfully encrypts valid plaintext', () => {
      process.env.PI_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      const plaintext = 'super-secret-token';
      const encrypted = encryptToken(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');

      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBeDefined(); // IV
      expect(parts[1]).toBeDefined(); // AuthTag
      expect(parts[2]).toBeDefined(); // Ciphertext
    });
  });

  describe('getIssuerPrivateKey', () => {
    it('throws when ISSUER_PRIVATE_KEY is not set', () => {
      delete process.env.ISSUER_PRIVATE_KEY;
      expect(() => getIssuerPrivateKey()).toThrow('ISSUER_PRIVATE_KEY not set');
    });

    it('returns EdDSA when key contains Ed25519', () => {
      process.env.ISSUER_PRIVATE_KEY = 'some-Ed25519-key';
      const result = getIssuerPrivateKey();
      expect(result.alg).toBe('EdDSA');
      expect(result.key).toBe('some-Ed25519-key');
    });

    it('returns RS256 when key contains RSA', () => {
      process.env.ISSUER_PRIVATE_KEY = 'some-RSA-key';
      const result = getIssuerPrivateKey();
      expect(result.alg).toBe('RS256');
      expect(result.key).toBe('some-RSA-key');
    });

    it('returns EdDSA as fallback', () => {
      process.env.ISSUER_PRIVATE_KEY = 'some-other-key';
      const result = getIssuerPrivateKey();
      expect(result.alg).toBe('EdDSA');
      expect(result.key).toBe('some-other-key');
    });
  });
});
