import { NextResponse } from "next/server";
import type { OpenIdentityManifest } from "../../../lib/openidentity/generate-manifest";

/**
 * GET /.well-known/openidentity
 *
 * Serves the OpenIdentity v0.1 manifest for the AxiomID root agent.
 * This is the canonical resolution endpoint for other agents and verifiers
 * that wish to inspect AxiomID's identity, controller, capabilities, and
 * linked wallet/passport references.
 *
 * The manifest is static (derived from the protocol's public identity, not a
 * per-user state) so it is safe to cache at the edge for an hour.
 */
export async function GET() {
  const manifest: OpenIdentityManifest = {
    openidentity: "0.1",
    agent: {
      id: "did:axiom:agent:axiomid",
      name: "AxiomID",
      type: "ai-agent",
      version: "0.2.0",
      description:
        "The Human Authorization Protocol for AI agents and humans.",
    },
    controller: {
      type: "organization",
      name: "AxiomID",
      verified: true,
      url: "https://axiomid.app",
    },
    capabilities: {
      roles: ["identity-verification", "agent-governance"],
      skills: [
        "pi-auth",
        "did-resolution",
        "passport-publishing",
        "trust-scoring",
      ],
    },
    wallets: [
      {
        type: "pi-network",
        address: "https://axiomid.app",
      },
    ],
    links: {
      homepage: "https://axiomid.app",
      repository: "https://github.com/Moeabdelaziz007/AxiomID",
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
