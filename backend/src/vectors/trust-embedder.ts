/**
 * Vectorize trust graph embeddings using Workers AI.
 * Real ML embeddings for semantic trust search.
 */

import type { Env } from "../lib/types";

export interface TrustVector {
  id: string;
  values: number[];
  metadata: {
    did: string;
    trustScore: number;
    delegations: number;
    lastUpdated: number;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  did: string;
  trustScore: number;
  metadata: Record<string, unknown>;
}

export class TrustEmbedder {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Generate embedding using Workers AI.
   * Falls back to feature vector if AI binding unavailable.
   */
  async embedTrustProfile(did: string, trustScore: number, delegationCount: number): Promise<number[]> {
    try {
      // Use Workers AI for real embeddings
      const text = `DID:${did} trust:${trustScore.toFixed(3)} delegations:${delegationCount} level:${this.getTrustLevel(trustScore)}`;
      const response = await this.env.AI.run("@cf/baai/bge-small-en-v1.5", { text: [text] }) as { data: number[][] };
      if (response?.data?.[0]) {
        return response.data[0];
      }
    } catch (err) {
      console.warn("[Vectorize] Workers AI embedding failed, using fallback:", err);
    }

    // Fallback: feature-based vector
    return this.fallbackEmbedding(did, trustScore, delegationCount);
  }

  /**
   * Upsert trust vector into Vectorize index.
   */
  async upsertVector(did: string, trustScore: number, delegationCount: number): Promise<void> {
    const values = await this.embedTrustProfile(did, trustScore, delegationCount);
    const id = `trust:${did}`;

    await this.env.SEARCH_VECTORS.upsert([{
      id,
      values,
      metadata: {
        did,
        trustScore,
        delegations: delegationCount,
        lastUpdated: Date.now(),
        level: this.getTrustLevel(trustScore),
      },
    }]);
  }

  /**
   * Query similar trust profiles from Vectorize.
   */
  async querySimilar(did: string, topK: number = 5): Promise<SearchResult[]> {
    const values = await this.embedTrustProfile(did, 0.5, 0);

    const results = await this.env.SEARCH_VECTORS.query(values, {
      topK,
      returnMetadata: true,
    });

    return results.matches.map((match) => ({
      id: match.id,
      score: match.score,
      did: (match.metadata?.did as string) || "",
      trustScore: (match.metadata?.trustScore as number) || 0,
      metadata: match.metadata || {},
    }));
  }

  /**
   * Search by text query.
   */
  async searchByText(query: string, topK: number = 10): Promise<SearchResult[]> {
    try {
      const response = await this.env.AI.run("@cf/baai/bge-small-en-v1.5", { text: [query] }) as { data: number[][] };
      if (response?.data?.[0]) {
        const results = await this.env.SEARCH_VECTORS.query(response.data[0], {
          topK,
          returnMetadata: true,
        });
        return results.matches.map((match) => ({
          id: match.id,
          score: match.score,
          did: (match.metadata?.did as string) || "",
          trustScore: (match.metadata?.trustScore as number) || 0,
          metadata: match.metadata || {},
        }));
      }
    } catch (err) {
      console.warn("[Vectorize] Text search failed:", err);
    }
    return [];
  }

  private getTrustLevel(score: number): string {
    if (score >= 0.8) return "sovereign";
    if (score >= 0.6) return "validator";
    if (score >= 0.4) return "citizen";
    if (score >= 0.2) return "visitor";
    return "newcomer";
  }

  private fallbackEmbedding(did: string, trustScore: number, delegationCount: number): number[] {
    const features = new Array(384).fill(0);
    features[0] = trustScore;
    features[1] = delegationCount / 10;
    features[2] = trustScore * (delegationCount / 10);
    features[3] = Math.min(1, trustScore + delegationCount * 0.05);
    features[4] = Math.abs(trustScore - 0.5);
    features[5] = delegationCount > 0 ? 1 : 0;
    features[6] = trustScore > 0.7 ? 1 : 0;
    features[7] = trustScore < 0.3 ? 1 : 0;
    features[8] = Math.floor(trustScore * 10) / 10;
    features[9] = Math.min(1, delegationCount * 0.1);
    for (let i = 10; i < 384; i++) {
      const hash = this.simpleHash(`${did}:${i}`);
      features[i] = (hash % 1000) / 1000;
    }
    return features;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
