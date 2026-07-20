/**
 * Agent discovery search routes using Vectorize + Workers AI.
 * GET /api/agents/search?q=...&topK=...
 * GET /api/agents/similar?agentId=...&topK=...
 */

import type { Env } from "../lib/types";
import { AgentDiscoveryEmbedder } from "../vectors/agent-discovery";
import { jsonResponse, errorResponse } from "../lib/auth";

export async function handleAgentSearch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const topK = parseInt(url.searchParams.get("topK") || "10", 10);

  if (!query) {
    return errorResponse("Missing query parameter 'q' (natural language description of what you need)");
  }
  if (topK < 1 || topK > 50) {
    return errorResponse("topK must be between 1 and 50");
  }

  try {
    const embedder = new AgentDiscoveryEmbedder(env);
    const results = await embedder.searchAgents(query, topK);

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
    return errorResponse(
      err instanceof Error ? err.message : "Agent search failed",
      500
    );
  }
}

export async function handleAgentSimilar(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId");
  const topK = parseInt(url.searchParams.get("topK") || "5", 10);

  if (!agentId) {
    return errorResponse("Missing query parameter 'agentId'");
  }
  if (topK < 1 || topK > 50) {
    return errorResponse("topK must be between 1 and 50");
  }

  try {
    const embedder = new AgentDiscoveryEmbedder(env);
    const results = await embedder.findSimilarAgents(agentId, topK);

    return jsonResponse({
      success: true,
      data: {
        agentId,
        results,
        total: results.length,
      },
      timestamp: Date.now(),
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Similar agent search failed",
      500
    );
  }
}
