const revokedTokens = new Set<string>();

/**
 * Checks whether a token has been revoked.
 *
 * @param token - The token to check
 * @returns `true` if the token has been revoked, `false` otherwise
 */
export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}

/**
 * Revokes a token.
 *
 * @param token - The token to revoke
 */
export function revokeToken(token: string): void {
  revokedTokens.add(token);
}
