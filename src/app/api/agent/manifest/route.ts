import { NextRequest, NextResponse } from "next/server";
import { createPrivateKey, sign } from "crypto";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { createUserDid, createIssuerDid } from "@/lib/did";

function getIssuerPrivateKey(): { key: string; alg: string } {
  const key = process.env.ISSUER_PRIVATE_KEY;
  if (!key) throw new Error("ISSUER_PRIVATE_KEY not set");
  // Determine algorithm from key type
  const alg = key.includes("Ed25519") ? "EdDSA" : key.includes("RSA") ? "RS256" : "EdDSA";
  return { key, alg };
}

const MANIFEST_RATE_LIMIT = { windowMs: 60_000, maxRequests: 10 };

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`manifest:${ip}`, MANIFEST_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Too many requests." }, { status: 429 });
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  const existingUser = await prisma.user.findUnique({
    where: { piUid: user.piUid },
    select: { id: true, walletAddress: true, did: true, piUsername: true, tier: true, xp: true },
  });

  if (!existingUser) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  const subjectId = existingUser.did || createUserDid(existingUser.id);
  const issuanceDate = new Date();
  const expirationDate = new Date(issuanceDate.getTime() + 24 * 60 * 60 * 1000); // 24h expiry

  const issuerDid = createIssuerDid();

  const manifest = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials#issuer",
    ],
    type: ["VerifiableCredential", "AgentFacts"],
    issuer: {
      id: issuerDid,
      name: "AxiomID Protocol",
      image: "https://axiomid.app/icon-512x512.png",
    },
    issuanceDate: issuanceDate.toISOString(),
    expirationDate: expirationDate.toISOString(),
    credentialSubject: {
      id: subjectId,
      type: "AgentIdentity",
      name: existingUser.piUsername || "AxiomID Agent",
      description: "DID-based agent identity verified through AxiomID protocol",
      network: "Pi Network",
      tier: existingUser.tier,
      capabilities: ["kya-verification", "kyc-verification", "trust-scoring"],
      trustFramework: {
        name: "AxiomID Trust Framework",
        version: "1.0",
        tiers: ["Visitor", "Citizen", "Validator", "Sovereign"],
      },
    },
    credentialStatus: {
      id: `https://axiomid.app/api/credential-status?credentialId=${subjectId}`,
      type: "StatusList2021Entry",
      statusPurpose: "revocation",
      statusListIndex: "0",
      statusListCredential: "https://axiomid.app/api/credential-status",
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
  let proofType: string;
  try {
    const dataToSign = JSON.stringify(manifest, null, 0);
    const { key: pemKey, alg } = getIssuerPrivateKey();
    const key = createPrivateKey({
      key: pemKey,
      format: "pem",
      type: "pkcs8",
    });

    if (alg === "EdDSA" && key.asymmetricKeyType === "ed25519") {
      signature = sign(null, Buffer.from(dataToSign), key).toString("hex");
      proofType = "Ed25519Signature2020";
    } else if (alg === "RS256" && key.asymmetricKeyType === "rsa") {
      signature = sign("sha256", Buffer.from(dataToSign), key).toString("hex");
      proofType = "RsaSignature2018";
    } else {
      // Mismatch: key type doesn't match expected algorithm
      console.error(`[MANIFEST] Key type ${key.asymmetricKeyType} doesn't match expected algorithm ${alg}`);
      return NextResponse.json({ error: "Key algorithm mismatch" }, { status: 500 });
    }
  } catch (e) {
    console.error("Failed to sign manifest:", e);
    return NextResponse.json({ error: "Internal cryptographic signing failure" }, { status: 500 });
  }

  const signedManifest = {
    ...manifest,
    proof: {
      type: proofType,
      created: issuanceDate.toISOString(),
      expires: expirationDate.toISOString(),
      verificationMethod: `${issuerDid}#key-1`,
      proofPurpose: "assertionMethod",
      proofValue: signature,
    },
  };

  return NextResponse.json(signedManifest, {
    headers: {
      "Content-Type": "application/ld+json",
      "Cache-Control": "private, max-age=300",
    },
  });
}
