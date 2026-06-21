// TTL-based revocation store — tokens evict after 24 hours
const REVOKED_TOKENS_TTL_MS = 24 * 60 * 60 * 1000;
const revokedTokens = new Map<string, number>();

// Cleanup expired entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, expiresAt] of revokedTokens) {
      if (expiresAt < now) {
        revokedTokens.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

export function revokeToken(token: string): void {
  revokedTokens.set(token, Date.now() + REVOKED_TOKENS_TTL_MS);
}

export function isTokenRevoked(token: string): boolean {
  const expiresAt = revokedTokens.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    revokedTokens.delete(token);
    return false;
  }
  return true;
}
