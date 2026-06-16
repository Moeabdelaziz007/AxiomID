/**
 * Trust delegation chain resolver.
 * BFS traversal with cycle detection, max 3 hops.
 * Enhanced with PageRank, Nash equilibrium, and min-cut bottleneck detection.
 *
 * Physics-inspired:
 * - PageRank for recursive trust importance
 * - Nash Equilibrium for stable delegation strategies
 * - Min-Cut Max-Flow for trust bottleneck detection
 */

import { D1Helper } from "../db/d1";
import {
  pageRankTrust,
  nashEquilibrium,
  bestResponseDynamics,
  minCutTrustBottleneck,
  fiedlerPartition,
  type TopologyEdge,
} from "../../../src/lib/math-physics";

export interface DelegationEdge {
  delegator_did: string;
  delegatee_did: string;
  trust_level: number;
}

export interface TrustChain {
  delegator: string;
  delegatee: string;
  trustLevel: number;
  hop: number;
}

export interface PageRankResult {
  did: string;
  rank: number;
}

export class DelegationResolver {
  private d1: D1Helper;
  private maxHops = 3;

  constructor(d1: D1Helper) {
    this.d1 = d1;
  }

  /**
   * Compute PageRank for all DIDs in the delegation graph.
   * Physics: PR(A) = (1-d)/N + d Σ PR(Tᵢ)/C(Tᵢ)
   */
  async computePageRank(dampingFactor: number = 0.85): Promise<PageRankResult[]> {
    const allDelegations = await this.getAllDelegations();
    const nodes = new Set<string>();
    const edges: TopologyEdge[] = [];

    for (const d of allDelegations) {
      nodes.add(d.delegator_did);
      nodes.add(d.delegatee_did);
      edges.push({
        source: d.delegator_did,
        target: d.delegatee_did,
        weight: d.trust_level,
      });
    }

    const nodeArray = Array.from(nodes);
    const ranks = pageRankTrust(nodeArray, edges, dampingFactor, 100);

    return nodeArray
      .map((did) => ({ did, rank: ranks.get(did) || 0 }))
      .sort((a, b) => b.rank - a.rank);
  }

  /**
   * Nash equilibrium detection — find DIDs whose delegation strategies
   * are stable (no agent can improve by changing unilaterally).
   */
  async computeNashEquilibrium(): Promise<string[]> {
    const allDelegations = await this.getAllDelegations();
    const delegates = new Map<string, number>();

    for (const d of allDelegations) {
      delegates.set(d.delegatee_did, (delegates.get(d.delegatee_did) || 0) + d.trust_level);
    }

    const agents = Array.from(delegates.entries()).map(([did, trustSum]) => {
      // Alternative strategies: slightly higher/lower trust levels
      const alternativeTrusts = [
        { trust: trustSum * 0.5, profit: -trustSum * 0.3 },
        { trust: trustSum * 1.5, profit: trustSum * 0.2 - 0.1 },
        { trust: trustSum * 2.0, profit: trustSum * 0.3 - 0.2 },
      ].map((alt) => ({
        trust: alt.trust,
        profit: alt.profit,
      }));

      return { id: did, currentTrust: trustSum, alternativeTrusts };
    });

    return nashEquilibrium(agents);
  }

  /**
   * Best response dynamics — find optimal delegation strategies.
   */
  async computeBestResponses(): Promise<Map<string, string>> {
    const allDelegations = await this.getAllDelegations();
    const delegates = new Map<string, number>();

    for (const d of allDelegations) {
      delegates.set(d.delegatee_did, (delegates.get(d.delegatee_did) || 0) + d.trust_level);
    }

    const agents = Array.from(delegates.entries()).map(([did, trustSum]) => ({
      id: did,
      strategies: [
        { label: "maintain", payoff: trustSum },
        { label: "increase", payoff: trustSum * 1.2 - 0.1 },
        { label: "decrease", payoff: trustSum * 0.8 },
        { label: "remove", payoff: 0 },
      ],
    }));

    return bestResponseDynamics(agents);
  }

