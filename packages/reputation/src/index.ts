/**
 * @pai/reputation — TrustChain + Eigenvector reputation for agents
 * Part of PAI Identity Primitive (AxiomID → PAI).
 */

export type {
  TrustScore,
  TrustFactor,
  ReputationProof,
  TrustChainEntry,
  TrustLevel,
} from "./types.js";

export { TrustChain } from "./trust-chain.js";
export { EigenvectorReputation, calculateTrustScore } from "./eigenvector.js";
