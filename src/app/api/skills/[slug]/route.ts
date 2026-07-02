import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { describeManifestIssues, ManifestSchema, SlugParamSchema, SkillUpdateSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth-middleware';

/**
 * Retrieves a skill record by slug with its manifest, agent script, tests, and aggregate counts.
 *
 * @param request - The incoming request
 * @param params - The route parameters containing the skill slug
 * @returns A full skill detail response when the skill exists
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
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        manifestMd: true,
        tier: true,
        pricePi: true,
        version: true,
        status: true,
        installCount: true,
        avgRating: true,
        ratingCount: true,
        authorId: true,
        soulPrinciple: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { installations: true, reviews: true },
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
              }
            }
          }
        }
      },
    });

    if (!skill) {
      return apiError('NOT_FOUND', `Skill "${slug}" not found`);
    }

    let isInstalled = false;
    try {
      const authHeader = request.headers?.get?.('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const auth = await requireAuth(request);
        if (auth.user) {
          const agent = await prisma.userAgent.findUnique({ where: { userId: auth.user.id } });
          if (agent) {
            const installation = await prisma.skillInstallation.findFirst({
              where: { skillId: skill.id, agentId: agent.id, status: 'active' }
            });
            isInstalled = !!installation;
          }
        }
      }
    } catch (err) {
      // Ignore parsing/revocation error to allow public fetch, but log for visibility
      logger.error("[SKILL-DETAIL] isInstalled check failed:", err);
    }

    return apiSuccess({
      id: skill.id,
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      manifestMd: skill.manifestMd,
      tier: skill.tier,
      pricePi: skill.pricePi,
      version: skill.version,
      status: skill.status,
      soulPrinciple: skill.soulPrinciple,
      isPublished: skill.isPublished,
      installCount: skill.installCount,
      avgRating: skill.avgRating,
      ratingCount: skill.ratingCount,
      installationCount: skill._count.installations,
      reviewCount: skill._count.reviews,
      isInstalled,
      tags: skill.tags?.map(t => ({
        id: t.tag.id,
        name: t.tag.name,
        slug: t.tag.slug,
        color: t.tag.color,
      })) || [],
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
    });
  } catch (error) {
    logger.error('[SKILL-DETAIL] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch skill');
  }
}

/**
 * Updates a skill's metadata and validates a provided manifest before saving content changes.
 *
 * Returns the updated skill summary on success or an API error response if the request is invalid, unauthorized, rate-limited, incomplete, or the skill cannot be found.
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

  if (updateData.manifestMd) {
    const manifestResult = ManifestSchema.safeParse(updateData.manifestMd);
    if (!manifestResult.success) {
      const details = describeManifestIssues(updateData.manifestMd);
      return apiError('INCOMPLETE_MANIFEST', details);
    }
  }

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
