import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';
import { KyaClaimSchema } from '@/lib/validators';

/**
 * Process a KYA claim request for an authenticated Pi Network user.
 *
 * Validates rate limits and authentication, parses and validates the request body,
 * updates the user's KYA-related fields in the database, and returns the updated
 * user metadata on success or an API error payload on failure.
 *
 * @param request - The incoming Next.js HTTP request for the POST route
 * @returns A Response containing either an object with `userId`, `walletAddress`, `kycStatus`, `did`, `tier`, and `xp` on success, or an error payload with an API error code and message
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`kya-claim:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.');
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const validation = KyaClaimSchema.safeParse(body);
  if (!validation.success) {
    return apiError('VALIDATION_ERROR', validation.error.issues[0].message);
  }

  const { username } = validation.data;

  try {
    const existing = await prisma.user.findUnique({ where: { piUid: user.piUid } });

    if (!existing) {
      return apiError('NOT_FOUND', 'User must authenticate first via POST /api/auth/pi before claiming KYA');
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        kycStatus: 'PENDING',
        kycProvider: 'pi_network',
        did: existing.did || `did:axiom:${user.piUid}`,
        piUsername: existing.piUsername || username,
      },
    });

    return apiSuccess({
      userId: updated.id,
      walletAddress: updated.walletAddress,
      kycStatus: updated.kycStatus,
      did: updated.did,
      tier: updated.tier,
      xp: updated.xp,
    });
  } catch (error) {
    logger.error('[KYA-CLAIM] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to claim KYA');
  }
}
