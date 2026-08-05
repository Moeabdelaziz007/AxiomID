export interface DidProof {
  type: 'Ed25519Signature2020' | 'Ed25519VerificationKey2020';
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string; // Base64 or Hex signature bytes
}

export interface DidDocument {
  id: string;
  verificationMethod: {
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase?: string;
    publicKeyJwk?: JsonWebKey;
  }[];
  authentication?: string[];
  proof?: DidProof;
  created?: string;
  revoked?: boolean;
}

export interface DidValidationResult {
  valid: boolean;
  did: string;
  reason?: string;
  trustScore: number; // 0 to 100
  cryptoVerified?: boolean;
}

export interface SybilAgentBehavior {
  agentId: string;
  requestFrequencyPerMin: number;
  distinctRecipients: number;
  payloadEntropyScore: number;
  suspiciousKeywordsCount: number;
}

export interface SybilDetectionResult {
  isScammerBot: boolean;
  riskScore: number; // 0 (Legit) to 100 (Scammer)
  flags: string[];
}

export interface CodeCloneResult {
  isFakeOrPlagiarized: boolean;
  similarityScore: number; // 0.0 to 1.0
  hasMaliciousPayload: boolean;
  detectedThreats: string[];
}
