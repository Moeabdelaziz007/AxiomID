import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/errors";
import { getSandboxDevToken } from "@/lib/sandbox-token";

/**
 * GET /api/sandbox/dev-token
 *
 * Securely exposes the sandbox developer token only in development/sandbox
 * environments and from local loopback addresses (localhost/127.0.0.1/::1).
 */
export async function GET(request: NextRequest) {
  // 1. Strict production guard
  if (process.env.NODE_ENV === "production") {
    return apiError("FORBIDDEN", "Endpoint is not available in production environments.");
  }

  // 2. Strict bypass enable check
  if (process.env.SANDBOX_AUTH_BYPASS !== "true") {
    return apiError("FORBIDDEN", "Sandbox authentication bypass is disabled.");
  }

  // 3. Strict loopback address check
  const hostname = request.nextUrl.hostname;
  const isLoopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost");

  if (!isLoopback) {
    return apiError("FORBIDDEN", "Endpoint is only accessible from local loopback addresses.");
  }

  // 4. Retrieve sandbox developer token
  const token = getSandboxDevToken();
  if (!token) {
    return apiError("NOT_FOUND", "Sandbox dev token not configured. Set SANDBOX_DEV_TOKEN in .env.local");
  }

  return apiSuccess({ token });
}
