/**
 * @jest-environment node
 */

// NOTE: validateEnv() uses a module-level `validated` flag, so each test that
// needs a fresh module state uses jest.isolateModules() to get a clean copy.

const ALL_REQUIRED = [
  'DATABASE_URL',
  'PI_API_KEY',
  'PI_TOKEN_ENCRYPTION_KEY',
  'OAUTH_STATE_SECRET',
  'ISSUER_PRIVATE_KEY',
  'ISSUER_PUBLIC_KEY',
] as const;

function setAllEnvVars() {
  process.env.DATABASE_URL = 'postgresql://test';
  process.env.PI_API_KEY = 'test-pi-key';
  process.env.PI_TOKEN_ENCRYPTION_KEY = 'test-encryption-key';
  process.env.OAUTH_STATE_SECRET = 'test-oauth-secret';
  process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';
  process.env.ISSUER_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----';
}

function clearAllEnvVars() {
  for (const name of ALL_REQUIRED) {
    delete process.env[name];
  }
}

describe('validateEnv', () => {
  afterEach(() => {
    clearAllEnvVars();
  });

  it('does not throw when all required env vars are set', () => {
    setAllEnvVars();
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { validateEnv } = require('@/lib/env');
      expect(() => validateEnv()).not.toThrow();
    });
  });

  it('throws when DATABASE_URL is missing', () => {
    setAllEnvVars();
    delete process.env.DATABASE_URL;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { validateEnv } = require('@/lib/env');
      expect(() => validateEnv()).toThrow(/DATABASE_URL/);
    });
  });

  it('throws when PI_API_KEY is missing', () => {
    setAllEnvVars();
    delete process.env.PI_API_KEY;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { validateEnv } = require('@/lib/env');
      expect(() => validateEnv()).toThrow(/PI_API_KEY/);
    });
  });

  it('throws when multiple env vars are missing and error lists all of them', () => {
    clearAllEnvVars();
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { validateEnv } = require('@/lib/env');
      let errorMessage = '';
      try {
        validateEnv();
      } catch (e) {
        errorMessage = (e as Error).message;
      }
      for (const name of ALL_REQUIRED) {
        expect(errorMessage).toContain(name);
      }
    });
  });

  it('error message mentions Vercel dashboard and .env file', () => {
    clearAllEnvVars();
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { validateEnv } = require('@/lib/env');
      expect(() => validateEnv()).toThrow(/Vercel dashboard/);
    });
  });

  it('does not run validation twice — second call is a no-op after success', () => {
    setAllEnvVars();
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { validateEnv } = require('@/lib/env');
      expect(() => validateEnv()).not.toThrow();

      // Remove env vars after first successful call
      clearAllEnvVars();

      // Second call should be a no-op (validated flag is set)
      expect(() => validateEnv()).not.toThrow();
    });
  });

  it('returns undefined (void) on success', () => {
    setAllEnvVars();
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { validateEnv } = require('@/lib/env');
      const result = validateEnv();
      expect(result).toBeUndefined();
    });
  });

  it('throws when ISSUER_PRIVATE_KEY is missing', () => {
    setAllEnvVars();
    delete process.env.ISSUER_PRIVATE_KEY;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { validateEnv } = require('@/lib/env');
      expect(() => validateEnv()).toThrow(/ISSUER_PRIVATE_KEY/);
    });
  });

  it('throws when ISSUER_PUBLIC_KEY is missing', () => {
    setAllEnvVars();
    delete process.env.ISSUER_PUBLIC_KEY;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { validateEnv } = require('@/lib/env');
      expect(() => validateEnv()).toThrow(/ISSUER_PUBLIC_KEY/);
    });
  });
});