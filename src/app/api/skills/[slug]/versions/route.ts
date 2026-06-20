import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { SlugParamSchema } from '@/lib/validators';

/**
 * GET /api/skills/[slug]/versions — List version history for a skill.
 * Versions are append-only; returns list sorted newest first.
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
  const rateLimit = await checkRateLimit(`skill-versions:${ip}`, RATE_LIMITS.anonymous);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  try {
    const skill = await prisma.skill.findUnique({ where: { slug }, select: { id: true } });
    if (!skill) {
      return apiError('NOT_FOUND', `Skill "${slug}" not found`);
    }

    const versions = await prisma.skillVersion.findMany({
      where: { skillId: skill.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        version: true,
        manifestMd: true,
        agentScript: true,
        testSuite: true,
        changelog: true,
        status: true,
        createdAt: true,
      },
    });

    return apiSuccess({
      versions,
      total: versions.length,
    });
  } catch (error) {
    logger.error('[SKILL-VERSIONS] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch skill versions');
  }
}
