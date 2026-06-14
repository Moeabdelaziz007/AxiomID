import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/errors";
import { SlugParamSchema, SkillReviewCreateSchema } from "@/lib/validators";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

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

  return apiSuccess(skillReview, 201);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsedParams = SlugParamSchema.safeParse({ slug });
  if (!parsedParams.success) {
    return apiError("VALIDATION_ERROR", parsedParams.error.issues[0].message, parsedParams.error.issues);
  }

  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill) return apiError("NOT_FOUND", "Skill not found");

  const reviews = await prisma.skillReview.findMany({
    where: { skillId: skill.id },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(reviews);
}
