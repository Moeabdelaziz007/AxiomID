import { logger } from '@/lib/logger';
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ActionClaimSchema } from "@/lib/validators";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { ACTIONS } from "@/lib/actions";
import { calculateTier } from "@/lib/tiers";
import { requireAuth } from "@/lib/auth-middleware";
import { safeJsonStringify } from "@/lib/sanitize";
import { signSocialCredential } from "@/lib/vc";
import { createUserDid } from "@/lib/did";
import { calculateActionHash, GENESIS_HASH } from "@/lib/trust-chain";
import { computeTrustScore } from "@/lib/trust-score";

/**
 * Handle a stamp claim request by authenticating the user, validating input, signing stamp metadata,
 * preventing duplicates, and atomically creating the stamp, action, and XP ledger entries.
 *
 * Attempts rate limiting and returns a structured API error response on validation, authentication,
 * rate-limit, signing, or database failures. On success returns the created stamp id, XP awarded,
 * new balance, new tier, ledger entry id, and the stored metadata.
 *
 * @param request - The incoming NextRequest for the stamp claim endpoint
 * @returns An API response object: on success contains stampId, xpEarned, newBalance, tier, ledgerEntryId, and metadata; on failure contains an API error code and message. 
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`stamp-claim:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many claim attempts. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user: authUser } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = ActionClaimSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  const { actionType, metadata } = parsed.data;

  const actionDef = Object.values(ACTIONS).find((a) => a.id === actionType);
  if (!actionDef) {
    return apiError("VALIDATION_ERROR", `Unknown stamp type: ${actionType}`);
  }

  try {
    const existing = await prisma.stamp.findUnique({
      where: { user_stamp_unique: { userId: authUser.id, type: actionType } },
    });

    if (existing) {
      return apiError("CONFLICT", "This stamp has already been claimed");
    }

    let finalMetadata = safeJsonStringify(metadata);
    const handle = (metadata?.handle || metadata?.username || metadata?.email || "verified_user") as string;
    const userDid = createUserDid(authUser.id);
    const platform = actionType.startsWith("connect_") ? actionType.replace("connect_", "") : "system";

    if (actionType.startsWith("connect_")) {
      try {
        const signedVc = signSocialCredential(
          authUser.id,
          userDid,
          platform,
          handle,
          authUser.walletAddress
        );
        finalMetadata = JSON.stringify(signedVc);
      } catch (e) {
        logger.error("[STAMP-CLAIM] VC signing failed:", e);
        return apiError("INTERNAL_ERROR", "Cryptographic signing failure");
      }
    }

    const provider = actionType.startsWith("connect_") ? actionType.replace("connect_", "") : "system";

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({ where: { id: authUser.id } });
      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      const stamp = await tx.stamp.create({
        data: {
          userId: authUser.id,
          type: actionType,
          provider,
          xpAwarded: actionDef.xp,
          metadata: finalMetadata,
        },
      });

      // Fetch the last globally created action to chain hashes
      const lastAction = await tx.action.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { hash: true },
      });
      const parentHash = lastAction?.hash || GENESIS_HASH;

      const actionTimestamp = new Date();
      const actionHash = calculateActionHash(parentHash, {
        type: actionType,
        xp: actionDef.xp,
        metadata: finalMetadata,
        userId: authUser.id,
        timestamp: actionTimestamp,
      });

      // Also create an Action record for backwards-compatibility / general ledger with cryptographic audit hash
      await tx.action.create({
        data: {
          userId: authUser.id,
          type: actionType,
          xp: actionDef.xp,
          metadata: finalMetadata,
          timestamp: actionTimestamp,
          hash: actionHash,
          parentHash,
        },
      });

      const newBalance = user.xp + actionDef.xp;
      const ledgerEntry = await tx.xpLedger.create({
        data: {
          userId: authUser.id,
          amount: actionDef.xp,
          reason: "stamp_claim",
          reference: JSON.stringify({ stampId: stamp.id }),
          balance: newBalance,
        },
      });

      const newTier = calculateTier(newBalance);
      await tx.user.update({
        where: { id: authUser.id },
        data: {
          xp: newBalance,
          tier: newTier,
          lastActive: new Date(),
        },
      });

      return { stamp, ledgerEntry, newTier, newBalance };
    });

    const updatedStamps = await prisma.stamp.findMany({
      where: { userId: authUser.id },
      select: { type: true, xpAwarded: true, createdAt: true },
    });

    const computedTrustScore = computeTrustScore(
      updatedStamps.map(s => ({ type: s.type, xp: s.xpAwarded, timestamp: s.createdAt })),
      false,
      new Date(),
    );

    return apiSuccess({
      stampId: result.stamp.id,
      xpEarned: actionDef.xp,
      newBalance: result.newBalance,
      tier: result.newTier,
      ledgerEntryId: result.ledgerEntry.id,
      metadata: result.stamp.metadata,
      computedTrustScore,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return apiError("NOT_FOUND", "User not found");
    }
    logger.error("[STAMP-CLAIM] Database error:", error);
    return apiError("INTERNAL_ERROR", "Failed to claim stamp");
  }
}
