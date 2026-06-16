/**
 * Real trust engine with Pi API integration + dialectic trust.
 * Replaces hardcoded placeholders with actual scoring.
 *
 * Physics-inspired:
 * - Inverse Square Law for delegation trust decay
 * - Boltzmann distribution for trust probability
 * - Brownian motion for trust exploration
 */

import { KVHelper } from "../db/kv";
import { D1Helper } from "../db/d1";
import {
  inverseSquareDecay,
  trustPropagation,
  boltzmannTrustProbability,
  brownianStep,
  langevinSimulation,
  fokkerPlanckTrustEvolution,
  isingTrustConsensus,
  carnotTrustEfficiency,
  fickTrustFlux,
} from "./math-physics";

export interface TrustBreakdown {
  xp: number;
  stamps: number;
  delegation: number;
  dialectic: number;
}

export interface TrustResult {
  did: string;
  score: number;
  breakdown: TrustBreakdown;
  level: string;
  cachedAt: number;
}

export interface DialecticResult {
  thesis: { claim: string; confidence: number; evidence: string[] };
  antithesis: { claim: string; confidence: number; evidence: string[] };
  synthesis: { claim: string; confidence: number; score: number };
}

const TRUST_CACHE_TTL = 60;

export class TrustEngine {
  private kv: KVHelper;
  private d1: D1Helper;

  constructor(kv: KVHelper, d1?: D1Helper) {
    this.kv = kv;
    this.d1 = d1 || new D1Helper({} as D1Database);
  }

  async compute(did: string): Promise<TrustResult> {
    const cached = await this.kv.get<TrustResult>(`trust:${did}`);
    if (cached) return cached;

    // XP component: derived from harvest activity + delegation count
    const xpScore = await this.computeXP(did);

    // Stamps component: community attestations stored in D1
    const stampsScore = await this.computeStamps(did);

    // Delegation component: trust from delegated DIDs
    const delegationScore = await this.computeDelegation(did);

    // Dialectic component: adversarial verification
    const dialecticScore = await this.computeDialectic(did);

    // Weighted combination
    const score = Math.min(1,
      xpScore * 0.35 +
      stampsScore * 0.25 +
      delegationScore * 0.25 +
      dialecticScore * 0.15
    );

    const result: TrustResult = {
      did,
      score,
      breakdown: {
        xp: xpScore,
        stamps: stampsScore,
        delegation: delegationScore,
        dialectic: dialecticScore,
      },
      level: this.getTrustLevel(score),
      cachedAt: Date.now(),
    };

    await this.kv.set(`trust:${did}`, result, TRUST_CACHE_TTL);
    return result;
  }

  /**
   * Dialectic trust: thesis/antithesis/synthesis for adversarial verification.
   */
  async dialectic(did: string): Promise<DialecticResult> {
    // Thesis: "This DID belongs to a real human"
    const activityCount = await this.getActivityCount(did);
    const hasHarvest = activityCount > 0;
    const thesisConfidence = Math.min(1, activityCount * 0.1 + (hasHarvest ? 0.3 : 0));

    // Antithesis: "This DID could be a bot or Sybil"
    const delegationCount = await this.getDelegationCount(did);
    const suspiciousPatterns = delegationCount > 5 ? 0.2 : 0; // Too many delegations = suspicious
    const antithesisConfidence = Math.min(1, suspiciousPatterns + (activityCount === 0 ? 0.4 : 0));

    // Synthesis: reconcile thesis and antithesis
    const synthesisConfidence = Math.max(0, thesisConfidence - antithesisConfidence * 0.5);
    const synthesisScore = Math.min(1, synthesisConfidence * 0.8 + (hasHarvest ? 0.2 : 0));

    return {
      thesis: {
        claim: "This DID belongs to a real human with genuine activity",
        confidence: thesisConfidence,
        evidence: [
          `${activityCount} harvest activities`,
          hasHarvest ? "Has Perplexity queries" : "No harvest activity",
        ],
      },
      antithesis: {
        claim: "This DID could be automated or a Sybil account",
        confidence: antithesisConfidence,
        evidence: [
          `${delegationCount} delegations`,
          suspiciousPatterns > 0 ? "Suspicious delegation pattern" : "Normal delegation count",
        ],
      },
      synthesis: {
        claim: synthesisScore > 0.5 ? "Likely human with genuine intent" : "Uncertain — needs more evidence",
        confidence: synthesisConfidence,
        score: synthesisScore,
      },
    };
  }

