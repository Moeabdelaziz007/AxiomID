import type { Env } from "../lib/types";
import { jsonResponse, errorResponse } from "../lib/auth";

interface VerifiableCredential {
  "@context": string[];
  id?: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: Record<string, unknown>;
  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws?: string;
    proofValue?: string;
  };
}

interface VerificationCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export async function handleVcVerify(request: Request, _env: Env): Promise<Response> {
  try {
    let body: { verifiableCredential?: VerifiableCredential };
    try {
      body = await request.json<{ verifiableCredential?: VerifiableCredential }>();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    if (!body.verifiableCredential) {
      return errorResponse("Missing verifiableCredential field", 400);
    }

    const vc = body.verifiableCredential;
    const checks: VerificationCheck[] = [];

    checkContext(vc, checks);
    checkType(vc, checks);
    checkIssuer(vc, checks);
    checkIssuanceDate(vc, checks);
    checkExpirationDate(vc, checks);
    checkProof(vc, checks);
    checkCredentialSubject(vc, checks);

    const verified = checks.every((c) => c.passed);

    return jsonResponse({
      verified,
      checks,
      summary: {
        total: checks.length,
        passed: checks.filter((c) => c.passed).length,
        failed: checks.filter((c) => !c.passed).length,
      },
      verifiableCredential: {
        id: vc.id || null,
        type: vc.type,
        issuer: vc.issuer,
        issuanceDate: vc.issuanceDate,
      },
    });
  } catch (err) {
    console.error("[VC] Verify error:", err instanceof Error ? err.message : "Unknown error");
    return errorResponse("Verification failed", 500);
  }
}

function checkContext(vc: VerifiableCredential, checks: VerificationCheck[]): void {
  if (!Array.isArray(vc["@context"]) || vc["@context"].length === 0) {
    checks.push({ name: "@context", passed: false, detail: "Missing or empty @context array" });
    return;
  }
  if (!vc["@context"].includes("https://www.w3.org/2018/credentials/v1")) {
    checks.push({ name: "@context", passed: false, detail: "Missing W3C Verifiable Credentials context (https://www.w3.org/2018/credentials/v1)" });
    return;
  }
  checks.push({ name: "@context", passed: true, detail: `Contains ${vc["@context"].length} context(s) including W3C VC base` });
}

function checkType(vc: VerifiableCredential, checks: VerificationCheck[]): void {
  if (!Array.isArray(vc.type) || vc.type.length === 0) {
    checks.push({ name: "type", passed: false, detail: "Missing or empty type array" });
    return;
  }
  if (!vc.type.includes("VerifiableCredential")) {
    checks.push({ name: "type", passed: false, detail: "Missing VerifiableCredential type" });
    return;
  }
  checks.push({ name: "type", passed: true, detail: `Types: ${vc.type.join(", ")}` });
}

function checkIssuer(vc: VerifiableCredential, checks: VerificationCheck[]): void {
  if (!vc.issuer || typeof vc.issuer !== "string") {
    checks.push({ name: "issuer", passed: false, detail: "Missing or invalid issuer (must be a string DID)" });
    return;
  }
  if (!vc.issuer.startsWith("did:")) {
    checks.push({ name: "issuer", passed: false, detail: `Issuer is not a DID: ${vc.issuer}` });
    return;
  }
  checks.push({ name: "issuer", passed: true, detail: `Issuer DID: ${vc.issuer}` });
}

function checkIssuanceDate(vc: VerifiableCredential, checks: VerificationCheck[]): void {
  if (!vc.issuanceDate) {
    checks.push({ name: "issuanceDate", passed: false, detail: "Missing issuanceDate" });
    return;
  }
  const ts = Date.parse(vc.issuanceDate);
  if (isNaN(ts)) {
    checks.push({ name: "issuanceDate", passed: false, detail: `Invalid date format: ${vc.issuanceDate}` });
    return;
  }
  if (ts > Date.now()) {
    checks.push({ name: "issuanceDate", passed: false, detail: "issuanceDate is in the future" });
    return;
  }
  checks.push({ name: "issuanceDate", passed: true, detail: `Issued: ${vc.issuanceDate}` });
}

function checkExpirationDate(vc: VerifiableCredential, checks: VerificationCheck[]): void {
  if (!vc.expirationDate) {
    checks.push({ name: "expirationDate", passed: true, detail: "No expiration date (permanent)" });
    return;
  }
  const ts = Date.parse(vc.expirationDate);
  if (isNaN(ts)) {
    checks.push({ name: "expirationDate", passed: false, detail: `Invalid date format: ${vc.expirationDate}` });
    return;
  }
  if (ts < Date.now()) {
    checks.push({ name: "expirationDate", passed: false, detail: `Credential expired: ${vc.expirationDate}` });
    return;
  }
  checks.push({ name: "expirationDate", passed: true, detail: `Expires: ${vc.expirationDate}` });
}

function checkProof(vc: VerifiableCredential, checks: VerificationCheck[]): void {
  if (!vc.proof) {
    checks.push({ name: "proof", passed: false, detail: "Missing proof object" });
    return;
  }
  const proof = vc.proof;
  if (!proof.type) {
    checks.push({ name: "proof.type", passed: false, detail: "Missing proof type" });
    return;
  }
  if (!proof.verificationMethod) {
    checks.push({ name: "proof.verificationMethod", passed: false, detail: "Missing verificationMethod" });
    return;
  }
  if (!proof.proofPurpose) {
    checks.push({ name: "proof.proofPurpose", passed: false, detail: "Missing proofPurpose" });
    return;
  }
  if (!proof.jws && !proof.proofValue) {
    checks.push({ name: "proof.value", passed: false, detail: "Missing both jws and proofValue" });
    return;
  }
  checks.push({
    name: "proof",
    passed: true,
    detail: `Type: ${proof.type}, Method: ${proof.verificationMethod}, Purpose: ${proof.proofPurpose}`,
  });
}

function checkCredentialSubject(vc: VerifiableCredential, checks: VerificationCheck[]): void {
  if (!vc.credentialSubject || typeof vc.credentialSubject !== "object" || Object.keys(vc.credentialSubject).length === 0) {
    checks.push({ name: "credentialSubject", passed: false, detail: "Missing or empty credentialSubject" });
    return;
  }
  if (!vc.credentialSubject.id) {
    checks.push({ name: "credentialSubject.id", passed: false, detail: "credentialSubject missing id field (subject DID)" });
    return;
  }
  checks.push({
    name: "credentialSubject",
    passed: true,
    detail: `Subject: ${vc.credentialSubject.id}, ${Object.keys(vc.credentialSubject).length - 1} claim(s)`,
  });
}
