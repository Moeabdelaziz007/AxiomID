/**
 * Semantic search endpoint using Vectorize + Workers AI.
 * GET /api/search?q=...&topK=...
 * GET /api/search/similar?did=...&topK=...
 *
 * SECURITY FIX (P1):
 * - NaN guard on topK (parseInt can return NaN)
 * - Rate limiting is applied in router.ts BEFORE this handler is called
 *   (router applies rate limit at line 165, truth-rag/search routes come after)
 */

import type { Env } from "../lib/types";
import { TrustEmbedder } from "../vectors/trust-embedder";
import { jsonResponse, errorResponse } from "../lib/auth";

/** Parse topK with NaN guard — returns default if invalid */
function parseTopK(raw: string | null, defaultVal: number, max: number): number {
  if (!raw) return defaultVal;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1) return defaultVal;
  return Math.min(parsed, max);
}

export async function handleSearch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const topK = parseTopK(url.searchParams.get("topK"), 10, 100);

  if (!query) {
    return errorResponse("Missing query parameter 'q'");
  }

  if (query.length > 500) {
    return errorResponse("Query too long (max 500 chars)");
  }

  try {
    const embedder = new TrustEmbedder(env);
    const results = await embedder.searchByText(query, topK);

    return jsonResponse({
      success: true,
      data: {
        query,
        results,
        total: results.length,
      },
      timestamp: Date.now(),
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Search failed", 500);
  }
}

export async function handleSearchSimilar(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const did = url.searchParams.get("did");
  const topK = parseTopK(url.searchParams.get("topK"), 5, 50);

  if (!did) {
    return errorResponse("Missing query parameter 'did'");
  }

  if (did.length > 200) {
    return errorResponse("DID too long (max 200 chars)");
  }

  try {
    const embedder = new TrustEmbedder(env);
    const results = await embedder.querySimilar(did, topK);

    return jsonResponse({
      success: true,
      data: {
        did,
        results,
        total: results.length,
      },
      timestamp: Date.now(),
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Similar search failed", 500);
  }
}
