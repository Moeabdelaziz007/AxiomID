/**
 * Semantic search endpoint using Vectorize + Workers AI.
 * GET /api/search?q=...&topK=...
 */

import type { Env } from "../lib/types";
import { TrustEmbedder } from "../vectors/trust-embedder";
import { jsonResponse, errorResponse } from "../lib/auth";

export async function handleSearch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const topK = parseInt(url.searchParams.get("topK") || "10", 10);

  if (!query) {
    return errorResponse("Missing query parameter 'q'");
  }

  if (topK < 1 || topK > 100) {
    return errorResponse("topK must be between 1 and 100");
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
  const topK = parseInt(url.searchParams.get("topK") || "5", 10);

  if (!did) {
    return errorResponse("Missing query parameter 'did'");
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
