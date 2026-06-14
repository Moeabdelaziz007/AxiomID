import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/errors";
import { OrderCreateSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = OrderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  const { skillId, agentId, amount, paymentId } = parsed.data;

  // Check skill
  const skill = await prisma.skill.findUnique({ where: { id: skillId } });
  if (!skill) return apiError("NOT_FOUND", "Skill not found");

  // Create escrow payment
  const payment = await prisma.piPayment.create({
    data: {
      userId: auth.user.id,
      amount,
      paymentId,
      metadata: JSON.stringify({ skillId, agentId, purpose: "marketplace_purchase" }),
      status: "ESCROWED",
    },
  });

  return apiSuccess({ paymentId: payment.id });
}
