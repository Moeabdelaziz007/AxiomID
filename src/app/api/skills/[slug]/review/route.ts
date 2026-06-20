import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { SlugParamSchema, SkillReviewCreateSchema } from "@/lib/validators";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const ip = getClientIp(req);
  const rateLimit = await checkRateLimit(`review:${ip}:${req.nextUrl.pathname}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const { slug } = await params;
  const parsedParams = SlugParamSchema.safeParse({ slug });
  if (!parsedParams.success) {
    return apiError("VALIDATION_ERROR", parsedParams.error.issues[0].message, parsedParams.error.issues);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsedBody = SkillReviewCreateSchema.safeParse(body);
  if (!parsedBody.success) {
    return apiError("VALIDATION_ERROR", parsedBody.error.issues[0].message, parsedBody.error.issues);
  }

  const { rating, review } = parsedBody.data;

  try {
    const skill = await prisma.skill.findUnique({ where: { slug } });
    if (!skill) return apiError("NOT_FOUND", "Skill not found");

    const skillReview = await prisma.skillReview.create({
      data: {
        skillId: skill.id,
        userId: auth.user.id,
        rating,
        review: review || null,
      },
    });

    const aggregation = await prisma.skillReview.aggregate({
      where: { skillId: skill.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.skill.update({
      where: { id: skill.id },
      data: {
        avgRating: aggregation._avg.rating ?? 0,
        ratingCount: aggregation._count.rating,
      },
    });

    return apiSuccess(skillReview, 201);
  } catch (error) {
    logger.error("[REVIEW] Create error:", error);
    return apiError("INTERNAL_ERROR", "Failed to create review");
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const ip = getClientIp(req);
  const rateLimit = await checkRateLimit(`review-get:${ip}:${req.nextUrl.pathname}`, RATE_LIMITS.public);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const { slug } = await params;
  const parsedParams = SlugParamSchema.safeParse({ slug });
  if (!parsedParams.success) {
    return apiError("VALIDATION_ERROR", parsedParams.error.issues[0].message, parsedParams.error.issues);
  }

  try {
    const skill = await prisma.skill.findUnique({ where: { slug } });
    if (!skill) return apiError("NOT_FOUND", "Skill not found");

    const reviews = await prisma.skillReview.findMany({
      where: { skillId: skill.id },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(reviews);
  } catch (error) {
    logger.error("[REVIEW] Fetch error:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch reviews");
  }
}
