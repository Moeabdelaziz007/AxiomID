import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PaymentCompleteSchema } from '@/lib/validators';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { calculateTier } from '@/lib/tiers';
import { requireAuth } from '@/lib/auth-middleware';

/**
 * Handle Pi payment completion callbacks and finalize payments for an authenticated user.
 *
 * Validates rate limits, authenticates the requester, parses and validates the request body,
 * calls the Pi API to complete the payment, and atomically updates the payment record,
 * the user's XP/tier, and the XP ledger when applicable.
 *
 * @returns On success: an API success payload containing `{ status: 'completed', paymentId, txid, xpEarned, tier }`.
 *          On failure: an API error payload with an error code and message (e.g., rate limited, validation error,
 *          not found, forbidden, Pi API failure, or internal error).
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`pi-payment-complete:${ip}`, RATE_LIMITS.payment);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many completion requests. Try again later.');
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const parsed = PaymentCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0].message, parsed.error.issues);
  }

  const { paymentId, txid } = parsed.data;

  const PI_API_KEY = process.env.PI_API_KEY;
  if (!PI_API_KEY) {
    return apiError('INTERNAL_ERROR', 'Payment system not configured');
  }

  try {
    const payment = await prisma.piPayment.findUnique({
      where: { paymentId },
    });

    if (!payment) {
      return apiError('NOT_FOUND', 'Payment record not found');
    }

    if (payment.userId !== auth.user.id) {
      return apiError('FORBIDDEN', 'Payment does not belong to authenticated user');
    }

    if (payment.status === 'completed') {
      return apiSuccess({
        status: 'completed',
        paymentId,
        txid: payment.txid || txid,
        xpEarned: auth.user.xp,
        tier: auth.user.tier,
      });
    }

    const piResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ txid }),
      signal: AbortSignal.timeout(10000),
    });

    if (!piResponse.ok) {
      const errorData = await piResponse.json().catch(() => ({}));
      logger.error('[PI-PAYMENT] Pi API complete failed:', piResponse.status, errorData);
      return apiError('PI_PAYMENT_FAILED', `Pi API error: ${piResponse.status}`);
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedPayment = await tx.piPayment.update({
        where: { paymentId },
        data: {
          status: 'completed',
          txid,
        },
      });

      let updatedUser = null;
      let newTier = 'Visitor';
      let newBalance = 0;

      let metadata: Record<string, unknown> = {};
      try {
        metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
      } catch {
        logger.warn('[PI-PAYMENT] Malformed metadata for payment:', paymentId);
      }
      const purpose = metadata.purpose || 'payment';

      if (payment.userId && payment.userId !== 'unknown') {
        const user = await tx.user.findUnique({ where: { id: payment.userId } });
        if (user) {
          const xpReward = Math.floor(payment.amount * 10);
          newBalance = user.xp + xpReward;
          newTier = calculateTier(newBalance);

          await tx.xpLedger.create({
            data: {
              userId: payment.userId,
              amount: xpReward,
              reason: 'action_claim',
              reference: JSON.stringify({ paymentId, txid, purpose }),
              balance: newBalance,
            },
          });

          updatedUser = await tx.user.update({
            where: { id: payment.userId },
            data: {
              xp: newBalance,
              tier: newTier,
              lastActive: new Date(),
            },
          });
        }
      }

      return { updatedPayment, updatedUser, newTier, newBalance };
    });

    return apiSuccess({
      status: 'completed',
      paymentId,
      txid,
      xpEarned: result.newBalance,
      tier: result.newTier,
    });
  } catch (error) {
    logger.error('[PI-PAYMENT] Complete error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to complete payment');
  }
}
