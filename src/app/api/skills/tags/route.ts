import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';

/**
 * GET /api/skills/tags — List all tags with skill counts.
 * Returns tags sorted by skill count descending.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`skills-tags:${ip}`, RATE_LIMITS.anonymous);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  try {
    const tags = await prisma.skillTag.findMany({
      include: {
        _count: {
          select: { skills: true },
        },
      },
      orderBy: {
        skills: { _count: 'desc' },
      },
    });

    const tagsWithCounts = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description,
      color: tag.color,
      skillCount: tag._count.skills,
      createdAt: tag.createdAt,
    }));

    return apiSuccess({ tags: tagsWithCounts });
  } catch (error) {
    logger.error('[SKILLS-TAGS-LIST] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to list tags');
  }
}