import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/errors";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { createPrivateKey, sign } from "crypto";

/**
 * Generates and signs a verifiable credential manifest for an authenticated user.
 *
 * Authenticates the request, retrieves the user's profile, constructs a W3C Verifiable
 * Credential, and returns it signed with the issuer's private key. The response is
 * publicly cacheable for five minutes.
 *
 * @returns A signed verifiable credential manifest in JSON-LD format, or an error response.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const user = auth.user;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, walletAddress: true, did: true, piUsername: true, tier: true, xp: true },
  });

  if (!dbUser) {
    return apiError("NOT_FOUND", "User not found");
  }

  const issuerPrivateKeyPem = process.env.ISSUER_PRIVATE_KEY;
  if (!issuerPrivateKeyPem) {
    return apiError("INTERNAL_ERROR", "ISSUER_PRIVATE_KEY not set");
  }

  const did = dbUser.did || `did:axiom:user-${dbUser.id}`;
  const now = new Date();
  const issuanceDate = now.toISOString();
  const expirationDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const credential = {
    "@context": "https://www.w3.org/2018/credentials/v1",
    type: ["VerifiableCredential"],
    issuer: { id: "did:axiom:issuer", name: "AxiomID Protocol" },
    issuanceDate,
    expirationDate,
    credentialSubject: {
      id: did,
      type: "AgentIdentity",
      walletAddress: dbUser.walletAddress,
      piUsername: dbUser.piUsername,
      tier: dbUser.tier,
      xp: dbUser.xp,
    },
    credentialStatus: {
      id: `https://axiomid.app/api/agent/credential-status?subjectId=${encodeURIComponent(did)}`,
      type: "StatusList2021Entry",
    },
    metadata: {
      protocol: "AxiomID",
      version: "1.0.0",
    },
  };

  const privateKey = createPrivateKey(issuerPrivateKeyPem);
  const proofValue = sign(null, Buffer.from(JSON.stringify(credential)), privateKey).toString("hex");

  const manifest = {
    ...credential,
    proof: {
      type: "Ed25519Signature2018",
      verificationMethod: "did:axiom:issuer#key-1",
      proofPurpose: "assertionMethod",
      created: issuanceDate,
      proofValue,
    },
  };

  return apiSuccess(manifest, 200, {
    "Content-Type": "application/ld+json",
    "Cache-Control": "public, max-age=300",
  });
}
