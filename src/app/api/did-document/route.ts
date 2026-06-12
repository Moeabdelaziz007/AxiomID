import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createIssuerDid } from "@/lib/did";

function buildDidDocument(did: string, publicKeyPem?: string) {
  const doc: Record<string, unknown> = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
    ],
    id: did,
  };

  if (publicKeyPem) {
    doc.verificationMethod = [
      {
        id: `${did}#key-1`,
        type: "Ed25519VerificationKey2020",
        controller: did,
        publicKeyPem,
      },
    ];
    doc.authentication = [`${did}#key-1`];
    doc.assertionMethod = [`${did}#key-1`];
  }

  doc.service = [
    {
      id: `${did}#credential-status`,
      type: "CredentialStatusList",
      serviceEndpoint: "https://axiomid.app/api/credential-status",
    },
  ];

  return doc;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const didParam = searchParams.get("did");

  // If a specific DID is requested, resolve it from DB
  if (didParam) {
    const user = await prisma.user.findFirst({
      where: { did: didParam },
      select: { did: true, kycStatus: true },
    });

    if (!user || !user.did) {
      return NextResponse.json({ error: "DID not found" }, { status: 404 });
    }

    return NextResponse.json(buildDidDocument(user.did), {
      headers: {
        "Content-Type": "application/did+ld+json",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  }

  // No DID param → return issuer DID Document
  const publicKeyPem = process.env.ISSUER_PUBLIC_KEY;
  if (!publicKeyPem) {
    return NextResponse.json({ error: "ISSUER_PUBLIC_KEY not configured" }, { status: 500 });
  }

  const issuerDid = createIssuerDid();

  return NextResponse.json(buildDidDocument(issuerDid, publicKeyPem), {
    headers: {
      "Content-Type": "application/did+ld+json",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
