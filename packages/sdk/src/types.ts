export interface Passport {
  username: string;
  walletAddress: string;
  stellarAddress: string;
  did: string;
  tier: string;
  xp: number;
  trustScore: number;
  kyaStatus: string;
  kycStatus: string;
  stamps: Stamp[];
  issuedDate: string;
  agentName: string | null;
  agentStatus: string | null;
  agentPublicKey: string | null;
}

export interface Stamp {
  type: string;
  provider: string;
}

export interface Stamps {
  kycBound: StampResult;
  walletAge: StampResult;
  [key: string]: StampResult;
}

export interface StampResult {
  verified: boolean;
  days?: number;
  details?: Record<string, unknown>;
}

export interface DIDDocument {
  "@context": string;
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase: string;
}

export interface TrustScore {
  did: string;
  score: number;
  tier: string;
  breakdown?: TrustBreakdown;
}

export interface TrustBreakdown {
  kyc: number;
  walletAge: number;
  socialRecovery: number;
  agentActivity: number;
}

export interface Skill {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: string;
  pricePi: number;
  version: string;
  installCount: number;
  avgRating: number;
  ratingCount: number;
  authorId: string;
  createdAt: string;
}

export interface SearchSkillsResponse {
  skills?: Skill[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface AxiomSDKConfig {
  network: "mainnet" | "testnet";
  apiKey?: string;
  baseUrl?: string;
}
