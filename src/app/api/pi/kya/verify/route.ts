import { NextRequest } from 'next/server';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';
import { verifyKycServerSide } from '@/lib/pi-kyc';
import { computeTrustScore } from '@/lib/trust-score';
import { calculateTier } from '@/lib/tiers';
import { calculateActionHash, GENESIS_HASH } from '@/lib/trust-chain';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const VerifyKycSchema = z.object({
  accessToken: z.string().min(1),
});

/**
 * Verifies a user's KYC status and updates their account.
 *
 * @returns The API response containing the resulting KYC status, Pi UID, and computed trust score.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`kya-verify:${ip}`, RATE_LIMITS.authenticated);
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

  const parsed = VerifyKycSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    const kycResult = await verifyKycServerSide(parsed.data.accessToken);
    if (kycResult.uid !== auth.user.piUid) {
      logger.error(`[KYA-VERIFY] Pi UID mismatch: auth=${auth.user.piUid} token=${kycResult.uid}`);
      return apiError('FORBIDDEN', 'Pi account mismatch');
    }

    const user = await prisma.user.findUnique({
      where: { piUid: auth.user.piUid },
      include: { stamps: true },
    });

    if (!user) {
      return apiError('NOT_FOUND', 'User not found');
    }

    const kycStatus = kycResult.kycVerified ? 'VERIFIED' : 'PENDING';

    const stampsToScore = user.stamps.map(s => ({
      type: s.type as string,
      xp: s.xpAwarded,
      timestamp: s.createdAt,
    }));

    let stampCreated = false;

    // Atomic: persist KYC status + stamp + XP + tier + audit record + ledger together
    try {
      await prisma.$transaction(async (tx) => {
        // Persist KYC status inside the transaction so it rolls back on failure
        await tx.user.update({
          where: { id: user.id },
          data: {
            kycStatus,
            kycProvider: 'pi_network',
            kycVerifiedAt: kycResult.kycVerified ? new Date() : null,
          },
        });

        if (kycResult.kycVerified) {
          const existingStamp = await tx.stamp.findUnique({
            where: { user_stamp_unique: { userId: user.id, type: 'complete_kyc' } },
          });

          if (!existingStamp) {
            await tx.stamp.create({
              data: {
                userId: user.id,
                type: 'complete_kyc',
                provider: 'pi_network',
                xpAwarded: 200,
              },
            });

            const { xp: totalXp } = await tx.user.update({
              where: { id: user.id },
              data: { xp: { increment: 200 } },
              select: { xp: true },
            });

            // Record the XP grant in the ledger so the audit chain stays complete
            await tx.xpLedger.create({
              data: {
                userId: user.id,
                amount: 200,
                reason: 'action_claim',
                reference: JSON.stringify({ type: 'complete_kyc' }),
                balance: totalXp,
              },
            });

            const nextTier = calculateTier(totalXp);
            if (nextTier !== user.tier) {
              await tx.user.update({
                where: { id: user.id },
                data: { tier: nextTier },
              });
            }

            const lastAction = await tx.action.findFirst({
              where: { userId: user.id },
              orderBy: { timestamp: 'desc' },
              select: { hash: true },
            });
            const parentHash = lastAction?.hash || GENESIS_HASH;
            const actionTimestamp = new Date();
            const actionHash = calculateActionHash(parentHash, {
              type: 'complete_kyc',
              xp: 200,
              metadata: '{}',
              userId: user.id,
              timestamp: actionTimestamp,
            });

            await tx.action.create({
              data: { 
                userId: user.id,
                type: 'complete_kyc',
                xp: 200,
                metadata: '{}',
                hash: actionHash,
                parentHash,
                timestamp: actionTimestamp,
              },
            });

            stampCreated = true;
          }
        }
      });
    } catch (txErr) {
      const code = (txErr as { code?: string })?.code;
      const msg = txErr instanceof Error ? txErr.message : String(txErr);
      if (code === 'P2002' || msg.includes('P2002')) {
        stampCreated = false;
      } else {
        throw txErr;
      }
    }

    if (stampCreated) {
      stampsToScore.push({ type: 'complete_kyc', xp: 200, timestamp: new Date() });
    }

    const computedTrustScore = computeTrustScore(stampsToScore, false, user.lastActive);

    return apiSuccess({
      kycStatus,
      uid: kycResult.uid,
      computedTrustScore,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[KYA-VERIFY] Error:', message);
    return apiError('INTERNAL_ERROR', 'KYC verification failed');
  }
}
