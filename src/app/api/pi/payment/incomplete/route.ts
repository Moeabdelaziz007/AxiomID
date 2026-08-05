import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { IncompletePaymentSchema } from '@/lib/validators';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';
import { calculateTier } from '@/lib/tiers';
import { getPostHogClient } from '@/lib/posthog-server';
import { getActionUseCount, computePristineMultiplier } from '@/lib/rewards/pristine-path';

export const maxDuration = 30;

/**
 * Handle incomplete Pi Network payments by auto-resolving them.
 *
 * This endpoint is called by the client-side `onIncompletePaymentFound` callback
 * when the Pi SDK detects an incomplete payment during authentication.
 *
 * Flow:
 * 1. Fetch payment details from Pi API to verify ownership
 * 2. If not developer_approved → approve it
 * 3. If not completed → complete it with provided txid
 * 4. Persist payment, award XP, upgrade kycStatus, update TrustChain
 *
 * @returns API response with resolution status
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`pi-payment-incomplete:${ip}`, RATE_LIMITS.payment);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many incomplete payment requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const parsed = IncompletePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0].message, parsed.error.issues);
  }

  const { paymentId, txid } = parsed.data;

  const PI_API_KEY = process.env.PI_API_KEY;
  if (!PI_API_KEY) {
    logger.error('[PI-PAYMENT-INCOMPLETE] PI_API_KEY not configured');
    return apiError('INTERNAL_ERROR', 'Payment system not configured');
  }

  try {
    // 1. Check if we already have this payment in our database
    const existing = await prisma.piPayment.findUnique({
      where: { paymentId },
    });

    // If payment exists and belongs to another user, forbid
    if (existing && existing.userId !== auth.user.id) {
      return apiError('FORBIDDEN', 'Payment does not belong to authenticated user');
    }

    // If already released, return success
    if (existing && existing.status === 'RELEASED') {
      return apiSuccess({ status: 'completed', paymentId, txid: existing.txid || txid });
    }

    // 2. Fetch payment details from Pi Network API to verify ownership & get canonical data
    const getResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
      method: 'GET',
      headers: { Authorization: `Key ${PI_API_KEY}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!getResponse.ok) {
      logger.error('[PI-PAYMENT-INCOMPLETE] Pi API get failed:', getResponse.status);
      return apiError('PI_PAYMENT_FAILED', `Failed to retrieve payment: ${getResponse.status}`);
    }

    const paymentData = await getResponse.json();

    // 3. Prevent IDOR: assert the payment's payer UID matches the authenticated user
    if (!auth.user.piUid || paymentData.user_uid !== auth.user.piUid) {
      return apiError('FORBIDDEN', 'Payment payer UID does not match authenticated user');
    }

    const isApproved = paymentData.status?.developer_approved === true;
    const isCompleted = paymentData.status?.developer_completed === true;

    // 4. If not approved, approve it
    if (!isApproved) {
      const approveResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!approveResponse.ok) {
        const errorData = await approveResponse.json().catch(() => ({}));
        logger.error('[PI-PAYMENT-INCOMPLETE] Pi API approve failed:', approveResponse.status, errorData);
        return apiError('PI_PAYMENT_FAILED', `Pi API approve error: ${approveResponse.status}`);
      }
      await approveResponse.json().catch(() => ({}));
      logger.info('[PI-PAYMENT-INCOMPLETE] Payment approved:', paymentId);
    }

    // 5. If not completed, complete it (requires txid from client)
    if (!isCompleted) {
      if (!txid) {
        return apiError('VALIDATION_ERROR', 'txid required to complete incomplete payment');
      }

      const completeResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ txid }),
        signal: AbortSignal.timeout(10000),
      });

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json().catch(() => ({}));
        logger.error('[PI-PAYMENT-INCOMPLETE] Pi API complete failed:', completeResponse.status, errorData);
        return apiError('PI_PAYMENT_FAILED', `Pi API complete error: ${completeResponse.status}`);
      }
      await completeResponse.json().catch(() => ({}));
      logger.info('[PI-PAYMENT-INCOMPLETE] Payment completed:', paymentId);
    }

    // 6. Persist canonical payment data and award XP/upgrade KYC (atomic transaction)
    const pristineUses = await getActionUseCount(auth.user.id, 'pi_payment');
    const { multiplier: pristineMul } = computePristineMultiplier(pristineUses, 'pi_payment');

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Upsert payment with canonical data from Pi's GET response
      const upsertedPayment = await tx.piPayment.upsert({
        where: { paymentId },
        update: {
          status: 'RELEASED',
          txid: txid || paymentData.transaction?.txid || null,
          amount: paymentData.amount || 0,
          memo: paymentData.memo || null,
          metadata: paymentData.metadata ? JSON.stringify(paymentData.metadata) : null,
        },
        create: {
          paymentId,
          userId: auth.user.id,
          amount: paymentData.amount || 0,
          memo: paymentData.memo || null,
          metadata: paymentData.metadata ? JSON.stringify(paymentData.metadata) : null,
          status: 'RELEASED',
          txid: txid || paymentData.transaction?.txid || null,
          network: 'pi',
        },
      });

      let updatedUser = null;
      let newTier = 'Visitor';
      let newBalance = 0;
      let xpReward = 0;

      if (auth.user.id !== 'unknown') {
        const user = await tx.user.findUnique({ where: { id: auth.user.id } });
        if (user) {
          xpReward = Math.round(Math.floor(upsertedPayment.amount * 10) * pristineMul);
          newBalance = user.xp + xpReward;
          newTier = calculateTier(newBalance);

          // XP Ledger entry
          await tx.xpLedger.create({
            data: {
              userId: auth.user.id,
              amount: xpReward,
              reason: 'action_claim',
              reference: JSON.stringify({ paymentId, txid: upsertedPayment.txid, purpose: 'incomplete_payment_resolution' }),
              balance: newBalance,
            },
          });

          // Successful Pi payment proves KYC — upgrade kycStatus
          updatedUser = await tx.user.update({
            where: { id: auth.user.id },
            data: {
              xp: newBalance,
              tier: newTier,
              lastActive: new Date(),
              kycStatus: 'VERIFIED',
              kycProvider: 'pi_network',
            },
          });
        }
      }

      return { upsertedPayment, updatedUser, newTier, newBalance, xpReward };
    });

    // 7. Analytics
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: auth.user.id,
      event: 'pi_incomplete_payment_resolved',
      properties: {
        payment_id: paymentId,
        amount_pi: result.upsertedPayment.amount,
        xp_earned: result.xpReward,
        new_balance: result.newBalance,
        tier: result.newTier,
      },
    });
    await posthog.flush();

    return apiSuccess({
      status: 'resolved',
      paymentId,
      txid: result.upsertedPayment.txid,
      xpEarned: result.xpReward,
      newBalance: result.newBalance,
      tier: result.newTier,
      kycStatus: result.updatedUser?.kycStatus || 'VERIFIED',
    });
  } catch (error) {
    logger.error('[PI-PAYMENT-INCOMPLETE] Resolution error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to resolve incomplete payment');
  }
}