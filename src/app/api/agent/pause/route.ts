import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';

/**
 * Pauses the authenticated user's active agent.
 *
 * Enforces rate limiting and authentication, updates the user's agent status to `PAUSED`,
 * and returns the updated agent identifiers and status on success.
 *
 * @param request - Incoming Next.js request for the endpoint
 * @returns On success, an `apiSuccess` payload containing `agentId`, `publicId`, and `status`. On failure, an `apiError` with one of the following codes:
 * - `RATE_LIMITED` when the client has exceeded rate limits
 * - `NOT_FOUND` when the user has no agent
 * - `CONFLICT` when the agent is not currently active
 * - `INTERNAL_ERROR` for unexpected server/database failures
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-pause:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.');
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const agent = await prisma.userAgent.findUnique({ where: { userId: user.id } });
    if (!agent) {
      return apiError('NOT_FOUND', 'No agent found for this user');
    }

    if (agent.status !== 'ACTIVE') {
      return apiError('CONFLICT', 'Agent is not currently active');
    }

    const updated = await prisma.userAgent.update({
      where: { id: agent.id },
      data: { status: 'PAUSED' },
    });

    return apiSuccess({
      agentId: updated.id,
      publicId: updated.publicId,
      status: updated.status,
    });
  } catch (error) {
    logger.error('[AGENT-PAUSE] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to pause agent');
  }
}
