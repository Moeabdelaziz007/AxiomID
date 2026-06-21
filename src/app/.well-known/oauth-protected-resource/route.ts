import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/errors";

/**
 * Handles GET requests for protected resource discovery metadata.
 *
 * @returns A response containing the protected resource identifier, supported authorization servers, scopes, and bearer token methods. The response is cached for 24 hours.
 */
export async function GET(_request: NextRequest) {
  return apiSuccess({
    resource: "https://axiomid.app",
    authorization_servers: ["https://axiomid.app"],
    scopes_supported: ["api.read", "api.write", "agent.sign"],
    bearer_methods_supported: ["header"],
  }, 200, {
    "Cache-Control": "public, s-maxage=86400",
  });
}
