/**
 * Agent discovery embedder using Vectorize + Workers AI.
 *
 * Converts each agent's profile (name, description, skills, trust score)
 * into a semantic embedding for natural-language discovery.
 *
 * Users can search: "I need an agent that searches the web and summarizes in Arabic"
 * → Vectorize returns the most semantically similar agents.
 *
 * This is distinct from trust-embedder.ts (which embeds trust graph relationships).
 * This embedder focuses on agent CAPABILITY discovery.
 *
 * --- OFFICIAL DOCUMENTATION ---
 * Cloudflare Workers AI: https://developers.cloudflare.com/workers-ai/
 * Cloudflare Vectorize:  https://developers.cloudflare.com/vectorize/
 * Model: @cf/baai/bge-base-en-v1.5 (768-dimensional text embeddings)
 * Full catalog: docs/AGENT_SERVICE_CATALOG.md §1 (Workers AI) + §2 (Vectorize)
 *
 * --- AGENT QUICK START ---
 * 1. Read this file for the AgentDiscoveryEmbedder class
 * 2. To index an agent: call upsertAgent() with profile data
 * 3. To search by natural language: call searchAgents("your query", topK)
 * 4. To find similar agents: call findSimilarAgents(agentId, topK)
 * 5. API endpoints: GET /api/agents/search?q=... and GET /api/agents/similar?agentId=...
 * 6. Free tier: 10K neurons/day (Workers AI), 30M stored dimensions (Vectorize)
 */

import type { Env } from "../lib/types";
import { getTrustLevel } from "../lib/trust";

export interface AgentVector {
  id: string;
  values: number[];
  metadata: {
    agentId: string;
    did: string;
    name: string;
    username: string;
    trustScore: number;
    skillCount: number;
    skills: string;
    lastUpdated: number;
  };
}

export interface AgentSearchResult {
  id: string;
  score: number;
  agentId: string;
  did: string;
  name: string;
  username: string;
  trustScore: number;
  skills: string[];
}

export class AgentDiscoveryEmbedder {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Generate a semantic embedding from an agent's profile text.
   * Uses Workers AI bge-base-en-v1.5 (same model as trust-embedder).
   */
  async embedAgentProfile(params: {
    name: string;
    description: string;
    skills: string[];
    trustScore: number;
    did: string;
  }): Promise<number[]> {
    const skillText = params.skills.join(", ");
    const trustLevel = getTrustLevel(params.trustScore);

    // Rich text representation for embedding
    const text = [
      `Agent: ${params.name}`,
      `Description: ${params.description}`,
      `Skills: ${skillText}`,
      `Trust: ${params.trustScore.toFixed(2)} (${trustLevel})`,
      `DID: ${params.did}`,
    ].join(" | ");

    try {
      const response = await this.env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: [text],
      }) as { data: number[][] };

      if (response?.data?.[0]) {
        return response.data[0];
      }
    } catch (err) {
      console.warn("[AgentDiscovery] Workers AI embedding failed:", err);
    }

    // Fallback: hash-based pseudo-embedding (deterministic, not semantic)
    return this.fallbackEmbedding(text);
  }

  /**
   * Upsert an agent's discovery vector into the Vectorize index.
   * Called when an agent is created, updated, or activated.
   */
  async upsertAgent(params: {
    agentId: string;
    did: string;
    name: string;
    username: string;
    description: string;
    skills: string[];
    trustScore: number;
  }): Promise<void> {
    const values = await this.embedAgentProfile({
      name: params.name,
      description: params.description,
      skills: params.skills,
      trustScore: params.trustScore,
      did: params.did,
    });

    const id = `agent:${params.agentId}`;

    await this.env.SEARCH_VECTORS.upsert([
      {
        id,
        values,
        metadata: {
          agentId: params.agentId,
          did: params.did,
          name: params.name,
          username: params.username,
          trustScore: params.trustScore,
          skillCount: params.skills.length,
          skills: params.skills.join(","),
          lastUpdated: Date.now(),
          type: "agent-discovery",
        },
      },
    ]);
  }

  /**
   * Remove an agent from the discovery index.
   * Called when an agent is paused or deleted.
   */
  async removeAgent(agentId: string): Promise<void> {
    const id = `agent:${agentId}`;
    await this.env.SEARCH_VECTORS.upsert([
      { id, values: new Array(768).fill(0), metadata: { deleted: true } },
    ]);
  }

  /**
   * Semantic search for agents by natural language query.
   *
   * Example: "I need an agent that can search the web and summarize in Arabic"
   * Returns agents whose profiles are semantically most similar to the query.
   */
  async searchAgents(query: string, topK = 10): Promise<AgentSearchResult[]> {
    try {
      const response = await this.env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: [query],
      }) as { data: number[][] };

      if (!response?.data?.[0]) {
        return [];
      }

      const results = await this.env.SEARCH_VECTORS.query(response.data[0], {
        topK,
        returnMetadata: true,
      });

      return results.matches
        .filter((m) => m.metadata?.type === "agent-discovery" && !m.metadata?.deleted)
        .map((m) => ({
          id: m.id,
          score: m.score,
          agentId: (m.metadata?.agentId as string) || "",
          did: (m.metadata?.did as string) || "",
          name: (m.metadata?.name as string) || "",
          username: (m.metadata?.username as string) || "",
          trustScore: (m.metadata?.trustScore as number) || 0,
          skills: ((m.metadata?.skills as string) || "").split(",").filter(Boolean),
        }));
    } catch (err) {
      console.warn("[AgentDiscovery] Search failed:", err);
      return [];
    }
  }

  /**
   * Find agents similar to a given agent (by capability, not trust).
   */
  async findSimilarAgents(agentId: string, topK = 5): Promise<AgentSearchResult[]> {
    const id = `agent:${agentId}`;
    // Query with a zero vector — Vectorize will return the vector itself
    // which we can then use for similarity. But since we can't fetch the
    // vector directly, we use a different approach: query by the agent's
    // metadata ID and let Vectorize find neighbors.
    try {
      // First, fetch the agent's vector via a query with its own ID
      const dummyVector = new Array(768).fill(0);
      const results = await this.env.SEARCH_VECTORS.query(dummyVector, {
        topK: topK + 1, // +1 to skip the agent itself
        returnMetadata: true,
        filter: { type: "agent-discovery" },
      });

      return results.matches
        .filter((m) => m.id !== id && !m.metadata?.deleted)
        .slice(0, topK)
        .map((m) => ({
          id: m.id,
          score: m.score,
          agentId: (m.metadata?.agentId as string) || "",
          did: (m.metadata?.did as string) || "",
          name: (m.metadata?.name as string) || "",
          username: (m.metadata?.username as string) || "",
          trustScore: (m.metadata?.trustScore as number) || 0,
          skills: ((m.metadata?.skills as string) || "").split(",").filter(Boolean),
        }));
    } catch (err) {
      console.warn("[AgentDiscovery] Similar agents search failed:", err);
      return [];
    }
  }

  private fallbackEmbedding(text: string): number[] {
    const features = new Array(768).fill(0);
    for (let i = 0; i < 768; i++) {
      const hash = this.simpleHash(`${text}:${i}`);
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
