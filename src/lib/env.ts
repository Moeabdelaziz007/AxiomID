const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'PI_API_KEY',
  'PI_TOKEN_ENCRYPTION_KEY',
  'OAUTH_STATE_SECRET',
  'ISSUER_PRIVATE_KEY',
  'ISSUER_PUBLIC_KEY',
  'CRON_SECRET',
] as const;

let validated = false;

// Available for manual invocation at startup (e.g., in a route handler or script).
// Not called automatically — the app is designed to boot without validating all env vars.
export function validateEnv(): void {
  if (validated) return;
  if (typeof process === 'undefined' || !process.env) return;

  const missing: string[] = [];
  for (const name of REQUIRED_ENV_VARS) {
    if (!process.env[name]) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join('\n  ')}\n\n` +
      `Set them in your Vercel dashboard or .env file before deploying.`
    );
  }

  validated = true;
}
