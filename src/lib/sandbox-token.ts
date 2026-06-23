// Default sandbox dev token used in non-production environments when no
// explicit token is configured. It is intentionally well-known (not a secret):
// the sandbox bypass only ever runs outside production, and both the client and
// server must agree on the same value for the dev login flow to work.
const DEFAULT_SANDBOX_DEV_TOKEN = 'sandbox-dev-token-abc-123';

/**
 * Server-side resolver for the sandbox dev token.
 *
 * Returns `undefined` in production (the sandbox bypass must never be active in
 * production). Outside production it prefers an explicit `SANDBOX_DEV_TOKEN`,
 * then a public `NEXT_PUBLIC_SANDBOX_DEV_TOKEN`, otherwise a well-known default.
 */
export function getSandboxDevToken(): string | undefined {
  if (process.env.NODE_ENV === 'production') return undefined;
  return (
    process.env.SANDBOX_DEV_TOKEN ||
    process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN ||
    DEFAULT_SANDBOX_DEV_TOKEN
  );
}

/**
 * Client-safe resolver for the sandbox dev token. Only reads public env vars
 * so it produces the same value the server's {@link getSandboxDevToken} would
 * resolve to in non-production (when `SANDBOX_DEV_TOKEN` is not set).
 */
export function getClientSandboxDevToken(): string {
  return process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN || DEFAULT_SANDBOX_DEV_TOKEN;
}
