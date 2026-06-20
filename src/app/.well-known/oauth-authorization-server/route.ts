import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/errors";

export async function GET(_request: NextRequest) {
  return apiSuccess({
    issuer: "https://axiomid.app",
    authorization_endpoint: "https://axiomid.app/api/agent/identity",
    token_endpoint: "https://axiomid.app/api/oauth2/token",
    revocation_endpoint: "https://axiomid.app/api/oauth2/revoke",
    jwks_uri: "https://axiomid.app/.well-known/jwks.json",
    response_types_supported: ["agent_auth"],
    grant_types_supported: [
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "claim",
    ],
    scopes_supported: ["api.read", "api.write", "agent.sign"],
    agent_auth: {
      type: "oidc",
      claims_supported: ["sub", "iss", "aud", "exp", "iat"],
      id_token_type: "urn:ietf:params:oauth:token-type:id_token",
    },
  }, 200, {
    "Cache-Control": "public, s-maxage=86400",
  });
}
