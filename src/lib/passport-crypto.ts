/* eslint-disable @typescript-eslint/no-explicit-any */
import { sign, verify, createPrivateKey, createPublicKey } from 'crypto';

/**
 * Gets the Issuer's Private Key for VC signing.
 * Throws if env is missing — no fallback in production.
 */
function getIssuerPrivateKey(): string {
  const privateKey = process.env.ISSUER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      'Cryptographic Error: ISSUER_PRIVATE_KEY environment variable is not set. ' +
      'Generate Ed25519 keys with: openssl genpkey -algorithm Ed25519 -outform PEM'
    );
  }
  return privateKey;
}

/**
 * Gets the Issuer's Public Key for VC validation.
 * Throws if env is missing — no fallback in production.
 */
export function getIssuerPublicKey(): string {
  const publicKey = process.env.ISSUER_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error(
      'Cryptographic Error: ISSUER_PUBLIC_KEY environment variable is not set. ' +
      'Extract public key with: openssl pkey -in private.pem -pubout'
    );
  }
  return publicKey;
}

/**
 * Interface representing the Verifiable Credential Passport for an Agent.
 */
export interface AgentPassportVC {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: {
    id: string;
    owner: string;
    privilegeLevel: number;
    allowedToolsets: string[];
    spendLimits: {
      dailyTokenLimit: number;
      maxUsdcPerTx: number;
    };
    deadhandEndpoint: string;
  };
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  };
}

/**
 * Sorts object keys recursively to ensure deterministic JSON canonicalization.
 */
function canonicalizeObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeObject);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: any = {};
  for (const key of sortedKeys) {
    result[key] = canonicalizeObject(obj[key]);
  }
  return result;
}

/**
 * Issue a signed Verifiable Credential (Agent Passport) using Ed25519.
 */
export function issueAgentPassport(
  agentPublicId: string,
  ownerWallet: string,
  allowedToolsets: string[] = ['file', 'terminal', 'git_sovereign'],
  customDid?: string
): AgentPassportVC {
  const issuanceDate = new Date().toISOString();
  
  const credentialSubject = {
    id: customDid || `did:axiom:axiomid.app:${agentPublicId}`,
    owner: ownerWallet,
    privilegeLevel: 1,
    allowedToolsets: allowedToolsets,
    spendLimits: {
      dailyTokenLimit: 500000,
      maxUsdcPerTx: 10,
    },
    deadhandEndpoint: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/agent/pause`,
  };

  // Deterministically canonicalize and serialize data to sign (JCS style)
  const canonicalSubject = canonicalizeObject(credentialSubject);
  const dataToSign = JSON.stringify(canonicalSubject, null, 0);
  const privateKeyPem = getIssuerPrivateKey();

  let signature = '';
  try {
    const key = createPrivateKey({
      key: privateKeyPem,
      format: 'pem',
      type: 'pkcs8',
    });
    signature = sign(null, Buffer.from(dataToSign), key).toString('hex');
  } catch (error) {
    console.error('Error signing Agent Passport VC:', error);
    throw new Error('Cryptographic signature generation failed.');
  }

  return {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: `urn:uuid:${crypto.randomUUID()}`,
    type: ['VerifiableCredential', 'AgentPassportCredential'],
    issuer: 'did:axiom:axiomid.app:root',
    issuanceDate,
    credentialSubject,
    proof: {
      type: 'Ed25519Signature2020',
      created: issuanceDate,
      verificationMethod: 'did:axiom:axiomid.app:root#key-1',
      proofPurpose: 'assertionMethod',
      proofValue: signature,
    },
  };
}

/**
 * Verifies a signature from an Agent using their stored Ed25519 Public Key.
 * Used for verifying Deadhand trigger requests.
 */
export function verifyAgentSignature(
  message: string,
  signatureHex: string,
  publicKeyPem: string
): boolean {
  try {
    let formattedKey = publicKeyPem.trim();
    if (!formattedKey.includes('-----BEGIN PUBLIC KEY-----')) {
      formattedKey = `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`;
    }

    const key = createPublicKey({
      key: formattedKey,
      format: 'pem',
      type: 'spki',
    });

    const signatureBuffer = Buffer.from(signatureHex, 'hex');
    const messageBuffer = Buffer.from(message);

    return verify(null, messageBuffer, key, signatureBuffer);
  } catch (error) {
    console.error('Cryptographic verification failed for Agent signature:', error);
    return false;
  }
}
