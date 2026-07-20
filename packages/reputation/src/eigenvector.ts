/**
 * Eigenvector centrality reputation — PageRank for agents.
 * Trust flows from trusted agents to those they interact with.
 */
import type { TrustScore, TrustFactor, TrustLevel } from "./types.js";

interface AgentNode {
  did: string;
  rawScore: number;
  outLinks: Map<string, number>;
}

export class EigenvectorReputation {
  private readonly nodes = new Map<string, AgentNode>();
  private readonly damping = 0.85;
  private readonly iterations = 20;

  addInteraction(fromDid: string, toDid: string, weight = 1): void {
    if (!this.nodes.has(fromDid)) {
      this.nodes.set(fromDid, { did: fromDid, rawScore: 1, outLinks: new Map() });
    }
    if (!this.nodes.has(toDid)) {
      this.nodes.set(toDid, { did: toDid, rawScore: 1, outLinks: new Map() });
    }
    const from = this.nodes.get(fromDid)!;
    from.outLinks.set(toDid, (from.outLinks.get(toDid) ?? 0) + weight);
  }

  computeScores(): Map<string, number> {
    const n = this.nodes.size;
    if (n === 0) return new Map();

    const scores = new Map<string, number>();
    for (const did of this.nodes.keys()) scores.set(did, 1 / n);

    for (let i = 0; i < this.iterations; i++) {
      const next = new Map<string, number>();
      for (const [did, currentScore] of scores) next.set(did, (1 - this.damping) / n);

      for (const [did, node] of this.nodes) {
        const outWeight = [...node.outLinks.values()].reduce((a, b) => a + b, 0);
        if (outWeight === 0) continue;
        for (const [target, weight] of node.outLinks) {
          const currentScore = scores.get(did) ?? 0;
          const contribution = (this.damping * currentScore * weight) / outWeight;
          next.set(target, (next.get(target) ?? 0) + contribution);
        }
      }

      scores.clear();
      for (const [k, v] of next) scores.set(k, v);
    }

    const max = Math.max(...scores.values(), 1);
    const normalized = new Map<string, number>();
    for (const [did, score] of scores) normalized.set(did, Math.round((score / max) * 100));
    return normalized;
  }

  scoreFor(did: string): number {
    const scores = this.computeScores();
    return scores.get(did) ?? 0;
  }
}

export function calculateTrustScore(
  xpScore: number,
  stampScore: number,
  tenureScore = 0,
  semanticTrust = 0,
): TrustScore {
  const value = Math.round(
    xpScore * 0.5 + stampScore * 0.2 + tenureScore * 0.1 + semanticTrust * 0.2,
  );

  const factors: TrustFactor[] = [
    { name: "XP", description: "Experience points from activity", weight: 0.5, score: xpScore, status: xpScore > 50 ? "positive" : "neutral" },
    { name: "Stamps", description: "Verified identity stamps", weight: 0.2, score: stampScore, status: stampScore > 50 ? "positive" : "neutral" },
    { name: "Tenure", description: "Account age and consistency", weight: 0.1, score: tenureScore, status: tenureScore > 50 ? "positive" : "neutral" },
    { name: "Semantic Trust", description: "AI-computed trust from behavior", weight: 0.2, score: semanticTrust, status: semanticTrust > 50 ? "positive" : "neutral" },
  ];

  return {
    value,
    level: levelFromScore(value),
    factors,
    breakdown: {
      identity: Math.round(xpScore * 0.95),
      reliability: Math.round(stampScore * 0.92),
      volume: Math.round(tenureScore * 0.88),
      disputes: 75,
    },
    lastUpdated: new Date().toISOString(),
  };
}

function levelFromScore(score: number): TrustLevel {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  if (score >= 20) return "poor";
  return "unknown";
}
