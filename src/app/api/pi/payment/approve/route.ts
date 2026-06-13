import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentApproveSchema } from '@/lib/validators';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';
import { safeJsonStringify } from '@/lib/sanitize';

/**
 * Handle an authenticated Pi Network payment approval request, enforcing rate limits, verifying payer ownership, approving the payment with Pi's API, and persisting the result.
 *
 * Performs input validation, prevents IDOR by confirming the Pi payer UID matches the authenticated user, calls Pi's payment approve endpoint, and upserts the payment record in the database.
 *
 * @returns An HTTP API response representing either a success (e.g., `{ status: 'approved', paymentId }`) or an error response containing a code and message.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`pi-payment-approve:${ip}`, RATE_LIMITS.payment);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many payment requests. Try again later.');
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const parsed = PaymentApproveSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0].message, parsed.error.issues);
  }

  const { paymentId } = parsed.data;

  const PI_API_KEY = process.env.PI_API_KEY;
  if (!PI_API_KEY) {
    logger.error('[PI-PAYMENT] PI_API_KEY not configured');
    return apiError('INTERNAL_ERROR', 'Payment system not configured');
  }

  try {
    const existing = await prisma.piPayment.findUnique({
      where: { paymentId },
    });

    if (existing) {
      if (existing.userId !== auth.user.id) {
        return apiError('FORBIDDEN', 'Payment does not belong to authenticated user');
      }
      if (existing.status === 'approved' || existing.status === 'completed') {
        return apiSuccess({ status: existing.status, paymentId });
      }
    }

    // 1. Fetch payment details from Pi Network API to verify ownership
    const getResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Key ${PI_API_KEY}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!getResponse.ok) {
      logger.error('[PI-PAYMENT] Pi API get failed:', getResponse.status);
      return apiError('PI_PAYMENT_FAILED', `Failed to retrieve payment: ${getResponse.status}`);
    }

    const paymentData = await getResponse.json();

    // 2. Prevent IDOR by asserting the payment's payer UID matches the authenticated user
    if (!auth.user.piUid || paymentData.user_uid !== auth.user.piUid) {
      return apiError('FORBIDDEN', 'Payment payer UID does not match authenticated user');
    }

    // 3. Now safely approve the payment on Pi Network
    const piResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!piResponse.ok) {
      const errorData = await piResponse.json().catch(() => ({}));
      logger.error('[PI-PAYMENT] Pi API approve failed:', piResponse.status, errorData);
      return apiError('PI_PAYMENT_FAILED', `Pi API error: ${piResponse.status}`);
    }

    const approveData = await piResponse.json();

    await prisma.piPayment.upsert({
      where: { paymentId },
      update: {
        status: 'approved',
        amount: approveData.amount || 0,
        memo: approveData.memo || null,
        metadata: safeJsonStringify(approveData.metadata),
      },
      create: {
        paymentId,
        userId: auth.user.id,
        amount: approveData.amount || 0,
        memo: approveData.memo || null,
        metadata: safeJsonStringify(approveData.metadata),
        status: 'approved',
        network: 'pi',
      },
    });

    return apiSuccess({ status: 'approved', paymentId });
  } catch (error) {
    logger.error('[PI-PAYMENT] Approve error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to approve payment');
  }
}
