import { NextResponse } from "next/server";
import { createIssuerDid } from "@/lib/did";

export async function GET() {
  const publicKeyPem = process.env.ISSUER_PUBLIC_KEY;
  if (!publicKeyPem) {
    return NextResponse.json({ error: "ISSUER_PUBLIC_KEY not configured" }, { status: 500 });
  }

  const did = createIssuerDid();

  const didDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
    ],
    id: did,
    verificationMethod: [
      {
        id: `${did}#key-1`,
        type: "Ed25519VerificationKey2020",
        controller: did,
        publicKeyPem,
      },
    ],
    authentication: [`${did}#key-1`],
    assertionMethod: [`${did}#key-1`],
    service: [
      {
        id: `${did}#credential-status`,
        type: "CredentialStatusList",
        serviceEndpoint: "https://axiomid.app/api/credential-status",
      },
    ],
  };

  return NextResponse.json(didDocument, {
    headers: {
      "Content-Type": "application/did+ld+json",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
