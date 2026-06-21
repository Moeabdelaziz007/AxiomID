import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { SlugParamSchema, SkillTagsUpdateSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth-middleware';

/**
 * GET /api/skills/[slug]/tags — Get tags for a specific skill.
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
  const rateLimit = await checkRateLimit(`skill-tags:${ip}`, RATE_LIMITS.anonymous);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  try {
    const skill = await prisma.skill.findUnique({ where: { slug } });
    if (!skill) {
      return apiError('NOT_FOUND', `Skill "${slug}" not found`);
    }

    const relations = await prisma.skillTagRelation.findMany({
      where: { skillId: skill.id },
      include: { tag: true },
    });

    const tags = relations.map((r) => ({
      id: r.tag.id,
      name: r.tag.name,
      slug: r.tag.slug,
      description: r.tag.description,
      color: r.tag.color,
    }));

    return apiSuccess({ tags });
  } catch (error) {
    logger.error('[SKILL-TAGS-GET] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch skill tags');
  }
}

/**
 * PUT /api/skills/[slug]/tags — Replace tags for a skill.
 * Requires authentication. Only skill author can update tags.
 * Creates tags if they don't exist (slug auto-generated from name).
 * Max 10 tags per skill.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const parsedParams = SlugParamSchema.safeParse({ slug });
  if (!parsedParams.success) {
    return apiError('VALIDATION_ERROR', parsedParams.error.issues[0].message, parsedParams.error.issues);
  }

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`skill-tags-update:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const parsedBody = SkillTagsUpdateSchema.safeParse(body);
  if (!parsedBody.success) {
    return apiError('VALIDATION_ERROR', parsedBody.error.issues[0].message, parsedBody.error.issues);
  }

  const { tags: tagNames } = parsedBody.data;

  try {
    const skill = await prisma.skill.findUnique({ where: { slug } });
    if (!skill) {
      return apiError('NOT_FOUND', `Skill "${slug}" not found`);
    }

    if (skill.authorId !== auth.user.id) {
      return apiError('FORBIDDEN', 'You can only update tags for your own skills');
    }

    // Remove existing tags
    await prisma.skillTagRelation.deleteMany({ where: { skillId: skill.id } });

    // Create or reuse tags and link them
    const tagLinks: { skillId: string; tagId: string }[] = [];
    for (const name of tagNames) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      const slugified = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

      let tag = await prisma.skillTag.findUnique({ where: { slug: slugified } });
      if (!tag) {
        tag = await prisma.skillTag.create({
          data: { name: trimmed, slug: slugified },
        });
      }
      tagLinks.push({ skillId: skill.id, tagId: tag.id });
    }

    if (tagLinks.length > 0) {
      await prisma.skillTagRelation.createMany({ data: tagLinks });
    }

    return apiSuccess({ success: true, tagCount: tagLinks.length });
  } catch (error) {
    logger.error('[SKILL-TAGS-UPDATE] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to update skill tags');
  }
}