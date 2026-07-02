import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { SlugParamSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth-middleware';

/**
 * POST /api/skills/[slug]/pay — Verify Pi payment for a paid skill.
 * Returns 402 Payment Required if skill has a price and payment is not verified.
 *
 * x402 pattern: client pays via Pi SDK, then calls this endpoint with the payment ID
 * to verify and grant access.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const parsedParams = SlugParamSchema.safeParse({ slug });
  if (!parsedParams.success) {
    return apiError('VALIDATION_ERROR', parsedParams.error.issues[0].message, parsedParams.error.issues);
  }

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`skill-pay:${ip}`, RATE_LIMITS.authenticated);
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

  const { paymentId } = body as { paymentId?: string };

  try {
    const skill = await prisma.skill.findUnique({ where: { slug } });
    if (!skill) {
      return apiError('NOT_FOUND', `Skill "${slug}" not found`);
    }

    // Free skills don't need payment
    if (skill.pricePi === 0) {
      return apiSuccess({ access: 'granted', reason: 'free_skill' });
    }

    // If no paymentId provided, return 402 with payment details
    if (!paymentId) {
      return apiSuccess({
        status: 402,
        message: 'Payment required',
        pricePi: skill.pricePi,
        slug: skill.slug,
        name: skill.name,
      }, 402);
    }

    // Verify payment exists and is valid
    const payment = await prisma.piPayment.findFirst({
      where: {
        paymentId: paymentId,
        status: 'RELEASED',
      },
    });

    if (!payment) {
      return apiError('PAYMENT_VERIFICATION_FAILED', 'Invalid or incomplete payment');
    }

    // Check if payment metadata references this skill
    if (payment.metadata) {
      try {
        const meta = JSON.parse(payment.metadata);
        if (meta.skillSlug && meta.skillSlug !== slug) {
          return apiError('PAYMENT_MISMATCH', 'Payment is for a different skill');
        }
      } catch {
        // metadata isn't JSON — skip cross-skill check
      }
    }

    return apiSuccess({
      access: 'granted',
      paymentId: payment.id,
      skillSlug: slug,
    });
  } catch (error) {
    logger.error('[SKILL-PAY] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to verify payment');
  }
}
