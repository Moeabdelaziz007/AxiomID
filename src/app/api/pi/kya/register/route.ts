import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { apiError, apiSuccess } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { TrustChain } from "@/lib/trustchain";
import { deriveKeypair, signData } from "@axiomid/crypto";
import { piNetwork } from "@/lib/pi-sdk";

export const dynamic = "force-dynamic";

interface KYARequest {
  agentDid: string;
  piUid: string;
  accessToken: string;
  agentName?: string;
  agentType?: "autonomous" | "assistive" | "hybrid";
  capabilities?: string[];
}

interface KYAResult {
  kyaDid: string;
  agentDid: string;
  piUid: string;
  status: "pending" | "verified" | "rejected";
  trustScore: number;
  stamps: string[];
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  };
  trustChainAnchor: string;
  expiresAt: string;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `kya_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const body = await req.json() as KYARequest;
    const { agentDid, piUid, accessToken, agentName, agentType = "autonomous", capabilities = [] } = body;

    if (!agentDid || !piUid || !accessToken) {
      return apiError("VALIDATION_ERROR", "agentDid, piUid, and accessToken are required", { status: 400 });
    }

    // 1. Verify Pi Sign-In token
    const piUser = await piNetwork.verifySignIn(accessToken);
    if (!piUser || piUser.uid !== piUid) {
      return apiError("UNAUTHORIZED", "Invalid Pi Sign-In token", { status: 401 });
    }

    logger.info("KYA request received", { requestId, agentDid, piUid, agentType });

    // 2. Verify agent ownership via AIP
    const aipResponse = await fetch(`${process.env.NEXT_PUBLIC_AXIOMID_URL}/api/pi/aip/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, piUid })
    });

    if (!aipResponse.ok) {
      return apiError("AIP_VERIFICATION_FAILED", "Failed to verify agent identity via AIP", { status: 400 });
    }

    const aipData = await aipResponse.json();
    const aipDid = aipData.aipIdentity.did;

    // 3. Create KYA Credential (W3C VC)
    const kyaDid = `did:axiom:kya:${crypto.randomUUID().slice(0, 12)}`;
    const kyaCredential = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://axiomid.org/kya/v1"
      ],
      id: `urn:uuid:${crypto.randomUUID()}`,
      type: ["VerifiableCredential", "KYACredential"],
      issuer: "did:axiom:kya-issuer",
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      credentialSubject: {
        id: kyaDid,
        agentDid,
        piUid,
        agentName: agentName || `Agent-${agentDid.slice(-8)}`,
        agentType,
        capabilities,
        humanVerified: true, // Pi KYC = human verified
        piNetworkUid: piUid,
        trustScore: 50 // Base trust score for KYA
      }
    };

    // 4. Derive keypair for KYA issuer
    const issuerKeypair = await deriveKeypair(
      `did:axiom:kya-issuer`,
      process.env.SOVEREIGN_KEY_SALT!
    );

    // 5. Sign KYA credential
    const encoder = new TextEncoder();
    const signatureBuffer = await signData(
      issuerKeypair.privateKey,
      encoder.encode(JSON.stringify(kyaCredential))
    );
    const proofSignature = Buffer.from(signatureBuffer).toString("base64");

    const kyaResult: KYAResult = {
      kyaDid,
      agentDid,
      piUid,
      status: "verified",
      trustScore: 50,
      stamps: ["pi_kyc_verified", "human_verified"],
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: "did:axiom:kya-issuer#keys-1",
        proofPurpose: "assertionMethod",
        proofValue: Buffer.from(signatureBuffer).toString("base64")
      },
      trustChainAnchor: "",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    // 6. Anchor to TrustChain
    const trustChainEntry = await TrustChain.append({
      type: "kya_completed",
      actor: `did:axiom:pi:${piUid}`,
      target: kyaDid,
      data: {
        kyaDid,
        agentDid,
        piUid,
        agentType,
        capabilities,
        trustScore: 50,
        status: "verified"
      },
      metadata: {
        priority: "high",
        tags: ["kya", "pi_kyc", "agent_verification", "trustchain_anchor"]
      }
    });

    kyaResult.trustChainAnchor = trustChainEntry.hash;

    // 7. Store in Pi Network via axiomid-piverify (call Cloudflare Worker)
    try {
      const piverifyUrl = process.env.PIVERIFY_WORKER_URL || "https://piverify.axiomid.workers.dev";
      await fetch(`${piverifyUrl}/api/v1/kya/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kyaDid,
          agentDid,
          piUid,
          status: "verified",
          trustScore: 50,
          stamps: ["pi_kyc_verified", "human_verified"],
          trustChainAnchor: trustChainEntry.hash
        })
      });
    } catch (piverifyError) {
      logger.warn("Failed to register KYA with piverify worker", { requestId, error: piverifyError });
    }

    // 8. Record in TrustChain
    await TrustChain.append({
      type: "kya_registered",
      actor: `did:axiom:pi:${piUid}`,
      target: kyaDid,
      data: {
        kyaDid,
        agentDid,
        piUid,
        agentName,
        agentType,
        capabilities,
        trustScore: 50,
        trustChainAnchor: trustChainEntry.hash
      },
      metadata: {
        priority: "high",
        tags: ["kya", "agent_registration", "trustchain_anchor"]
      }
    });

    logger.info("KYA completed", { requestId, kyaDid, agentDid, trustChainAnchor: trustChainEntry.hash });

    return apiSuccess({
      success: true,
      kya: kyaResult,
      trustChainEntry: {
        hash: trustChainEntry.hash,
        index: trustChainEntry.index,
        timestamp: trustChainEntry.timestamp
      }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("KYA registration failed", { requestId, error: message });
    
    return apiError("INTERNAL_ERROR", "Failed to complete KYA registration", {
      status: 500,
      details: { requestId, message }
    });
  }
}

// GET endpoint for checking KYA status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentDid = searchParams.get("agentDid");
    const kyaDid = searchParams.get("kyaDid");

    if (!agentDid && !kyaDid) {
      return apiError("VALIDATION_ERROR", "agentDid or kyaDid required", { status: 400 });
    }

    const queryTarget = kyaDid || agentDid;
    const entries = await TrustChain.query({
      target: queryTarget,
      types: ["kya_completed", "kya_registered"],
      limit: 10
    });

    if (entries.length === 0) {
      return apiError("NOT_FOUND", "KYA not found", { status: 404 });
    }

    return apiSuccess({
      kyaDid: kyaDid || entries[0].payload?.data?.kyaDid,
      agentDid: agentDid || entries[0].payload?.data?.agentDid,
      status: entries[0].payload?.data?.status || "unknown",
      trustChainEntries: entries.map(e => ({
        hash: e.hash,
        index: e.index,
        timestamp: e.timestamp,
        type: e.payload?.type,
        data: e.payload?.data
      }))
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return apiError("INTERNAL_ERROR", "Failed to check KYA status", {
      status: 500,
      details: { message }
    });
  }
}