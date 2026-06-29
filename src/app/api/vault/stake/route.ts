import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { requireAuth } from "@/lib/auth-middleware";
import { StakeStatus } from "@prisma/client";
import { z } from "zod";

const StakeRequestSchema = z.object({
  action: z.enum(["stake", "unstake"]),
  amount: z.number().int().positive().optional(),
  stakeId: z.string().uuid().optional(),
});

const MIN_STAKE = 1;
const MAX_STAKE = 10000;

/**
 * Fetches the authenticated user's staking records.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`vault-stake-get:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const stakes = await prisma.stake.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess({ stakes });
  } catch (error) {
    logger.error("[VAULT-STAKE] GET Database error:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch stakes");
  }
}

/**
 * Stakes tokens or unstakes one or all of the authenticated user's stake records atomically.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`vault-stake-post:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = StakeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid request body", parsed.error.format());
    }

    const { action, amount, stakeId } = parsed.data;

    // Fetch up-to-date user XP balance
    const dbUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { xp: true },
    });
    if (!dbUser) {
      return apiError("NOT_FOUND", "User not found");
    }

    if (action === "stake") {
      if (amount === undefined) {
        return apiError("VALIDATION_ERROR", "Amount is required to stake");
      }

      if (amount < MIN_STAKE || amount > MAX_STAKE) {
        return apiError("VALIDATION_ERROR", `Staking amount must be between ${MIN_STAKE} and ${MAX_STAKE} XP`);
      }

      if (dbUser.xp < amount) {
        return apiError(
          "VALIDATION_ERROR",
          `Insufficient XP balance. You have ${dbUser.xp} XP, but tried to stake ${amount} XP.`
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const stake = await tx.stake.create({
          data: {
            userId: auth.user.id,
            amount,
            status: StakeStatus.STAKED,
          },
        });

        const updatedUser = await tx.user.update({
          where: { id: auth.user.id },
          data: { xp: { decrement: amount } },
        });

        await tx.xpLedger.create({
          data: {
            userId: auth.user.id,
            amount: -amount,
            reason: "vault_stake",
            reference: JSON.stringify({ stakeId: stake.id }),
            balance: updatedUser.xp,
          },
        });

        return stake;
      });

      logger.info("[VAULT-STAKE] User staked tokens atomically", { userId: auth.user.id, amount, stakeId: result.id });
      return apiSuccess({ stake: result });
    } else {
      // action === "unstake"
      if (stakeId) {
        const stake = await prisma.stake.findFirst({
          where: { id: stakeId, userId: auth.user.id },
        });

        if (!stake) {
          return apiError("NOT_FOUND", "Stake record not found");
        }

        if (stake.status === StakeStatus.UNSTAKED) {
          return apiError("VALIDATION_ERROR", "Stake record is already unstaked");
        }

        const stakeAmountInt = Math.floor(stake.amount);

        const result = await prisma.$transaction(async (tx) => {
          const updatedStake = await tx.stake.update({
            where: { id: stakeId },
            data: { status: StakeStatus.UNSTAKED },
          });

          const updatedUser = await tx.user.update({
            where: { id: auth.user.id },
            data: { xp: { increment: stakeAmountInt } },
          });

          await tx.xpLedger.create({
            data: {
              userId: auth.user.id,
              amount: stakeAmountInt,
              reason: "vault_unstake",
              reference: JSON.stringify({ stakeId: stake.id }),
              balance: updatedUser.xp,
            },
          });

          return updatedStake;
        });

        logger.info("[VAULT-STAKE] User unstaked record atomically", { userId: auth.user.id, stakeId });
        return apiSuccess({ stake: result });
      } else {
        // unstake all active stakes
        const activeStakes = await prisma.stake.findMany({
          where: { userId: auth.user.id, status: StakeStatus.STAKED },
        });

        if (activeStakes.length === 0) {
          return apiError("VALIDATION_ERROR", "No active stakes found");
        }

        const totalRefund = activeStakes.reduce((sum, s) => sum + Math.floor(s.amount), 0);

        const result = await prisma.$transaction(async (tx) => {
          await tx.stake.updateMany({
            where: { userId: auth.user.id, status: StakeStatus.STAKED },
            data: { status: StakeStatus.UNSTAKED },
          });

          const updatedUser = await tx.user.update({
            where: { id: auth.user.id },
            data: { xp: { increment: totalRefund } },
          });

          await tx.xpLedger.create({
            data: {
              userId: auth.user.id,
              amount: totalRefund,
              reason: "vault_unstake",
              reference: JSON.stringify({ stakeIds: activeStakes.map((s) => s.id) }),
              balance: updatedUser.xp,
            },
          });

          return { count: activeStakes.length, refunded: totalRefund };
        });

        logger.info("[VAULT-STAKE] User unstaked all active stakes atomically", {
          userId: auth.user.id,
          count: result.count,
          refunded: result.refunded,
        });
        return apiSuccess({
          message: `Successfully unstaked ${result.count} stakes (${result.refunded} XP refunded)`,
        });
      }
    }
  } catch (error) {
    logger.error("[VAULT-STAKE] POST Database error:", error);
    return apiError("INTERNAL_ERROR", "Staking operation failed");
  }
}
