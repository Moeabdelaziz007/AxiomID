import { logger } from '@/lib/logger';
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { OrderCreateSchema } from "@/lib/validators";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";

/**
 * Creates an escrow payment for a marketplace order.
 *
 * Verifies the payment with Pi Network and ensures the payer is the authenticated user
 * and the payment amount matches the skill price. Free skills skip Pi Network verification.
 * Enforces rate limiting per client IP.
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

  const { skillId, agentId, paymentId } = parsed.data;

  // 1. Check skill exists and get server-side price
  const skill = await prisma.skill.findUnique({
    where: { id: skillId },
    select: { id: true, pricePi: true, name: true, status: true },
  });
  if (!skill) return apiError("NOT_FOUND", "Skill not found");
  if (skill.status !== "PUBLISHED") return apiError("CONFLICT", "Skill is not available for purchase");

  // 2. Free skills — skip Pi verification
  if (skill.pricePi === 0) {
    const payment = await prisma.piPayment.create({
      data: {
        userId: auth.user.id,
        amount: 0,
        paymentId: `free-${paymentId}`,
        metadata: JSON.stringify({ skillId, agentId, purpose: "marketplace_purchase", skillName: skill.name }),
        status: "ESCROWED",
        network: "pi",
      },
    });
    return apiSuccess({ paymentId: payment.id, amount: 0 });
  }

  // 3. Verify payment against Pi Network API
  const PI_API_KEY = process.env.PI_API_KEY;
  if (!PI_API_KEY) {
    logger.error("[ORDER-CREATE] PI_API_KEY not configured");
    return apiError("INTERNAL_ERROR", "Payment system not configured");
  }

  try {
    const piResponse = await fetch("https://api.minepi.com/v2/payments/" + encodeURIComponent(paymentId), {
      method: "GET",
      headers: { Authorization: `Key ${PI_API_KEY}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!piResponse.ok) {
      logger.error("[ORDER-CREATE] Pi API verification failed:", piResponse.status);
      return apiError("PAYMENT_VERIFICATION_FAILED", "Payment could not be verified with Pi Network");
    }

    const piPayment = await piResponse.json();

    // 4. Assert payer UID matches authenticated user (IDOR prevention)
    if (!auth.user.piUid || piPayment.user_uid !== auth.user.piUid) {
      return apiError("FORBIDDEN", "Payment payer does not match authenticated user");
    }

    // 5. Assert payment amount matches skill price (prevent price manipulation)
    const paidAmount = typeof piPayment.amount === "number" ? piPayment.amount : 0;
    if (Math.abs(paidAmount - skill.pricePi) > 0.001) {
      logger.warn("[ORDER-CREATE] Amount mismatch:", { expected: skill.pricePi, paid: paidAmount, paymentId });
      return apiError("PAYMENT_MISMATCH", `Payment amount ${paidAmount} does not match skill price ${skill.pricePi}`);
    }

    // 6. Check payment status — must be approved or created (not already completed/cancelled)
    if (piPayment.status !== "approved" && piPayment.status !== "created") {
      return apiError("PAYMENT_INVALID", `Payment status "${piPayment.status}" is not valid for purchase`);
    }

    // 7. Create escrow record
    const payment = await prisma.piPayment.create({
      data: {
        userId: auth.user.id,
        amount: paidAmount,
        paymentId,
        metadata: JSON.stringify({
          skillId,
          agentId,
          purpose: "marketplace_purchase",
          skillName: skill.name,
          piPaymentStatus: piPayment.status,
        }),
        status: "ESCROWED",
        network: "pi",
      },
    });

    return apiSuccess({ paymentId: payment.id, amount: paidAmount });
  } catch (error) {
    logger.error("[ORDER-CREATE] Pi API error:", error);
    return apiError("INTERNAL_ERROR", "Failed to verify payment with Pi Network");
  }
}
