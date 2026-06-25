import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';
import { logger } from '@/lib/logger';

/**
 * Initiates a purchase for the skill identified by `slug`.
 *
 * @param params - Route parameters containing the skill slug.
 * @returns A success payload with the created payment ID, amount, and status, or an error response.
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

    const payments = await prisma.piPayment.findMany({
      where: {
        userId: user.id,
        status: { in: ['RELEASED', 'ESCROWED'] },
      },
    });

    let alreadyPaid = false;
    for (const p of payments) {
      let metadata: { skillId?: unknown; purpose?: unknown } = {};
      try {
        metadata = JSON.parse(p.metadata || '{}');
      } catch {
        // Ignore JSON parsing errors
      }

      if (
        metadata.skillId === skill.id &&
        metadata.purpose === 'skill_purchase'
      ) {
        alreadyPaid = true;
        break;
      }
    }

    if (alreadyPaid) {
      return apiError('CONFLICT', 'You have already purchased this skill. Go ahead and install it!');
    }

    // Create a pending payment intent record. The client will fulfill this
    // using the client-side Pi SDK and verify it via /order/create.
    const payment = await prisma.piPayment.create({
      data: {
        userId: user.id,
        paymentId: `pi_${crypto.randomUUID()}`,
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