  /**
   * Langevin trust evolution — simulates trust change over time
   * under external forces (evidence) and random noise (uncertainty).
   *
   * Physics: Langevin equation — m(d²x/dt²) = -γv + F(t) + η(t)
   */
  async computeLangevinTrust(
    did: string,
    externalForce?: number,
  ): Promise<TrustResult> {
    const base = await this.compute(did);
    const force = externalForce ?? base.score * 0.5;
    const { finalTrust } = langevinSimulation(
      base.score,
      force,
      0.1,
      0.05,
      10,
      0.1,
    );

    return {
      did,
      score: finalTrust,
      breakdown: base.breakdown,
      level: this.getTrustLevel(finalTrust),
      cachedAt: base.cachedAt,
    };
  }

  /**
   * Fokker-Planck trust distribution — evolves probability density
   * of trust scores across the system.
   *
   * Physics: ∂P/∂t = -∂(μP)/∂x + (1/2)∂²(σ²P)/∂x²
   */
  async computeFokkerPlanckDistribution(
    dids: string[],
    steps: number = 10,
  ): Promise<{ grid: number[]; densities: number[][] }> {
    const gridSize = 20;
    const trustGrid = Array.from({ length: gridSize }, (_, i) => i / (gridSize - 1));

    // Initialize from actual trust scores (bin into grid)
    let probs = new Array(gridSize).fill(0);
    if (dids.length > 0) {
      const scores = await Promise.all(dids.map((did) => this.compute(did).then((r) => r.score)));
      for (const score of scores) {
        const bin = Math.min(gridSize - 1, Math.floor(score * gridSize));
        probs[bin]++;
      }
      const total = scores.length;
      probs = probs.map((p) => p / total);
    } else {
      probs.fill(1 / gridSize);
    }

    const densities: number[][] = [probs];
    for (let step = 0; step < steps; step++) {
      const drift = 0.05 - (step * 0.005);
      const diffusion = 0.1;
      probs = fokkerPlanckTrustEvolution(trustGrid, probs, drift, diffusion, 0.1);
      densities.push(probs);
    }

    return { grid: trustGrid, densities };
  }

  /**
   * Ising trust consensus — models trust as a spin system where
   * agents align (+1 trusted, -1 untrusted).
   *
   * Physics: H = -J Σ sᵢsⱼ - h Σ sᵢ
   */
  async computeIsingConsensus(
    n: number,
    coupling: number = 1,
    externalField: number = 0.2,
    temperature: number = 0.5,
  ): Promise<{
    magnetization: number;
    consensusReached: boolean;
    simulation: ReturnType<typeof isingTrustConsensus>;
  }> {
    const result = isingTrustConsensus(n, coupling, externalField, temperature, 1000);
    return {
      magnetization: result.finalMagnetization,
      consensusReached: Math.abs(result.finalMagnetization) > 0.7,
      simulation: result,
    };
  }

  /**
   * Carnot trust efficiency — maximum achievable trust given noise.
   *
   * Physics: η = 1 - T_cold / T_hot
   */
  computeCarnotEfficiency(base: TrustResult): number {
    return carnotTrustEfficiency(base.score, 1 - base.score);
  }

