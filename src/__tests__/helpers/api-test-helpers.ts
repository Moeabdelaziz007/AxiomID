/* eslint-disable @typescript-eslint/no-explicit-any */

export const DEFAULT_AUTH_USER = {
  id: 'user-1',
  walletAddress: 'pi:testuser',
  piUid: 'pi-uid-1',
  piUsername: 'testuser',
  xp: 0,
  tier: 'Visitor',
};

/**
 * Returns a mock auth error response object that mimics the shape
 * returned by requireAuth when authentication fails.
 */
export function makeAuthError(status = 401, code = 'UNAUTHORIZED') {
  return {
    json: async () => ({ error: code, code }),
    status,
  } as any;
}