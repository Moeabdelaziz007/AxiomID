import { logger } from '@/lib/logger';

export interface PiKycResult {
  uid: string;
  kycVerified: boolean;
  walletAddress: string | null;
  username: string | null;
}

/**
 * Verifies a user's Pi KYC status server-side by calling Pi API.
 *
 * @param piAccessToken - The user's Pi access token from Pi SDK authenticate()
 * @returns PiKycResult with KYC status and user info
 * @throws If Pi API returns error or network fails
 */
export async function verifyKycServerSide(piAccessToken: string): Promise<PiKycResult> {
  // ponytail: GET /v2/me only needs the user's Bearer token (Pi SDK authenticate() result).
  // PI_API_KEY is for server-to-server payment endpoints (/v2/payments/...) — not needed here.

  const response = await fetch('https://api.minepi.com/v2/me', {
    headers: { Authorization: `Bearer ${piAccessToken}` },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'unable to read body');
    logger.error(`[PI-KYC] Pi API returned ${response.status}: ${body}`);
    throw new Error(`Pi API verification failed: ${response.status}`);
  }

  const data = await response.json() as {
    uid: string;
    kyc_verified: boolean;
    wallet?: { address: string };
    username?: string;
  };

  return {
    uid: data.uid,
    kycVerified: data.kyc_verified === true,
    walletAddress: data.wallet?.address ?? null,
    username: data.username ?? null,
  };
}
