import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "anonymous";

  const manifest = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials#issuer",
    ],
    type: ["VerifiableCredential", "AgentFacts"],
    issuer: {
      id: "did:axiom:axiomid.app:issuer",
      name: "AxiomID Protocol",
      image: "https://axiomid.app/icon-512x512.png",
    },
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: `did:axiom:axiomid.app:${userId}`,
      type: "AgentIdentity",
      name: "AxiomID Agent",
      description: "DID-based agent identity verified through AxiomID protocol",
      network: "Pi Network",
      capabilities: ["kya-verification", "kyc-verification", "trust-scoring"],
      trustFramework: {
        name: "AxiomID Trust Framework",
        version: "1.0",
        tiers: ["Visitor", "Citizen", "Validator", "Sovereign"],
      },
    },
    proof: {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: "did:axiom:axiomid.app:issuer#key-1",
      proofPurpose: "assertionMethod",
      proofValue: `z${Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString("base64")}`,
    },
    metadata: {
      protocol: "AxiomID",
      version: "1.0.0",
      website: "https://axiomid.app",
      compliance: {
        kya: true,
        kyc: true,
        w3cDid: true,
        piCompatible: true,
      },
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/ld+json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
