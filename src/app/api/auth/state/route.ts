import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { WalletConnectSchema } from '@/lib/validators';

function getSecret(): string | null {
  return process.env.OAUTH_STATE_SECRET || null;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`auth-state:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.');
  }

  const secret = getSecret();
  if (!secret) {
    return apiError('INTERNAL_ERROR', 'OAUTH_STATE_SECRET not configured');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const parsed = WalletConnectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0].message, parsed.error.issues);
  }

  const { walletAddress } = parsed.data;
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  const payload = JSON.stringify({ walletAddress, expiresAt });

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const envelope = JSON.stringify({ payload, signature });
  const stateToken = Buffer.from(envelope).toString('base64url');

  return apiSuccess({ state: stateToken });
}
