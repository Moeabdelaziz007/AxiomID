/**
 * Resolves the sandbox dev token on the server.
 *
 * SECURITY: Only reads SANDBOX_DEV_TOKEN (server-only env var).
 * No default fallback, no NEXT_PUBLIC_ env var support.
 *
 * @returns `undefined` in production or when SANDBOX_DEV_TOKEN is not set.
 */
export function getSandboxDevToken(): string | undefined {
  if (process.env.NODE_ENV === 'production') {
    return undefined;
  }
  return process.env.SANDBOX_DEV_TOKEN;
}
