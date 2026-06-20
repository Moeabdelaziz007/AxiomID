import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/errors";
import { TokenRevocationSchema } from "@/lib/validators";
import { logger } from "@/lib/logger";

const revokedTokens = new Set<string>();

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = TokenRevocationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    revokedTokens.add(parsed.data.token);
    return apiSuccess({ success: true });
  } catch (error) {
    logger.error("[OAUTH2-REVOKE] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to revoke token");
  }
}

export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}
