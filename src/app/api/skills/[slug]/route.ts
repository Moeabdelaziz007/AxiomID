import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { SlugParamSchema, SkillUpdateSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth-middleware';

/**
 * GET /api/skills/[slug] — Get full skill detail including manifest, agent script, and tests.
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
  const rateLimit = await checkRateLimit(`skill-detail:${ip}`, RATE_LIMITS.anonymous);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  try {
    const skill = await prisma.skill.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { installations: true, reviews: true },
        },
      },
    });

    if (!skill) {
      return apiError('NOT_FOUND', `Skill "${slug}" not found`);
    }

    return apiSuccess({
      id: skill.id,
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      manifestMd: skill.manifestMd,
      agentScript: skill.agentScript,
      testSuite: skill.testSuite,
      tier: skill.tier,
      pricePi: skill.pricePi,
      version: skill.version,
      status: skill.status,
      isPublished: skill.isPublished,
      installCount: skill.installCount,
      avgRating: skill.avgRating,
      ratingCount: skill.ratingCount,
      installationCount: skill._count.installations,
      reviewCount: skill._count.reviews,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
    });
  } catch (error) {
    logger.error('[SKILL-DETAIL] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch skill');
  }
}

/**
 * PATCH /api/skills/[slug] — Update skill metadata, manifest, or script.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const parsedParams = SlugParamSchema.safeParse({ slug });
  if (!parsedParams.success) {
    return apiError('VALIDATION_ERROR', parsedParams.error.issues[0].message, parsedParams.error.issues);
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`skill-update:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const parsedBody = SkillUpdateSchema.safeParse(body);
  if (!parsedBody.success) {
    return apiError('VALIDATION_ERROR', parsedBody.error.issues[0].message, parsedBody.error.issues);
  }

  const { changelog, ...updateData } = parsedBody.data;

  try {
    const existing = await prisma.skill.findUnique({ where: { slug } });
    if (!existing) {
      return apiError('NOT_FOUND', `Skill "${slug}" not found`);
    }

    if (existing.authorId !== auth.user.id) {
      return apiError('FORBIDDEN', 'You can only update your own skills');
    }

    const skill = await prisma.skill.update({
      where: { slug },
      data: updateData,
    });

    // Auto-create version snapshot when content-affecting fields change
    const contentChanged =
      (updateData.version && updateData.version !== existing.version) ||
      (updateData.manifestMd && updateData.manifestMd !== existing.manifestMd) ||
      (updateData.agentScript !== undefined && updateData.agentScript !== existing.agentScript) ||
      (updateData.testSuite !== undefined && updateData.testSuite !== existing.testSuite);

    if (contentChanged) {
      const newVersion = updateData.version || existing.version;
      try {
        const existingVersion = await prisma.skillVersion.findFirst({
          where: { skillId: existing.id, version: newVersion },
        });

        if (!existingVersion) {
          await prisma.skillVersion.create({
            data: {
              skillId: existing.id,
              version: newVersion,
              manifestMd: (updateData.manifestMd as string) || existing.manifestMd,
              agentScript: (updateData.agentScript as string) ?? existing.agentScript,
              testSuite: (updateData.testSuite as string) ?? existing.testSuite,
              changelog: changelog || null,
              authorId: auth.user.id,
              status: skill.status,
            },
          });
        }
      } catch (versionError) {
        logger.error('[SKILL-UPDATE] Failed to create version snapshot:', versionError);
      }
    }

    return apiSuccess({
      slug: skill.slug,
      name: skill.name,
      tier: skill.tier,
      version: skill.version,
      status: skill.status,
      isPublished: skill.isPublished,
    });
  } catch (error) {
    logger.error('[SKILL-UPDATE] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to update skill');
  }
}

/**
 * DELETE /api/skills/[slug] — Remove a skill from the marketplace.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const parsedParams = SlugParamSchema.safeParse({ slug });
  if (!parsedParams.success) {
    return apiError('VALIDATION_ERROR', parsedParams.error.issues[0].message, parsedParams.error.issues);
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`skill-delete:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  try {
    const existing = await prisma.skill.findUnique({ where: { slug } });
    if (!existing) {
      return apiError('NOT_FOUND', `Skill "${slug}" not found`);
    }

    if (existing.authorId !== auth.user.id) {
      return apiError('FORBIDDEN', 'You can only delete your own skills');
    }

    await prisma.skill.delete({ where: { slug } });

    return apiSuccess({ deleted: true, slug });
  } catch (error) {
    logger.error('[SKILL-DELETE] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to delete skill');
  }
}
