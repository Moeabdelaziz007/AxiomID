import { NextResponse } from "next/server";
import { createPrivateKey, sign } from "crypto";

function getIssuerPrivateKey(): string {
  const key = process.env.ISSUER_PRIVATE_KEY;
  if (!key) throw new Error("ISSUER_PRIVATE_KEY not set");
  return key;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "anonymous";
  const issuanceDate = new Date().toISOString();

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
    issuanceDate,
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

  let signature: string;
  try {
    const dataToSign = JSON.stringify(manifest, null, 0);
    const key = createPrivateKey({
      key: getIssuerPrivateKey(),
      format: "pem",
      type: "pkcs8",
    });
    signature = sign(null, Buffer.from(dataToSign), key).toString("hex");
  } catch (e) {
    console.error("Failed to sign manifest:", e);
    return NextResponse.json({ error: "Internal cryptographic signing failure" }, { status: 500 });
  }

  const signedManifest = {
    ...manifest,
    proof: {
      type: "Ed25519Signature2020",
      created: issuanceDate,
      verificationMethod: "did:axiom:axiomid.app:issuer#key-1",
      proofPurpose: "assertionMethod",
      proofValue: signature,
    },
  };

  return NextResponse.json(signedManifest, {
    headers: {
      "Content-Type": "application/ld+json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
