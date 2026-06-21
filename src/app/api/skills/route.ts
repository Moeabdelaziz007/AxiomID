import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';
import { SkillTier } from '@prisma/client';
import { SkillsListQuerySchema, SkillPublishSchema } from '@/lib/validators';

/**
 * GET /api/skills — List published skills from the Agentic Marketplace.
 * Returns skills filtered by tier, sorted by install count and rating.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`skills-list:${ip}`, RATE_LIMITS.anonymous);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = SkillsListQuerySchema.safeParse({
    tier: searchParams.get('tier') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    tags: searchParams.get('tags') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    minPrice: searchParams.get('minPrice') ?? undefined,
    maxPrice: searchParams.get('maxPrice') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  });

  if (!parsedQuery.success) {
    return apiError('VALIDATION_ERROR', parsedQuery.error.issues[0].message, parsedQuery.error.issues);
  }

  const { tier, q: search, tags, sort, minPrice, maxPrice, limit, offset } = parsedQuery.data;

  try {
    const where: Record<string, unknown> = {
      isPublished: true,
      status: 'PUBLISHED',
    };

    if (tier) {
      where.tier = tier;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tags) {
      const tagSlugs = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagSlugs.length === 1) {
        where.tags = { some: { tag: { slug: tagSlugs[0] } } };
      } else if (tagSlugs.length > 1) {
        where.AND = tagSlugs.map(slug => ({
          tags: { some: { tag: { slug } } },
        }));
      }
    }

    if (minPrice != null || maxPrice != null) {
      const priceFilter: Record<string, number> = {};
      if (minPrice != null) priceFilter.gte = minPrice;
      if (maxPrice != null) priceFilter.lte = maxPrice;
      where.pricePi = priceFilter;
    }

    const orderBy = (() => {
      switch (sort) {
        case 'newest': return [{ createdAt: 'desc' as const }];
        case 'popular': return [{ installCount: 'desc' as const }];
        case 'rating': return [{ avgRating: 'desc' as const }];
        case 'price_asc': return [{ pricePi: 'asc' as const }];
        case 'price_desc': return [{ pricePi: 'desc' as const }];
        default: return [{ installCount: 'desc' as const }, { avgRating: 'desc' as const }];
      }
    })();

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          tier: true,
          pricePi: true,
          version: true,
          installCount: true,
          avgRating: true,
          ratingCount: true,
          authorId: true,
          createdAt: true,
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.skill.count({ where }),
    ]);

    return apiSuccess({
      skills,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    logger.error('[SKILLS-LIST] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to list skills');
  }
}

/**
 * POST /api/skills — Publish a new skill to the Agentic Marketplace.
 * Requires authentication. Creates the skill with manifest, agent script, and test suite.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`skills-create:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const parsed = SkillPublishSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0].message, parsed.error.issues);
  }

  const {
    slug,
    name,
    description,
    manifestMd,
    agentScript,
    testSuite,
    tier,
    pricePi,
    version,
  } = parsed.data;

  try {
    // Check slug uniqueness
    const existing = await prisma.skill.findUnique({ where: { slug } });
    if (existing) {
      return apiError('CONFLICT', `Skill with slug "${slug}" already exists`);
    }

    const skill = await prisma.skill.create({
      data: {
        slug,
        name: name.slice(0, 200),
        description: (description as string)?.slice(0, 1000) || null,
        manifestMd,
        agentScript: (agentScript as string) || null,
        testSuite: (testSuite as string) || null,
        tier: (tier as SkillTier) || 'BASIC_TOOL',
        pricePi: typeof pricePi === 'number' ? pricePi : 0,
        version: (version as string) || '1.0.0',
        status: 'PUBLISHED',
        isPublished: true,
        authorId: user.id,
      },
    });

    return apiSuccess({
      skillId: skill.id,
      slug: skill.slug,
      name: skill.name,
      tier: skill.tier,
      version: skill.version,
      status: skill.status,
    }, 201);
  } catch (error) {
    logger.error('[SKILLS-CREATE] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to create skill');
  }
}
