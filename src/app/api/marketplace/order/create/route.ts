import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { OrderCreateSchema } from "@/lib/validators";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";

export const maxDuration = 30;

/**
 * Creates an escrow payment for a marketplace order.
 *
 * @returns An API response containing the payment ID on success, or an error response if rate-limited, unauthenticated, validation fails, or the skill does not exist.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = await checkRateLimit(`order-create:${ip}`, RATE_LIMITS.payment);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

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
