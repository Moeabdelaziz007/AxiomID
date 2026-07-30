/**
 * POST /api/memory
 * AxiomID memory API — backed by mem7 (Rust-powered memory engine).
 *
 * Provides storage and recall for agent memories with automatic dedup,
 * Ebbinghaus decay, graph recall, and context scoring.
 *
 * Zero-cost mode: uses Ollama + in-memory FlatIndex.
 * Production mode: configure via env vars (see below).
 *
 * Environment:
 *   MEM7_LLM_BASE_URL   – default: http://localhost:11434/v1
 *   MEM7_LLM_API_KEY    – default: ollama
 *   MEM7_LLM_MODEL      – default: qwen2.5:7b
 *   MEM7_EMBED_MODEL    – default: mxbai-embed-large
 *   MEM7_EMBED_DIMS     – default: 1024
 *   MEM7_VECTOR_STORE   – "flat" (default) or "upstash"
 *   MEM7_UPSTASH_URL    – required if MEM7_VECTOR_STORE=upstash
 *   MEM7_UPSTASH_TOKEN  – required if MEM7_VECTOR_STORE=upstash
 *   MEM7_GRAPH_STORE    – "flat" (default), "kuzu", or "neo4j"
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-middleware";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";

// mem7 is dynamically imported because it ships a native binary (napi-rs)
// that Turbopack cannot bundle into ESM chunks at build time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mem7Engine = any;

// ── Schema ──

const StoreSchema = z.object({
  action: z.literal("store"),
  content: z.string().min(1),
  sessionId: z.string().optional(),
});

const RecallSchema = z.object({
  action: z.literal("recall"),
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional().default(10),
  taskType: z.string().optional(),
});

const DeleteSchema = z.object({
  action: z.literal("delete"),
  id: z.string().min(1),
});

const RequestSchema = z.discriminatedUnion("action", [
  StoreSchema,
  RecallSchema,
  DeleteSchema,
]);

// ── Singleton engine (lazy, survives warm starts) ──

let _engine: Mem7Engine | null = null;

function getConfig(): string {
  const config: Record<string, unknown> = {
    llm: {
      base_url: process.env.MEM7_LLM_BASE_URL ?? "http://localhost:11434/v1",
      api_key: process.env.MEM7_LLM_API_KEY ?? "ollama",
      model: process.env.MEM7_LLM_MODEL ?? "qwen2.5:7b",
    },
    embedding: {
      base_url: process.env.MEM7_LLM_BASE_URL ?? "http://localhost:11434/v1",
      api_key: process.env.MEM7_LLM_API_KEY ?? "ollama",
      model: process.env.MEM7_EMBED_MODEL ?? "mxbai-embed-large",
      dims: Number(process.env.MEM7_EMBED_DIMS ?? 1024),
    },
    decay: {
      base_half_life_secs: 604800,
      decay_shape: 0.8,
      min_retention: 0.1,
      rehearsal_factor: 0.5,
    },
  };

  const vectorStore = process.env.MEM7_VECTOR_STORE ?? "flat";
  if (vectorStore === "upstash") {
    (config as any).vector = {
      provider: "upstash",
      url: process.env.MEM7_UPSTASH_URL!,
      token: process.env.MEM7_UPSTASH_TOKEN!,
    };
  }

  const graphStore = process.env.MEM7_GRAPH_STORE ?? "flat";
  if (graphStore !== "flat") {
    (config as any).graph = { provider: graphStore };
  }

  return JSON.stringify(config);
}

async function getEngine(): Promise<Mem7Engine> {
  if (!_engine) {
    // Dynamic import — mem7 ships a native binary (napi-rs) that cannot
    // be statically bundled by Turbopack into ESM chunks.
    const mem7 = await import("@mem7ai/mem7");
    _engine = await mem7.MemoryEngine.create(getConfig());
  }
  return _engine;
}

// ── Handler ──

export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientIp = getClientIp(request);

  // Rate limit: 30 req/min per IP
  const rateResult = await checkRateLimit(clientIp, { maxRequests: 30, windowMs: 60_000 });
  if (!rateResult.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Authenticate
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const userId = auth.user.did ?? auth.user.id;

  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const engine = await getEngine();
    const { action } = parsed.data;

    switch (action) {
      case "store": {
        const { content, sessionId } = parsed.data;
        const result = await engine.add(
          [{ role: "user", content }],
          userId,
          sessionId ?? undefined,
        );
        const id = result.results?.[0]?.id ?? crypto.randomUUID();
        return NextResponse.json({ success: true, id, actions: result.results });
      }

      case "recall": {
        const { query, limit, taskType } = parsed.data;
        const result = await engine.search(
          query,
          userId,
          undefined,  // agentId
          undefined,  // runId
          limit,      // limit
          undefined,  // filters
          false,      // rerank
          undefined,  // threshold
          taskType,   // taskType
        );
        return NextResponse.json({ success: true, results: result.memories });
      }

      case "delete": {
        const { id } = parsed.data;
        await engine.delete(id);
        return NextResponse.json({ success: true });
      }
    }
  } catch (err) {
    console.error("[Memory] Error:", err);
    return NextResponse.json(
      { error: "Internal error", message: err instanceof Error ? err.message : "Unknown" },
      { status: 500 },
    );
  }
}
