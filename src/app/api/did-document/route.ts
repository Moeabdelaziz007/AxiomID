import { NextRequest, NextResponse } from "next/server";
import { createIssuerDid } from "@/lib/did";
import { buildDidDocument } from "@/lib/did-document";
import { resolveDid } from "@/lib/did-resolver";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const didParam = searchParams.get("did");

  // If a specific DID is requested, resolve it from DB
  if (didParam) {
    const user = await resolveDid(didParam);

    if (!user) {
      return NextResponse.json({ error: "DID not found" }, { status: 404 });
    }

    if (!user.did) {
      return NextResponse.json({ error: "User has no DID configured" }, { status: 400 });
    }

    try {
      const doc = buildDidDocument(user.did);
      return NextResponse.json(doc, {
        headers: {
          "Content-Type": "application/did+ld+json",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
        },
      });
    } catch (err) {
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 500 }
      );
    }
  }

  // No DID param → return issuer DID Document
  const publicKeyPem = process.env.ISSUER_PUBLIC_KEY;
  if (!publicKeyPem) {
    return NextResponse.json({ error: "ISSUER_PUBLIC_KEY not configured" }, { status: 500 });
  }

  const issuerDid = createIssuerDid();

  try {
    const doc = buildDidDocument(issuerDid, publicKeyPem);
    return NextResponse.json(doc, {
      headers: {
        "Content-Type": "application/did+ld+json",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
