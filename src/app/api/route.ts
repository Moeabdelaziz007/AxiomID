import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { apiSuccess } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    return apiSuccess(
      {
        name: "AxiomID API",
        version: "1.0.0",
        description: "W3C DID-based identity layer for AI agents",
        documentation: "https://axiomid.app/docs",
        endpoints: {
          did: "/api/did-document",
          identity: "/api/agent/identity",
          sign: "/api/agent/sign",
          manifest: "/api/agent/manifest",
          skills: "/api/skills",
          tags: "/api/skills/tags",
          token: "/api/oauth2/token",
          revoke: "/api/oauth2/revoke",
          status: "/api/status",
        },
        discovery: {
          jwks: "/.well-known/jwks.json",
          auth_md: "/auth.md",
        },
        rateLimit: "See /docs for limits",
      },
      200,
      {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      }
    );
  } catch (error) {
    logger.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
