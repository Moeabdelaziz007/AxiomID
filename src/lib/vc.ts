import { createPrivateKey, sign } from "crypto";
import { createIssuerDid } from "./did";
import { canonicalize } from "./sanitize";
import { getIssuerPrivateKey } from "./crypto";
import { z } from "zod";

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

  const issuanceDate = new Date();
  const issuerDid = createIssuerDid();

  const credential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
    ],
    id: `${userDid}#social-${platform}`,
    type: ["VerifiableCredential", "SocialIdentityCredential"],
    issuer: issuerDid,
    issuanceDate: issuanceDate.toISOString(),
    credentialSubject: {
      id: userDid,
      platform,
      handle,
      walletAddress,
    },
  };

  const dataToSign = JSON.stringify(canonicalize(credential), null, 0);
  const { key: pemKey, alg } = getIssuerPrivateKey();
  const key = createPrivateKey({
    key: pemKey,
    format: "pem",
    type: "pkcs8",
  });

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
    ...credential,
    proof: {
      type: proofType,
      created: issuanceDate.toISOString(),
      verificationMethod: `${issuerDid}#key-1`,
      proofPurpose: "assertionMethod",
      proofValue: signature,
    },
  };
}
