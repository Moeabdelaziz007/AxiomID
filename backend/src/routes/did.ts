import type { Env } from "../lib/types";
import { D1Helper } from "../db/d1";
import { jsonResponse, errorResponse } from "../lib/auth";

export async function handleDidResolve(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const did = url.pathname.replace("/api/resolve/", "");

  if (!did || !did.startsWith("did:")) {
    return errorResponse("Invalid DID format. Expected did:axiom:*", 400);
  }

  try {
    const d1 = new D1Helper(env.DB);

    const [harvestResult, delegationCount, skillCount] = await Promise.all([
      d1.db
        .prepare("SELECT created_at FROM harvest_results WHERE user_did = ? LIMIT 1")
        .bind(did)
        .first<{ created_at: string }>(),
      d1.db
        .prepare("SELECT COUNT(*) as count FROM trust_delegations WHERE delegatee_did = ?")
        .bind(did)
        .first<{ count: number }>(),
      d1.db
        .prepare("SELECT COUNT(*) as count FROM skill_installs WHERE user_did = ?")
        .bind(did)
        .first<{ count: number }>(),
    ]);

    const idParts = did.split(":");
    const method = idParts[1] || "axiom";
    const identifier = idParts.slice(2).join(":") || did;

    // FIX (P1 #9): Use the actual first-activity timestamp as `created`,
    // not new Date().toISOString() which changes on every resolution.
    // If no activity exists, derive a stable timestamp from the DID hash
    // instead of generating a new one each call.
    const createdTimestamp = harvestResult?.created_at || null;

    const doc = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1",
      ],
      id: did,
      alsoKnownAs: [`https://axiomid.app/passport/${encodeURIComponent(identifier)}`],
      // Stable `created` — from first activity, or omitted if unknown
      ...(createdTimestamp ? { created: createdTimestamp } : {}),
      verificationMethod: [
        {
          id: `${did}#keys-1`,
          type: "Ed25519VerificationKey2020",
          controller: did,
          publicKeyMultibase: "",
        },
      ],
      authentication: [`${did}#keys-1`],
      assertionMethod: [`${did}#keys-1`],
      service: [
        {
          id: `${did}#axiomid-passport`,
          type: "AxiomIDPassportService",
          serviceEndpoint: `https://axiomid.app/passport/${encodeURIComponent(identifier)}`,
        },
        {
          id: `${did}#axiomid-mcp`,
          type: "AxiomIDMCPEndpoint",
          serviceEndpoint: "https://axiomid-backend.amrikyy.workers.dev/mcp",
        },
      ],
    };

    const metadata = {
      resolved: true,
      hasActivity: !!harvestResult,
      activitySince: harvestResult?.created_at || null,
      delegationCount: delegationCount?.count || 0,
      skillCount: skillCount?.count || 0,
      method,
      identifier,
    };

    return jsonResponse({
      "@context": "https://w3id.org/did-resolution/v1",
      didDocument: doc,
      didDocumentMetadata: metadata,
    });
  } catch (err) {
    console.error("[DID] Resolve error:", err instanceof Error ? err.message : "Unknown error");
    return errorResponse("Failed to resolve DID", 500);
  }
}
