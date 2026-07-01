import { createPrivateKey, sign } from "crypto";
import { createIssuerDid } from "./did";
import { canonicalize } from "./sanitize";
import { getIssuerPrivateKey } from "./crypto";
import { z } from "zod";

const W3C_CONTEXT = [
  "https://www.w3.org/2018/credentials/v1",
  "https://w3id.org/security/suites/ed25519-2020/v1",
];

interface CredentialBase {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: Record<string, unknown>;
}

function signCredential(credential: CredentialBase): {
  "@context": string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: Record<string, unknown>;
  proof: { type: string; created: string; verificationMethod: string; proofPurpose: string; proofValue: string };
} {
  const issuanceDate = new Date(credential.issuanceDate);
  const dataToSign = JSON.stringify(canonicalize({ "@context": W3C_CONTEXT, ...credential }), null, 0);
  const { key: pemKey, alg } = getIssuerPrivateKey();
  const key = createPrivateKey({ key: pemKey, format: "pem", type: "pkcs8" });

  let signature: string;
  let proofType: string;

  if (alg === "EdDSA" && key.asymmetricKeyType === "ed25519") {
    signature = sign(null, Buffer.from(dataToSign), key).toString("hex");
    proofType = "Ed25519Signature2020";
  } else if (alg === "RS256" && key.asymmetricKeyType === "rsa") {
    signature = sign("sha256", Buffer.from(dataToSign), key).toString("hex");
    proofType = "RsaSignature2018";
  } else {
    throw new Error(`Key type ${key.asymmetricKeyType} doesn't match expected algorithm ${alg}`);
  }

  return {
    "@context": W3C_CONTEXT,
    ...credential,
    proof: {
      type: proofType,
      created: issuanceDate.toISOString(),
      verificationMethod: `${credential.issuer}#key-1`,
      proofPurpose: "assertionMethod",
      proofValue: signature,
    },
  };
}

const SignSocialCredentialParamsSchema = z.object({
  userId: z.string().min(1),
  userDid: z.string().min(1),
  platform: z.string().min(1),
  handle: z.string().min(1),
  walletAddress: z.string().min(1),
});

export function signSocialCredential(
  userId: string,
  userDid: string,
  platform: string,
  handle: string,
  walletAddress: string
) {
  SignSocialCredentialParamsSchema.parse({ userId, userDid, platform, handle, walletAddress });

  const issuanceDate = new Date().toISOString();
  const issuerDid = createIssuerDid();

  return signCredential({
    id: `${userDid}#social-${platform}`,
    type: ["VerifiableCredential", "SocialIdentityCredential"],
    issuer: issuerDid,
    issuanceDate,
    credentialSubject: { id: userDid, platform, handle, walletAddress },
  });
}

export function signPassportCredential(
  userId: string,
  userDid: string,
  passportData: {
    username: string;
    xp: number;
    tier: string;
    trustScore: number;
    kyaStatus: string;
    kycStatus: string;
  }
) {
  const issuanceDate = new Date().toISOString();
  const issuerDid = createIssuerDid();

  return signCredential({
    id: `${userDid}#passport-attestation`,
    type: ["VerifiableCredential", "AxiomPassportCredential"],
    issuer: issuerDid,
    issuanceDate,
    credentialSubject: { id: userDid, ...passportData },
  });
}

const SignAgentAttestationCredentialParamsSchema = z.object({
  agentDid: z.string().min(1),
  codeHash: z.string().regex(/^[a-fA-F0-9]{64}$/, "Must be a valid SHA-256 hash"),
  astAuditStatus: z.enum(["passed", "failed"]),
  unsafeFunctionsCount: z.number().int().nonnegative(),
});

export function signAgentAttestationCredential(
  agentDid: string,
  attestation: {
    codeHash: string;
    astAuditStatus: "passed" | "failed";
    unsafeFunctionsCount: number;
  }
) {
  SignAgentAttestationCredentialParamsSchema.parse({
    agentDid,
    ...attestation,
  });

  const issuanceDate = new Date().toISOString();
  const issuerDid = createIssuerDid();

  return signCredential({
    id: `${agentDid}#agent-attestation`,
    type: ["VerifiableCredential", "AxiomAgentAttestationCredential"],
    issuer: issuerDid,
    issuanceDate,
    credentialSubject: { id: agentDid, ...attestation },
  });
}

