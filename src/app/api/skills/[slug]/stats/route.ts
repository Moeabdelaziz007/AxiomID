import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { SlugParamSchema } from '@/lib/validators';

/**
 * GET /api/skills/[slug]/stats — Get execution statistics for a skill.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const parsedParams = SlugParamSchema.safeParse({ slug });
  if (!parsedParams.success) {
    return apiError('VALIDATION_ERROR', parsedParams.error.issues[0].message, parsedParams.error.issues);
  }

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`skill-stats:${ip}`, RATE_LIMITS.anonymous);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  try {
    const skill = await prisma.skill.findUnique({ where: { slug } });
    if (!skill) {
      return apiError('NOT_FOUND', `Skill "${slug}" not found`);
    }

    const [totalExecutions, successfulExecutions, avgDuration] = await Promise.all([
      prisma.skillExecution.count({ where: { skillId: skill.id } }),
      prisma.skillExecution.count({ where: { skillId: skill.id, success: true } }),
      prisma.skillExecution.aggregate({
        where: { skillId: skill.id, durationMs: { not: null } },
        _avg: { durationMs: true },
      }),
    ]);

    const successRate = totalExecutions > 0
      ? Math.round((successfulExecutions / totalExecutions) * 10000) / 100
      : 0;

    return apiSuccess({
      totalExecutions,
      successfulExecutions,
      failedExecutions: totalExecutions - successfulExecutions,
      successRate,
      avgDurationMs: avgDuration._avg.durationMs
        ? Math.round(avgDuration._avg.durationMs)
        : null,
    });
  } catch (error) {
    logger.error('[SKILL-STATS] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch skill stats');
  }
}
