import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";

// PAI Verification Request Schema
const PaiVerifyRequestSchema = z.object({
  did: z.string().min(1, "DID is required"),
  credential: z.object({
    type: z.array(z.string()).min(1),
    issuer: z.string().url("Issuer must be a valid URL"),
    issuanceDate: z.string().datetime("Invalid issuance date"),
    expirationDate: z.string().datetime().optional(),
    credentialSubject: z.object({
      id: z.string().min(1),
      paiHandle: z.string().optional(),
      verified: z.boolean().optional(),
    }),
    proof: z.object({
      type: z.string(),
      created: z.string().datetime(),
      verificationMethod: z.string().url(),
      proofPurpose: z.string(),
      proofValue: z.string(),
    }),
  }),
  challenge: z.string().optional(),
});

type PaiVerifyRequest = z.infer<typeof PaiVerifyRequestSchema>;

/**
 * POST /verify
 * Handle PAI verification requests — accepts pai:// protocol payloads
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientIp = getClientIp(request);

  try {
    // Rate limiting (10 req/min per IP)
    const rateResult = await checkRateLimit(clientIp, { maxRequests: 10, windowMs: 60_000 });
    if (!rateResult.allowed) {
      return NextResponse.json(
        { success: false, verified: false, did: "", timestamp: new Date().toISOString(), message: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = PaiVerifyRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, verified: false, did: "", timestamp: new Date().toISOString(), errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { did, credential, challenge } = validationResult.data;

    // Optional auth — if token provided, verify DID matches
    const auth = await requireAuth(request);
    if (auth.user && auth.user.did !== did) {
      return NextResponse.json(
        { success: false, verified: false, did, timestamp: new Date().toISOString(), message: "DID mismatch" },
        { status: 403 }
      );
    }

    // Perform PAI credential verification
    const verificationResult = await verifyPaiCredential(credential, did, challenge);

    // Store verification record via Prisma
    const verificationId = crypto.randomUUID();
    try {
      await prisma.paiVerification.create({
        data: {
          id: verificationId,
          did,
          credential: credential as object,
          challenge: challenge ?? null,
          verified: verificationResult.verified,
          message: verificationResult.message,
          errors: verificationResult.errors ?? [],
          clientIp,
          authenticated: !!auth.user,
          durationMs: Date.now() - startTime,
        },
      });
    } catch (dbErr) {
      console.error("[PAI Verify] DB store failed:", dbErr);
    }

    return NextResponse.json({
      success: true,
      verified: verificationResult.verified,
      did,
      timestamp: new Date().toISOString(),
      verificationId,
      message: verificationResult.message,
      errors: verificationResult.errors,
    });
  } catch (error) {
    console.error("[PAI Verify] Error:", error);
    return NextResponse.json(
      { success: false, verified: false, did: "", timestamp: new Date().toISOString(), message: "Internal verification error" },
      { status: 500 }
    );
  }
}

/**
 * Verify PAI credential — checks DID match, expiry, proof, issuer trust
 */
async function verifyPaiCredential(
  credential: PaiVerifyRequest["credential"],
  expectedDid: string,
  challenge?: string
): Promise<{ verified: boolean; message?: string; errors?: string[] }> {
  const errors: string[] = [];

  // 1. DID match
  if (credential.credentialSubject.id !== expectedDid) {
    errors.push("Credential subject DID mismatch");
  }

  // 2. Expiration
  if (credential.expirationDate && new Date(credential.expirationDate) < new Date()) {
    errors.push("Credential has expired");
  }

  // 3. Future issuance
  if (new Date(credential.issuanceDate) > new Date()) {
    errors.push("Credential issuance date is in the future");
  }

  // 4. Proof structure
  if (!credential.proof?.proofValue || !credential.proof?.verificationMethod) {
    errors.push("Missing proofValue or verificationMethod");
  }

  // 5. Cryptographic proof
  if (!(await verifyProof(credential))) {
    errors.push("Cryptographic proof verification failed");
  }

  // 6. Challenge freshness
  if (challenge && !(await verifyChallenge(credential, challenge))) {
    errors.push("Challenge verification failed");
  }

  // 7. Trusted issuer
  if (!(await isTrustedPaiIssuer(credential.issuer))) {
    errors.push("Issuer is not trusted");
  }

  const verified = errors.length === 0;
  return { verified, message: verified ? "PAI credential verified" : "PAI credential verification failed", errors: errors.length > 0 ? errors : undefined };
}

/** Verify cryptographic proof on credential using Ed25519 */
async function verifyProof(credential: PaiVerifyRequest["credential"]): Promise<boolean> {
  if (!credential.proof?.proofValue || !credential.proof?.verificationMethod) return false;
  if (credential.proof.type !== "Ed25519Signature2020") return false;

  try {
    // ponytail: cryptographic verification — NOT LLM-judged.
    // This is a security boundary. Deterministic crypto only.
    const proofValue = credential.proof.proofValue;
    const doc = JSON.stringify({
      type: credential.type,
      issuer: credential.issuer,
      issuanceDate: credential.issuanceDate,
      credentialSubject: credential.credentialSubject,
    });
    const encoder = new TextEncoder();
    const keyBytes = new Uint8Array(
      (credential.proof.verificationMethod.match(/.{1,2}/g) ?? [])
        .map((b: string) => parseInt(b, 16))
        .filter((n: number) => !isNaN(n))
    );

    // Use Web Crypto API for Ed25519 verification
    const signature = Uint8Array.from(atob(proofValue), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    return await crypto.subtle.verify("Ed25519", key, signature, encoder.encode(doc));
  } catch {
    return false;
  }
}

/** Verify challenge binding */
async function verifyChallenge(_credential: PaiVerifyRequest["credential"], _challenge: string): Promise<boolean> {
  // TODO: Implement challenge verification
  return true;
}

/** Check if issuer is a trusted PAI issuer */
async function isTrustedPaiIssuer(issuer: string): Promise<boolean> {
  const trustedIssuers = ["https://identity.pai.network", "https://verifier.axiomid.app"];
  return trustedIssuers.includes(issuer) || issuer.endsWith(".pai.network");
}
