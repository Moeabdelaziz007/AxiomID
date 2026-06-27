// Default sandbox dev token used in non-production environments when no
// explicit token is configured. It is intentionally well-known (not a secret):
// the sandbox bypass only ever runs outside production, and both the client and
// server must agree on the same value for the dev login flow to work.
const DEFAULT_SANDBOX_DEV_TOKEN = 'sandbox-dev-token-abc-123';

/**
 * Resolves the sandbox dev token on the server.
 *
 * @returns `undefined` in production; otherwise the first available token from `SANDBOX_DEV_TOKEN`, `NEXT_PUBLIC_SANDBOX_DEV_TOKEN`, or the default token.
 */
export function getSandboxDevToken(): string | undefined {
  if (process.env.NODE_ENV === 'production') {
    // SECURITY: Never return sandbox tokens in production.
    // Even if SANDBOX_DEV_TOKEN is set, this function returns undefined.
    // The auth-middleware.ts also has an explicit production guard as a second layer.
    return undefined;
  }
  return (
    process.env.SANDBOX_DEV_TOKEN ||
    process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN ||
    DEFAULT_SANDBOX_DEV_TOKEN
  );
}

/**
 * Gets the client-side sandbox dev token.
 *
 * @returns The value of `NEXT_PUBLIC_SANDBOX_DEV_TOKEN` when set, otherwise `DEFAULT_SANDBOX_DEV_TOKEN`.
 */
export function getClientSandboxDevToken(): string {
  return process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN || DEFAULT_SANDBOX_DEV_TOKEN;
}
