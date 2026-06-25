/**
 * Resolves the sandbox dev token on the server.
 *
 * SECURITY: This function is server-only. The sandbox bypass token must be explicitly
 * set via the SANDBOX_DEV_TOKEN environment variable. No default fallback exists.
 * The raw token is never exposed to the client through public env vars or hardcoded values.
 * In production, this always returns undefined regardless of environment variables.
 *
 * @returns `undefined` in production or when SANDBOX_DEV_TOKEN is not set; otherwise the server-side token.
 */
export function getSandboxDevToken(): string | undefined {
  if (process.env.NODE_ENV === 'production') {
    // SECURITY: Never return sandbox tokens in production.
    // Even if SANDBOX_DEV_TOKEN is set, this function returns undefined.
    // The auth-middleware.ts also has an explicit production guard as a second layer.
    return undefined;
  }
  // SECURITY: Only use server-side SANDBOX_DEV_TOKEN environment variable.
  // No NEXT_PUBLIC_ prefix, no hardcoded default fallback.
  // If SANDBOX_DEV_TOKEN is not explicitly set, sandbox bypass will not work.
  return process.env.SANDBOX_DEV_TOKEN;
}
