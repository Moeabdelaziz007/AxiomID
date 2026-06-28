import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { anchorVcHash } from "@/lib/stellar-anchoring";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const AnchorRequestSchema = z.object({
  signedVc: z.record(z.string(), z.unknown()),
  userSecretKey: z.string().min(56),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`vc-anchor:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests", undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = AnchorRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
    }

    const { signedVc, userSecretKey } = parsed.data;

    const cs = signedVc.credentialSubject as Record<string, unknown> | undefined;
    const vcSubject = typeof cs === "object" && cs !== null ? cs.id : undefined;
    if (vcSubject !== auth.user?.did) {
      return apiError("FORBIDDEN", "VC subject does not match authenticated user");
    }

    const result = await anchorVcHash(signedVc, userSecretKey);

    await prisma.stamp.updateMany({
      where: { userId: auth.user!.id, type: "vc_anchored" },
      data: { metadata: JSON.stringify(result) },
    }).catch(() => {
      prisma.stamp.create({
        data: {
          userId: auth.user!.id,
          type: "vc_anchored",
          provider: "stellar",
          xpAwarded: 50,
          metadata: JSON.stringify(result),
        },
      });
    });

    return apiSuccess(result);
  } catch (err) {
    logger.error("VC anchor failed", { error: err });
    return apiError("INTERNAL_ERROR", "Failed to anchor VC on Stellar");
  }
}
