import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';

/**
 * Handle GET /status requests and return network metadata and aggregate statistics.
 *
 * Performs client IP-based rate limiting, queries counts and aggregates from the database,
 * and returns a standardized API success payload with network info and stats.
 *
 * @param request - The incoming NextRequest used to determine the client IP for rate limiting
 * @returns An API response object:
 * - On success: a payload containing `network`, `version`, `timestamp`, and `stats` (registeredUsers, totalAgents, activeAgents, totalPayments, totalXpEarned)
 * - On rate limit exceeded: an error response with code `RATE_LIMITED`
 * - On database or internal failure: an error response with code `INTERNAL_ERROR`
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`status:${ip}`, RATE_LIMITS.anonymous);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.');
  }

  try {
    const [userCount, agentCount, activeAgentCount, paymentCount, xpSum] = await Promise.all([
      prisma.user.count(),
      prisma.userAgent.count(),
      prisma.userAgent.count({ where: { status: 'ACTIVE' } }),
      prisma.piPayment.count(),
      prisma.xpLedger.aggregate({ _sum: { amount: true } }),
    ]);

    return apiSuccess({
      network: 'axiomid',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      stats: {
        registeredUsers: userCount,
        totalAgents: agentCount,
        activeAgents: activeAgentCount,
        totalPayments: paymentCount,
        totalXpEarned: xpSum._sum.amount ?? 0,
      },
    });
  } catch (error) {
    logger.error('[STATUS] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch network status');
  }
}
