import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';

/**
 * Activate the authenticated user's agent if it exists and is not already active.
 *
 * Attempts to activate the agent associated with the request's authenticated user after enforcing rate limits.
 *
 * @returns An API response object: on success contains `agentId`, `publicId`, and `status`; on failure returns an error response with one of the codes `RATE_LIMITED`, `NOT_FOUND`, `CONFLICT`, or `INTERNAL_ERROR` and an explanatory message.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-activate:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const now = new Date();
    const updatedAgents = await prisma.userAgent.updateManyAndReturn({
      where: {
        userId: user.id,
        status: { not: 'ACTIVE' },
      },
      data: {
        status: 'ACTIVE',
        lastActive: now,
        lastHeartbeat: now,
      },
    });


      const updated = updatedAgents[0];
      return apiSuccess({
        agentId: updated.id,
        publicId: updated.publicId,
        status: updated.status,
      });
    }

    // If no records were updated, the agent either doesn't exist or is already ACTIVE.
    // Fallback to fetch to determine the correct error message.
    const agent = await prisma.userAgent.findUnique({ where: { userId: user.id } });
    if (!agent) {
      return apiError('NOT_FOUND', 'No agent found for this user. Create one first via POST /api/agent');
    }

    return apiError('CONFLICT', 'Agent is already active');
  } catch (error) {
    logger.error('[AGENT-ACTIVATE] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to activate agent');
  }
}
