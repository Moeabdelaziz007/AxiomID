/**
 * Reputation and trust types for PAI agents.
 */

export type TrustLevel = "excellent" | "good" | "fair" | "poor" | "unknown";

export interface TrustScore {
  readonly value: number;
  readonly level: TrustLevel;
  readonly factors: TrustFactor[];
  readonly breakdown: {
    readonly identity: number;
    readonly reliability: number;
    readonly volume: number;
    readonly disputes: number;
  };
  readonly lastUpdated: string;
}

export interface TrustFactor {
  readonly name: string;
  readonly description: string;
  readonly weight: number;
  readonly score: number;
  readonly status: "positive" | "negative" | "neutral";
}

export interface ReputationProof {
  readonly subject: string;
  readonly score: number;
  readonly proofHash: string;
  readonly chainRoot: string;
  readonly timestamp: string;
}

export interface TrustChainEntry {
  readonly index: number;
  readonly agentDid: string;
  readonly action: string;
  readonly timestamp: string;
  readonly intention?: string;
  readonly previousHash: string;
  readonly hash: string;
}
