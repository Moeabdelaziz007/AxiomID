import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { requireAuth } from "@/lib/auth-middleware";
import { z } from "zod";

const StakeRequestSchema = z.object({
  action: z.enum(["stake", "unstake"]),
  amount: z.number().positive().optional(),
  stakeId: z.string().uuid().optional(),
});

/**
 * Fetches the authenticated user's staking records.
 *
 * @returns A response containing the user's staking records ordered by most recent first, or an error response.
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
 * Stakes tokens or unstakes one or all of the authenticated user's stake records.
 *
 * @returns A success response with the created stake, the updated stake, or a bulk unstaking message. Returns an error response when the request is invalid, rate-limited, unauthorized, or the operation fails.
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

    if (action === "stake") {
      if (!amount) {
        return apiError("VALIDATION_ERROR", "Amount is required to stake");
      }

      const stake = await prisma.stake.create({
        data: {
          userId: auth.user.id,
          amount,
          status: "staked",
        },
      });

      logger.info("[VAULT-STAKE] User staked tokens", { userId: auth.user.id, amount });
      return apiSuccess({ stake });
    } else {
      // action === "unstake"
      if (stakeId) {
        const stake = await prisma.stake.findFirst({
          where: { id: stakeId, userId: auth.user.id },
        });

        if (!stake) {
          return apiError("NOT_FOUND", "Stake record not found");
        }

        if (stake.status === "unstaked") {
          return apiError("VALIDATION_ERROR", "Stake record is already unstaked");
        }

        const updatedStake = await prisma.stake.update({
          where: { id: stakeId },
          data: { status: "unstaked" },
        });

        logger.info("[VAULT-STAKE] User unstaked record", { userId: auth.user.id, stakeId });
        return apiSuccess({ stake: updatedStake });
      } else {
        // unstake all active stakes
        const result = await prisma.stake.updateMany({
          where: { userId: auth.user.id, status: "staked" },
          data: { status: "unstaked" },
        });

        if (result.count === 0) {
          return apiError("VALIDATION_ERROR", "No active stakes found");
        }

        logger.info("[VAULT-STAKE] User unstaked all active stakes", { userId: auth.user.id, count: result.count });
        return apiSuccess({ message: `Successfully unstaked ${result.count} stakes` });
      }
    }
  } catch (error) {
    logger.error("[VAULT-STAKE] POST Database error:", error);
    return apiError("INTERNAL_ERROR", "Staking operation failed");
  }
}
