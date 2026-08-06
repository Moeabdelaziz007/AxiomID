import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { apiError, apiSuccess } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { TrustChain } from "@/lib/trustchain";
import { deriveKeypair, signData, verifySignature } from "@axiomid/crypto";
import { piNetwork } from "@/lib/pi-sdk";

export const dynamic = "force-dynamic";

interface PiSignInPayload {
  accessToken: string;
  piUid: string;
  username: string;
  walletAddress?: string;
}

interface AIPIdentity {
  did: string;
  piUid: string;
  username: string;
  publicKey: string;
  verificationMethod: string;
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  };
  trustChainAnchor: string;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `aip_signin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    // 1. Verify Pi Sign-In access token
    const body = await req.json() as PiSignInPayload;
    const { accessToken, piUid, username, walletAddress } = body;

    if (!accessToken || !piUid) {
      return apiError("VALIDATION_ERROR", "accessToken and piUid are required", { status: 400 });
    }

    // 2. Verify Pi Sign-In token with Pi Network
    const piUser = await piNetwork.verifySignIn(accessToken);
    
    if (!piUser || piUser.uid !== piUid) {
      logger.warn("Pi Sign-In verification failed", { requestId, piUid });
      return apiError("UNAUTHORIZED", "Invalid Pi Sign-In token", { status: 401 });
    }

    logger.info("Pi Sign-In verified", { requestId, piUid, username: piUser.username });

    // 3. Generate AIP DID: did:axiomid:pi:<uid>
    const aipDid = `did:axiomid:pi:${piUid}`;

    // 4. Derive Ed25519 keypair from Pi UID + SOVEREIGN_KEY_SALT
    const keypair = await deriveKeypair(
      `did:axiomid:pi:${piUid}`,
      process.env.SOVEREIGN_KEY_SALT!
    );

    // 5. Create AIP Identity Credential (W3C VC format)
    const aipCredential = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://axiomid.org/aip/v1"
      ],
      id: `urn:uuid:${crypto.randomUUID()}`,
      type: ["VerifiableCredential", "AxiomIdentityCredential"],
      issuer: "did:axiomid:pinetwork-issuer",
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: `did:axiomid:pi:${piUid}`,
        piUid,
        username: piUser.username || username,
        walletAddress: piUser.walletAddress || walletAddress,
        publicKey: Buffer.from(keypair.publicKey).toString("base64"),
        verificationMethod: "Ed25519Signature2020",
        piNetworkProfile: {
          uid: piUser.uid,
          username: piUser.username,
          walletAddress: piUser.walletAddress,
          verified: true
        }
      }
    };

    // 6. Sign the AIP credential with Ed25519
    const encoder = new TextEncoder();
    const signatureBuffer = await signData(
      keypair.privateKey,
      encoder.encode(JSON.stringify(aipCredential))
    );
    const proofSignature = Buffer.from(signatureBuffer).toString("base64");

    const aipIdentity: AIPIdentity = {
      did: `did:axiomid:pi:${piUid}`,
      piUid,
      username: piUser.username || username,
      publicKey: Buffer.from(keypair.publicKey).toString("base64"),
      verificationMethod: "Ed25519Signature2020",
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: `did:axiomid:pi:${piUid}#keys-1`,
        proofPurpose: "assertionMethod",
        proofValue: proofSignature
      },
      trustChainAnchor: ""
    };

    // 7. Anchor to TrustChain
    const trustChainEntry = await TrustChain.append({
      type: "identity_created",
      actor: `did:axiomid:pi:${piUid}`,
      target: `did:axiomid:pi:${piUid}`,
      data: {
        aipDid: `did:axiomid:pi:${piUid}`,
        piUid,
        username: piUser.username || username,
        publicKey: aipIdentity.publicKey,
        piNetworkVerified: true,
        credential: aipCredential
      },
      metadata: {
        priority: "high",
        tags: ["pi_signin", "aip", "identity_creation", "trustchain_anchor"]
      }
    });

    aipIdentity.trustChainAnchor = trustChainEntry.hash;

    // 7. Record in TrustChain with Ed25519 signature
    await TrustChain.append({
      type: "aip_identity_anchored",
      actor: `did:axiomid:pi:${piUid}`,
      target: `did:axiomid:pi:${piUid}`,
      data: {
        did: aipIdentity.did,
        trustChainEntryHash: trustChainEntry.hash,
        publicKey: aipIdentity.publicKey,
        proof: aipIdentity.proof,
        piNetworkUid: piUid
      },
      metadata: {
        tags: ["aip", "trustchain_anchor", "ed25519"]
      }
    });

    // 8. Store in Pi Network user profile (if API supports)
    try {
      await piNetwork.updateUserProfile(accessToken, {
        aipDid: aipIdentity.did,
        publicKey: aipIdentity.publicKey,
        trustChainAnchor: trustChainEntry.hash
      });
    } catch (profileError) {
      logger.warn("Failed to update Pi Network profile", { requestId, error: profileError });
    }

    logger.info("AIP identity created from Pi Sign-In", {
      requestId,
      aipDid: aipIdentity.did,
      trustChainAnchor: trustChainEntry.hash
    });

    return apiSuccess({
      success: true,
      aipIdentity: {
        did: aipIdentity.did,
        piUid: aipIdentity.piUid,
        username: aipIdentity.username,
        publicKey: aipIdentity.publicKey,
        verificationMethod: aipIdentity.verificationMethod,
        proof: aipIdentity.proof,
        trustChainAnchor: aipIdentity.trustChainAnchor
      },
      trustChainEntry: {
        hash: trustChainEntry.hash,
        index: trustChainEntry.index,
        timestamp: trustChainEntry.timestamp
      }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("AIP Sign-In failed", { requestId, error: message });
    
    return apiError("INTERNAL_ERROR", "Failed to create AIP identity from Pi Sign-In", {
      status: 500,
      details: { requestId, message }
    });
  }
}

// GET endpoint for resolving AIP DID
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const did = searchParams.get("did");

    if (!did || !did.startsWith("did:axiomid:pi:")) {
      return apiError("VALIDATION_ERROR", "Valid did:axiomid:pi:<uid> required", { status: 400 });
    }

    const piUid = did.replace("did:axiomid:pi:", "");
    
    // Query TrustChain for this identity
    const entries = await TrustChain.query({
      target: `did:axiomid:pi:${piUid}`,
      types: ["identity_created", "aip_identity_anchored"],
      limit: 10
    });

    if (entries.length === 0) {
      return apiError("NOT_FOUND", "AIP identity not found", { status: 404 });
    }

    const latestEntry = entries[0];

    return apiSuccess({
      did,
      piUid,
      trustChainEntries: entries.map(e => ({
        hash: e.hash,
        index: e.index,
        timestamp: e.timestamp,
        type: e.payload?.type,
        data: e.payload?.data
      })),
      latestAnchor: latestEntry.hash
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return apiError("INTERNAL_ERROR", "Failed to resolve AIP DID", {
      status: 500,
      details: { message }
    });
  }
}