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
} from "./math-physics";

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
    const { nodes, edges } = await this.delegationsToGraph();
    const ranks = pageRankTrust(nodes, edges, dampingFactor, 100);

    return nodes
      .map((did) => ({ did, rank: ranks.get(did) || 0 }))
      .sort((a, b) => b.rank - a.rank);
  }

  /**
   * Nash equilibrium detection — find DIDs whose delegation strategies
   * are stable (no agent can improve by changing unilaterally).
   */
  async computeNashEquilibrium(): Promise<string[]> {
    const trustSums = await this.delegateeTrustSums();

    const agents = Array.from(trustSums.entries()).map(([did, trustSum]) => ({
      id: did,
      currentTrust: trustSum,
      alternativeTrusts: [
        { trust: trustSum * 0.5, profit: -trustSum * 0.3 },
        { trust: trustSum * 1.5, profit: trustSum * 0.2 - 0.1 },
        { trust: trustSum * 2.0, profit: trustSum * 0.3 - 0.2 },
      ],
    }));

    return nashEquilibrium(agents);
  }

  /**
   * Best response dynamics — find optimal delegation strategies.
   */
  async computeBestResponses(): Promise<Map<string, string>> {
    const trustSums = await this.delegateeTrustSums();

    const agents = Array.from(trustSums.entries()).map(([did, trustSum]) => ({
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
    const { edges } = await this.delegationsToGraph();
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
    const { nodes, edges } = await this.delegationsToGraph();
    return fiedlerPartition(nodes, edges);
  }

  /**
   * Resolve trust chain from source DID to target DID.
   * Uses BFS with cycle detection.
   */
  async resolveChain(sourceDid: string, targetDid: string): Promise<TrustChain[]> {
    const visited = new Set<string>();
    let queue: Array<{ did: string; chain: TrustChain[]; hop: number }> = [
      { did: sourceDid, chain: [], hop: 0 },
    ];

    while (queue.length > 0) {
      // Check if we reached the target in the current level
      for (const current of queue) {
        if (current.did === targetDid && current.chain.length > 0) {
          return current.chain;
        }
      }

      const nextQueue: Array<{ did: string; chain: TrustChain[]; hop: number }> = [];

      // Filter nodes to process (not visited, within maxHops, and unique in this level)
      const uniqueDidsInLevel = new Set<string>();
      const nodesToProcess = queue.filter(node => {
        if (node.hop >= this.maxHops) return false;
        if (visited.has(node.did)) return false;
        if (uniqueDidsInLevel.has(node.did)) return false;
        uniqueDidsInLevel.add(node.did);
        return true;
      });

      if (nodesToProcess.length === 0) break;

      // Mark as visited
      const currentDids = nodesToProcess.map(n => n.did);
      for (const did of currentDids) {
        visited.add(did);
      }

      // Fetch outgoing delegations in batch
      const delegations = await this.getOutgoingDelegationsBatch(currentDids);

      // Group by delegator for quick lookup
      const delegationsByDelegator = new Map<string, DelegationEdge[]>();
      for (const d of delegations) {
        if (!delegationsByDelegator.has(d.delegator_did)) {
          delegationsByDelegator.set(d.delegator_did, []);
        }
        delegationsByDelegator.get(d.delegator_did)!.push(d);
      }

      // Build next level queue
      for (const node of nodesToProcess) {
        const nodeDelegations = delegationsByDelegator.get(node.did) || [];

        for (const d of nodeDelegations) {
          if (!visited.has(d.delegatee_did)) {
            nextQueue.push({
              did: d.delegatee_did,
              chain: [
                ...node.chain,
                {
                  delegator: d.delegator_did,
                  delegatee: d.delegatee_did,
                  trustLevel: d.trust_level,
                  hop: node.hop + 1,
                },
              ],
              hop: node.hop + 1,
            });
          }
        }
      }

      queue = nextQueue;
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
   * Get all outgoing delegations for a batch of DIDs.
   */
  private async getOutgoingDelegationsBatch(dids: string[]): Promise<DelegationEdge[]> {
    if (dids.length === 0) return [];

    // Process in chunks of 99 to be safe with SQLite variables limits
    const chunkSize = 99;
    const results: DelegationEdge[] = [];

    for (let i = 0; i < dids.length; i += chunkSize) {
      const chunk = dids.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '?').join(',');

      const queryResult = await this.d1.db
        .prepare(
          "SELECT * FROM trust_delegations WHERE delegator_did IN (" + placeholders + ") AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))"
        )
        .bind(...chunk)
        .all<DelegationEdge>();

      results.push(...queryResult.results);
    }

    return results;
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
   * Build nodes array and edges list from all active delegations.
   * Shared by computePageRank, computeTrustBottleneck, and computeTrustCommunities.
   */
  private async delegationsToGraph(): Promise<{ nodes: string[]; edges: TopologyEdge[] }> {
    const allDelegations = await this.getAllDelegations();
    const nodeSet = new Set<string>();
    const edges: TopologyEdge[] = [];

    for (const d of allDelegations) {
      nodeSet.add(d.delegator_did);
      nodeSet.add(d.delegatee_did);
      edges.push({ source: d.delegator_did, target: d.delegatee_did, weight: d.trust_level });
    }

    return { nodes: Array.from(nodeSet), edges };
  }

  /**
   * Accumulate total incoming trust per delegatee across all active delegations.
   * Shared by computeNashEquilibrium and computeBestResponses.
   */
  private async delegateeTrustSums(): Promise<Map<string, number>> {
    const allDelegations = await this.getAllDelegations();
    const sums = new Map<string, number>();
    for (const d of allDelegations) {
      sums.set(d.delegatee_did, (sums.get(d.delegatee_did) || 0) + d.trust_level);
    }
    return sums;
  }

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
