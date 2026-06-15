/**
 * Shared types for AxiomID backend Worker.
 */

export interface Env {
  SHARED_SECRET_TOKEN_VERCEL_CF: string;
  PERPLEXITY_API_KEY: string;
  CACHE_KV: KVNamespace;
  DB: D1Database;
  PRESENCE_DO: DurableObjectNamespace;
  HARVEST_QUEUE: Queue;
  AI: Ai;
  SEARCH_VECTORS: VectorizeIndex;
  ENVIRONMENT: string;
}

export interface HarvestJob {
  jobId: string;
  query: string;
  userDid?: string;
  callbackUrl?: string;
}

export interface TrustScore {
  did: string;
  score: number;
  breakdown: {
    xp: number;
    stamps: number;
    delegation: number;
  };
  cachedAt: number;
}

export interface SkillRecord {
  slug: string;
  name: string;
  description: string;
  author: string;
  trustScore: number;
  installs: number;
  rating: number;
  tags: string[];
  versions: string[];
  latestVersion: string;
  icon?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export type RateLimitTier = "anonymous" | "authenticated" | "piAuth" | "payment";
