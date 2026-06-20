import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/errors";

/**
 * Provides protected resource discovery metadata for OAuth/OpenID servers.
 *
 * @returns A successful response containing protected resource discovery metadata.
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