  /**
   * Min-cut trust bottleneck — find weakest links in delegation chain.
   * Physics: max flow = min cut (Ford-Fulkerson theorem)
   */
  async computeTrustBottleneck(
    sourceDid: string,
    sinkDid: string,
  ): Promise<{ maxFlow: number; bottleneckDids: string[] }> {
    const allDelegations = await this.getAllDelegations();
    const edges: TopologyEdge[] = allDelegations.map((d) => ({
      source: d.delegator_did,
      target: d.delegatee_did,
      weight: d.trust_level,
    }));

    const result = minCutTrustBottleneck(edges, sourceDid, sinkDid);
    return {
      maxFlow: result.maxFlow,
      bottleneckDids: result.bottleneckNodes,
    };
  }

  /**
   * Community detection — find trust communities via Fiedler partition.
   */
  async computeTrustCommunities(): Promise<{ communityA: string[]; communityB: string[] }> {
    const allDelegations = await this.getAllDelegations();
    const nodes = new Set<string>();
    const edges: TopologyEdge[] = [];

    for (const d of allDelegations) {
      nodes.add(d.delegator_did);
      nodes.add(d.delegatee_did);
      edges.push({
        source: d.delegator_did,
        target: d.delegatee_did,
        weight: d.trust_level,
      });
    }

    return fiedlerPartition(Array.from(nodes), edges);
  }

  /**
   * Resolve trust chain from source DID to target DID.
   * Uses BFS with cycle detection.
   */
  async resolveChain(sourceDid: string, targetDid: string): Promise<TrustChain[]> {
    const visited = new Set<string>();
    const queue: Array<{ did: string; chain: TrustChain[]; hop: number }> = [
      { did: sourceDid, chain: [], hop: 0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.did === targetDid && current.chain.length > 0) {
        return current.chain;
      }

      if (current.hop >= this.maxHops) continue;
      if (visited.has(current.did)) continue;
      visited.add(current.did);

      // Query D1 for outgoing delegations
      const delegations = await this.getOutgoingDelegations(current.did);

      for (const d of delegations) {
        if (!visited.has(d.delegatee_did)) {
          queue.push({
            did: d.delegatee_did,
            chain: [
              ...current.chain,
              {
                delegator: d.delegator_did,
                delegatee: d.delegatee_did,
                trustLevel: d.trust_level,
                hop: current.hop + 1,
              },
            ],
            hop: current.hop + 1,
          });
        }
      }
    }

    return [];
  }

  /**
   * Compute accumulated trust from delegation chain.
   * Returns product of trust levels along the path.
   */
  async computeDelegatedTrust(sourceDid: string, targetDid: string): Promise<number> {
    const chain = await this.resolveChain(sourceDid, targetDid);
    if (chain.length === 0) return 0;

    return chain.reduce((acc, edge) => acc * edge.trustLevel, 1);
  }

  /**
   * Get all outgoing delegations from a DID.
   */
  private async getOutgoingDelegations(did: string): Promise<DelegationEdge[]> {
    const result = await this.d1.db
      .prepare(
        "SELECT * FROM trust_delegations WHERE delegator_did = ? AND (expires_at IS NULL OR expires_at > datetime('now'))"
      )
      .bind(did)
      .all<DelegationEdge>();
    return result.results;
  }

  /**
   * Add a delegation edge.
   */
  async addDelegation(
    delegatorDid: string,
    delegateeDid: string,
    trustLevel: number,
    expiresAt?: Date
  ): Promise<void> {
    await this.d1.db
      .prepare(
        "INSERT OR REPLACE INTO trust_delegations (delegator_did, delegatee_did, trust_level, expires_at) VALUES (?, ?, ?, ?)"
      )
      .bind(
        delegatorDid,
        delegateeDid,
        Math.max(0, Math.min(1, trustLevel)),
        expiresAt?.toISOString() || null
      )
      .run();
  }

  /**
   * Get all DIDs that trust a given DID (incoming delegations).
   */
  /**
   * Get all active delegations.
   */
  private async getAllDelegations(): Promise<DelegationEdge[]> {
    const result = await this.d1.db
      .prepare(
        "SELECT * FROM trust_delegations WHERE (expires_at IS NULL OR expires_at > datetime('now'))"
      )
      .all<DelegationEdge>();
    return result.results;
  }

  async getTrusters(delegateeDid: string): Promise<DelegationEdge[]> {
    const result = await this.d1.db
      .prepare(
        "SELECT * FROM trust_delegations WHERE delegatee_did = ? AND (expires_at IS NULL OR expires_at > datetime('now'))"
      )
      .bind(delegateeDid)
      .all<DelegationEdge>();
    return result.results;
  }
}
