import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';
import { logger } from '@/lib/logger';

/**
 * POST /api/skills/[slug]/purchase — Initiate a skill purchase (Pi Payment).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`skill-purchase:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const skill = await prisma.skill.findUnique({ where: { slug } });
    if (!skill) {
      return apiError('NOT_FOUND', `Skill "${slug}" not found`);
    }

    if (skill.pricePi <= 0) {
      return apiError('VALIDATION_ERROR', 'Skill is free. Use /install directly.');
    }

    // TODO: Integrate with Pi Payment SDK (create payment intent and return ID)
    // For now, simulate payment record creation as per marketplace requirement.
    const payment = await prisma.piPayment.create({
      data: {
        userId: user.id,
        paymentId: `pi_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        amount: skill.pricePi,
        memo: `Purchase of ${skill.name}`,
        metadata: JSON.stringify({ skillId: skill.id, purpose: 'skill_purchase' }),
        status: 'PENDING',
      },
    });

    return apiSuccess({
      paymentId: payment.paymentId,
      amount: payment.amount,
      status: payment.status,
    });
  } catch (error) {
    logger.error('[SKILL-PURCHASE] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to initiate purchase');
  }
}