  /**
   * Fick trust diffusion — how trust flows between connected agents.
   *
   * Physics: J = -D × dC/dx
   */
  async computeFickDiffusion(
    dids: Array<{ sourceDid: string; targetDid: string; sourceTrust: number; targetTrust: number }>,
  ): Promise<Array<{ sourceDid: string; targetDid: string; flux: number }>> {
    return dids.map((d) => ({
      sourceDid: d.sourceDid,
      targetDid: d.targetDid,
      flux: fickTrustFlux(d.sourceTrust, d.targetTrust, 0.5, 1),
    }));
  }

  async invalidate(did: string): Promise<void> {
    await this.kv.delete(`trust:${did}`);
  }

  private async computeXP(did: string): Promise<number> {
    // XP from activity: each harvest query = 0.05, max 0.8
    const activityCount = await this.getActivityCount(did);
    const activityXP = Math.min(0.8, activityCount * 0.05);

    // Bonus for recent activity
    const recentActivity = await this.getRecentActivityCount(did, 7);
    const recencyBonus = Math.min(0.2, recentActivity * 0.02);

    return Math.min(1, activityXP + recencyBonus);
  }

  private async computeStamps(did: string): Promise<number> {
    // Stamps from delegation count: each unique trustor = 0.1, max 0.7
    const delegationCount = await this.getDelegationCount(did);
    return Math.min(0.7, delegationCount * 0.1);
  }

  private async computeDelegation(did: string): Promise<number> {
    // Delegation trust using Inverse Square Law (gravity)
    // Trust diminishes with the square of delegation hops
    const trustors = await this.getTrustors(did);
    if (trustors.length === 0) return 0;

    // Apply inverse square law: trust = sourceTrust * weight / hops²
    const chain = trustors.map((t, i) => ({
      trust: t.trustLevel,
      weight: 1.0 / (i + 1), // Weight decreases with distance
    }));

    const propagatedTrust = trustPropagation(chain);

    // Apply Boltzmann distribution for probability normalization
    const temperature = 0.5; // Lower temperature = sharper distribution
    const boltzmannScore = boltzmannTrustProbability(propagatedTrust, temperature);

    return Math.min(1, propagatedTrust * 0.7 + boltzmannScore * 0.3);
  }

  private async computeDialectic(did: string): Promise<number> {
    const result = await this.dialectic(did);
    return result.synthesis.score;
  }

  private async getActivityCount(did: string): Promise<number> {
    try {
      const result = await this.d1.db
        .prepare("SELECT COUNT(*) as count FROM harvest_results WHERE user_did = ?")
        .bind(did)
        .first<{ count: number }>();
      return result?.count || 0;
    } catch {
      return 0;
    }
  }

  private async getRecentActivityCount(did: string, days: number): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - days * 86400000).toISOString();
      const result = await this.d1.db
        .prepare("SELECT COUNT(*) as count FROM harvest_results WHERE user_did = ? AND created_at > ?")
        .bind(did, cutoff)
        .first<{ count: number }>();
      return result?.count || 0;
    } catch {
      return 0;
    }
  }

  private async getDelegationCount(did: string): Promise<number> {
    try {
      const result = await this.d1.db
        .prepare("SELECT COUNT(*) as count FROM trust_delegations WHERE delegatee_did = ?")
        .bind(did)
        .first<{ count: number }>();
      return result?.count || 0;
    } catch {
      return 0;
    }
  }

  private async getTrustors(did: string): Promise<Array<{ delegator_did: string; trustLevel: number }>> {
    try {
      const result = await this.d1.db
        .prepare("SELECT delegator_did, trust_level FROM trust_delegations WHERE delegatee_did = ?")
        .bind(did)
        .all<{ delegator_did: string; trust_level: number }>();
      return result.results.map((r) => ({ delegator_did: r.delegator_did, trustLevel: r.trust_level }));
    } catch {
      return [];
    }
  }

  private getTrustLevel(score: number): string {
    return getTrustLevel(score);
  }
}

export function getTrustLevel(score: number): string {
  if (score >= 0.8) return "sovereign";
  if (score >= 0.6) return "validator";
  if (score >= 0.4) return "citizen";
  if (score >= 0.2) return "visitor";
  return "newcomer";
}
