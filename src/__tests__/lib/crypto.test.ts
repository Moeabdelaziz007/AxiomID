import { encryptToken, getIssuerPrivateKey } from '../../lib/crypto';
import crypto from 'crypto';

describe('crypto.ts', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
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

    it('Zod validation runs before key validation — empty plaintext throws ZodError even when key is missing', () => {
      delete process.env.PI_TOKEN_ENCRYPTION_KEY;
      // ZodError is thrown (not "PI_TOKEN_ENCRYPTION_KEY not set") because Zod parse happens first
      expect(() => encryptToken('')).toThrow();
      try {
        encryptToken('');
      } catch (e: unknown) {
        expect((e as Error).message).not.toBe('PI_TOKEN_ENCRYPTION_KEY not set');
      }
    });

    it('wraps key errors in "Token encryption failed:" message', () => {
      // empty string key is falsy → getKey throws inside try/catch → wrapped
      process.env.PI_TOKEN_ENCRYPTION_KEY = '';
      expect(() => encryptToken('valid-plaintext')).toThrow('Token encryption failed: PI_TOKEN_ENCRYPTION_KEY not set');
    });

    it('wraps wrong-length key error in "Token encryption failed:" message', () => {
      // 63-char hex string → Buffer.from decodes to 31 bytes (Buffer truncates odd nibble)
      process.env.PI_TOKEN_ENCRYPTION_KEY = 'a'.repeat(63);
      expect(() => encryptToken('valid-plaintext')).toThrow('Token encryption failed: PI_TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
    });

    it('outputs IV as base64-encoded 12-byte value (16 base64 characters)', () => {
      process.env.PI_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      const encrypted = encryptToken('test-payload');
      const ivBase64 = encrypted.split(':')[0];
      const ivBytes = Buffer.from(ivBase64, 'base64');
      expect(ivBytes.length).toBe(12);
    });

    it('outputs AuthTag as base64-encoded 16-byte value (24 base64 characters)', () => {
      process.env.PI_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      const encrypted = encryptToken('test-payload');
      const authTagBase64 = encrypted.split(':')[1];
      const authTagBytes = Buffer.from(authTagBase64, 'base64');
      expect(authTagBytes.length).toBe(16);
    });

    it('produces unique ciphertext on repeated calls (random IV)', () => {
      process.env.PI_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      const plaintext = 'same-plaintext';
      const first = encryptToken(plaintext);
      const second = encryptToken(plaintext);
      expect(first).not.toBe(second);
    });

    it('all three output parts are valid base64 strings', () => {
      process.env.PI_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      const encrypted = encryptToken('some-token-value');
      const [iv, authTag, ciphertext] = encrypted.split(':');
      const base64Re = /^[A-Za-z0-9+/]*={0,2}$/;
      expect(iv).toMatch(base64Re);
      expect(authTag).toMatch(base64Re);
      expect(ciphertext).toMatch(base64Re);
    });

    it('whitespace-only plaintext passes Zod validation and encrypts successfully', () => {
      process.env.PI_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      // Zod min(1) only requires length >= 1; a single space satisfies it
      expect(() => encryptToken('   ')).not.toThrow();
      const result = encryptToken('   ');
      expect(result.split(':')).toHaveLength(3);
    });

    it('encrypts a long plaintext without error', () => {
      process.env.PI_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      const longPlaintext = 'x'.repeat(10_000);
      const encrypted = encryptToken(longPlaintext);
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      // Ciphertext for 10000 bytes should be non-trivial in base64
      expect(Buffer.from(parts[2], 'base64').length).toBe(10_000);
    });

    it('PI_TOKEN_ENCRYPTION_KEY with exactly 63 valid hex chars throws wrong-length error', () => {
      // 63 lowercase hex chars → Buffer.from ignores the trailing incomplete nibble → 31 bytes
      process.env.PI_TOKEN_ENCRYPTION_KEY = '0'.repeat(62) + 'f'; // 63 chars
      expect(() => encryptToken('some-token')).toThrow('Token encryption failed: PI_TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
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

    it('throws when ISSUER_PRIVATE_KEY is an empty string (falsy)', () => {
      process.env.ISSUER_PRIVATE_KEY = '';
      expect(() => getIssuerPrivateKey()).toThrow('ISSUER_PRIVATE_KEY not set');
    });

    it('Ed25519 check takes priority over RSA when both substrings appear', () => {
      // Ed25519 is checked first in the ternary, so it wins
      process.env.ISSUER_PRIVATE_KEY = 'BEGIN-Ed25519-RSA-PRIVATE-KEY';
      const result = getIssuerPrivateKey();
      expect(result.alg).toBe('EdDSA');
    });

    it('is case-sensitive: lowercase "ed25519" does not match EdDSA branch', () => {
      process.env.ISSUER_PRIVATE_KEY = 'some-ed25519-key-lowercase';
      const result = getIssuerPrivateKey();
      // lowercase does not match "Ed25519" → falls through to fallback EdDSA
      expect(result.alg).toBe('EdDSA');
      expect(result.key).toBe('some-ed25519-key-lowercase');
    });

    it('is case-sensitive: lowercase "rsa" does not match RS256 branch', () => {
      process.env.ISSUER_PRIVATE_KEY = 'some-rsa-key-lowercase';
      const result = getIssuerPrivateKey();
      // lowercase "rsa" does not match "RSA" → falls to EdDSA fallback
      expect(result.alg).toBe('EdDSA');
    });

    it('returned object has exactly key and alg properties', () => {
      process.env.ISSUER_PRIVATE_KEY = 'some-RSA-key';
      const result = getIssuerPrivateKey();
      expect(Object.keys(result).sort()).toEqual(['alg', 'key']);
    });

    it('returned key value exactly matches the env var string', () => {
      const keyValue = '-----BEGIN RSA PRIVATE KEY-----\nMIIEow...';
      process.env.ISSUER_PRIVATE_KEY = keyValue;
      const result = getIssuerPrivateKey();
      expect(result.key).toBe(keyValue);
      expect(result.alg).toBe('RS256');
    });
  });
});
