import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentApproveSchema } from '@/lib/validators';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';
import { safeJsonStringify } from '@/lib/sanitize';

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
    console.error('[PI-PAYMENT] PI_API_KEY not configured');
    return apiError('INTERNAL_ERROR', 'Payment system not configured');
  }

  try {
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
      console.error('[PI-PAYMENT] Pi API approve failed:', piResponse.status, errorData);
      return apiError('PI_PAYMENT_FAILED', `Pi API error: ${piResponse.status}`);
    }

    const paymentData = await piResponse.json();

    const existing = await prisma.piPayment.findUnique({
      where: { paymentId },
      select: { userId: true },
    });

    if (existing && existing.userId !== auth.user.id) {
      return apiError('FORBIDDEN', 'Payment does not belong to authenticated user');
    }

    await prisma.piPayment.upsert({
      where: { paymentId },
      update: {
        status: 'approved',
        amount: paymentData.amount || 0,
        memo: paymentData.memo || null,
        metadata: safeJsonStringify(paymentData.metadata),
      },
      create: {
        paymentId,
        userId: auth.user.id,
        amount: paymentData.amount || 0,
        memo: paymentData.memo || null,
        metadata: safeJsonStringify(paymentData.metadata),
        status: 'approved',
        network: 'pi',
      },
    });

    return apiSuccess({ status: 'approved', paymentId });
  } catch (error) {
    console.error('[PI-PAYMENT] Approve error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to approve payment');
  }
}
