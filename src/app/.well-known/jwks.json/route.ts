import { NextRequest } from "next/server";
import { exportJwks } from "@/lib/jwks";
import { apiSuccess, apiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Exports all JSON Web Keys for the well-known JWKS endpoint.
 */
export async function GET(_request: NextRequest) {
  try {
    const jwks = await exportJwks("*");

    return apiSuccess(jwks, 200, {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    });
  } catch (error) {
    logger.error("[JWKS] Failed to export:", error);
    return apiError("INTERNAL_ERROR", "Failed to export JWKS");
  }
}
