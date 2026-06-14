import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { rating, review } = await req.json();
  const { slug } = await params;

  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill) return apiError("NOT_FOUND", "Skill not found");

  const skillReview = await prisma.skillReview.create({
    data: {
      skillId: skill.id,
      userId: auth.user.id,
      rating,
      review,
    },
  });

  return apiSuccess(skillReview, 201);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill) return apiError("NOT_FOUND", "Skill not found");

  const reviews = await prisma.skillReview.findMany({
    where: { skillId: skill.id },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(reviews);
}
