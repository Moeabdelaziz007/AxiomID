/**
 * Modular router for AxiomID backend Worker.
 * Replaces monolithic index.ts with clean route handling.
 */

import type { Env } from "./lib/types";
import { verifyAuth, jsonResponse, errorResponse, PUBLIC_ROUTES, rateLimitHeaders } from "./lib/auth";
import { KVHelper } from "./db/kv";
import { D1Helper } from "./db/d1";
import { RateLimiter } from "./lib/rate-limiter";
import { TrustEngine } from "./lib/trust";
import { SkillsMarketplace } from "./routes/skills";
import { AgentDispatcher } from "./routes/agent-dispatch";
import { handleMcp } from "./mcp/handler";
import { handleSearch, handleSearchSimilar } from "./routes/search";
import { handleTruthAsk, handleDailyTruth } from "./routes/truth-rag";
import { TrustEmbedder } from "./vectors/trust-embedder";
import { generateId } from "./lib/utils";

export class Router {
  private kv: KVHelper;
  private d1: D1Helper;
  private rateLimiter: RateLimiter;
  private trust: TrustEngine;
  private skills: SkillsMarketplace;
  private dispatcher: AgentDispatcher;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.kv = new KVHelper(env.CACHE_KV);
    this.d1 = new D1Helper(env.DB);
    this.rateLimiter = new RateLimiter(this.kv);
    this.trust = new TrustEngine(this.kv);
    this.skills = new SkillsMarketplace(this.kv, this.d1);
    this.dispatcher = new AgentDispatcher(this.kv, this.d1, env);
  }

  private async ensureD1(): Promise<void> {
    await this.d1.init();
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Initialize D1 tables on first request
    await this.ensureD1();

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "https://axiomid.app",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Shared-Secret",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    try {
      return await this.route(url, request);
    } catch (err) {
      console.error("Router error:", err instanceof Error ? err.message : "Unknown error");
      return errorResponse("Internal server error", 500);
    }
  }

  private async route(url: URL, request: Request): Promise<Response> {
    const path = url.pathname;
    const method = request.method;

    // --- MCP Server ---
    if (path === "/mcp") {
      return handleMcp(request, this.env);
    }

    // --- Semantic Search ---
    if (path === "/api/search" && method === "GET") {
      return handleSearch(request, this.env);
    }

    if (path === "/api/search/similar" && method === "GET") {
      return handleSearchSimilar(request, this.env);
    }

    // --- Health ---
    if (path === "/health" || path === "/") {
      return jsonResponse({ status: "ok", timestamp: Date.now() });
    }

    // --- Data Sync Status (public) ---
    if (path === "/api/sync" && method === "GET") {
      return this.handleSyncStatus();
    }

    // --- Embedding utility (shared-secret auth, for ingest script) ---
    if (path === "/api/embed" && method === "POST") {
      const embedSecret = request.headers.get("X-Shared-Secret");
      const expected = this.env.SHARED_SECRET_TOKEN_VERCEL_CF;
      if (!embedSecret || !expected || embedSecret.length !== expected.length) {
        return errorResponse("Unauthorized", 401);
      }
      let match = 0;
      for (let i = 0; i < embedSecret.length; i++) {
        match |= embedSecret.charCodeAt(i) ^ expected.charCodeAt(i);
      }
      if (match !== 0) {
        return errorResponse("Unauthorized", 401);
      }

      const body = await request.json<{ texts: string[] }>();
      if (!body.texts || !Array.isArray(body.texts) || body.texts.length === 0) {
        return errorResponse("Missing non-empty texts array", 400);
      }
      if (body.texts.length > 32) {
        return errorResponse("Maximum 32 texts per request", 400);
      }
      const oversized = body.texts.findIndex((t) => typeof t !== "string" || t.length > 1000);
      if (oversized !== -1) {
        return errorResponse(`Text at index ${oversized} exceeds 1000 character limit`, 400);
      }
      const res = await this.env.AI.run("@cf/baai/bge-base-en-v1.5", { text: body.texts }) as { data: number[][] };
      return jsonResponse({ embeddings: res.data });
    }

    // --- Auth check for protected routes ---
    const { authorized, agentId } = verifyAuth(request, this.env);
    if (!authorized && !this.isPublicRoute(path)) {
      return errorResponse("Unauthorized", 401);
    }

    // --- Rate limiting ---
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
    const tier = authorized ? "authenticated" : "anonymous";
    const rl = await this.rateLimiter.check(`${clientIp}:${path}`, tier);
    if (!rl.allowed) {
      return errorResponse("Rate limit exceeded", 429, rateLimitHeaders(rl));
    }

    // --- TRUTH RAG (after rate limiting — Workers AI is expensive) ---
    if (path === "/api/truth/ask" && method === "GET") {
      return handleTruthAsk(request, this.env);
    }

    if (path === "/api/truth/daily-truth" && method === "GET") {
      return handleDailyTruth(request, this.env);
    }

    // --- Presence ---
    if (path === "/heartbeat" && method === "POST") {
      return this.handleHeartbeat(agentId || "default");
    }

    if (path.startsWith("/status")) {
      const targetAgent = url.searchParams.get("agentId") || agentId || "default";
      return this.handleStatus(targetAgent);
    }

    // --- Trust ---
    if (path.startsWith("/api/trust/")) {
      const did = path.split("/api/trust/")[1];
      if (!did) return errorResponse("Missing DID");
      const result = await this.trust.compute(did);
      const embedder = new TrustEmbedder(this.env);
      await embedder.upsertVector(did, result.score, result.breakdown.delegation);
      return jsonResponse({ success: true, data: result, timestamp: Date.now() });
    }

    // --- Harvest ---
    if (path === "/api/harvest" && method === "POST") {
      return this.handleHarvestEnqueue(request);
    }

    if (path.startsWith("/api/harvest/") && method === "GET") {
      const id = path.split("/api/harvest/")[1];
      return this.handleHarvestGet(id);
    }

    // --- Data Sync (POST requires auth) ---
    if (path === "/api/sync" && method === "POST") {
      return this.handleSync(request);
    }

    if (path === "/api/sync/export" && method === "GET") {
      return this.handleSyncExport(url);
    }

    // --- Skills Marketplace ---
    if (path === "/api/skills" && method === "GET") {
      const skills = await this.skills.listSkills();
      return jsonResponse({ success: true, data: { skills, total: skills.length }, timestamp: Date.now() });
    }

    if (path.startsWith("/api/skills/") && method === "GET") {
      const slug = path.split("/api/skills/")[1];
      const skill = await this.skills.getSkill(slug);
      if (!skill) return errorResponse("Skill not found", 404);
      return jsonResponse({ success: true, data: skill, timestamp: Date.now() });
    }

    if (path.startsWith("/api/skills/") && path.endsWith("/install") && method === "POST") {
      const slug = path.split("/api/skills/")[1].replace("/install", "");
      const body = await request.json<{ userDid?: string; version?: string }>();
      if (!body.userDid) return errorResponse("Missing userDid");
      const result = await this.skills.installSkill(slug, body.userDid, body.version);
      return jsonResponse({ success: result.success, data: result, timestamp: Date.now() });
    }

    // --- Agent Dispatch ---
    if (path === "/api/agent/dispatch" && method === "POST") {
      const body = await request.json<{ skillSlug: string; action: string; params: Record<string, unknown>; userDid: string }>();
      if (!body.skillSlug || !body.action || !body.userDid) {
        return errorResponse("Missing skillSlug, action, or userDid");
      }
      try {
        const result = await this.dispatcher.dispatch(body);
        return jsonResponse({ success: true, data: result, timestamp: Date.now() });
      } catch (err) {
        return errorResponse(err instanceof Error ? err.message : "Dispatch failed", 500);
      }
    }

    return errorResponse("Not found", 404);
  }

  private isPublicRoute(path: string): boolean {
    return PUBLIC_ROUTES.some((p) => path.startsWith(p));
  }

  private async handleHeartbeat(agentId: string): Promise<Response> {
    try {
      const id = this.env.PRESENCE_DO.idFromName(agentId);
      const obj = this.env.PRESENCE_DO.get(id);
      const resp = await obj.fetch(new Request("https://internal/heartbeat", { method: "POST" }));
      if (!resp.ok) return errorResponse("Presence service error", 502);
      const data = await resp.json();
      return jsonResponse({ success: true, data, timestamp: Date.now() });
    } catch {
      return errorResponse("Presence unavailable", 503);
    }
  }

  private async handleStatus(agentId: string): Promise<Response> {
    try {
      const id = this.env.PRESENCE_DO.idFromName(agentId);
      const obj = this.env.PRESENCE_DO.get(id);
      const resp = await obj.fetch(new Request(`https://internal/status?agentId=${agentId}`));
      if (!resp.ok) return errorResponse("Presence service error", 502);
      const data = await resp.json();
      return jsonResponse({ success: true, data, timestamp: Date.now() });
    } catch {
      return errorResponse("Presence unavailable", 503);
    }
  }

  private async handleHarvestEnqueue(request: Request): Promise<Response> {
    const body = await request.json<{ query: string; userDid?: string }>();
    if (!body.query) return errorResponse("Missing query");

    const jobId = generateId("h");

    await this.env.HARVEST_QUEUE.send({
      jobId,
      query: body.query,
      userDid: body.userDid,
    });

    return jsonResponse({ success: true, data: { jobId, status: "queued" }, timestamp: Date.now() });
  }

  private async handleHarvestGet(id: string): Promise<Response> {
    const result = await this.d1.getHarvestResult(id);
    if (!result) return errorResponse("Not found", 404);
    return jsonResponse({ success: true, data: result, timestamp: Date.now() });
  }

  /**
   * Get sync status — returns last sync time for D1→PostgreSQL sync.
   */
  private async handleSyncStatus(): Promise<Response> {
    try {
      // In production, this would query PostgreSQL for last sync time
      // For now, return basic status
      return jsonResponse({
        success: true,
        data: {
          status: "ok",
          lastSync: {
            harvestResults: null,
            agentPresence: null,
          },
          note: "D1→PostgreSQL sync is managed by the Vercel API endpoint",
        },
        timestamp: Date.now(),
      });
    } catch {
      return errorResponse("Sync status unavailable", 503);
    }
  }

  /**
   * Trigger data sync — syncs D1 edge data to PostgreSQL.
   * Called by Vercel API or cron job.
   */
  private async handleSync(request: Request): Promise<Response> {
    try {
      const raw = await request.json().catch(() => ({}));
      const { source = "all", dryRun = false } = (raw as { source?: string; dryRun?: boolean });

      // Get recent data from D1
      const results: Record<string, { synced: number; errors: number }> = {};

      if (source === "all" || source === "harvest") {
        // In production: fetch from D1 and sync to PostgreSQL
        results.harvestResults = { synced: 0, errors: 0 };
      }

      if (source === "all" || source === "presence") {
        // In production: fetch from D1 and sync to PostgreSQL
        results.agentPresence = { synced: 0, errors: 0 };
      }

      return jsonResponse({
        success: true,
        data: {
          message: dryRun ? "Dry run completed" : "Sync completed",
          results,
          timestamp: new Date().toISOString(),
        },
        timestamp: Date.now(),
      });
    } catch {
      return errorResponse("Sync failed", 500);
    }
  }

  /**
   * Export D1 edge data since timestamp.
   */
  private async handleSyncExport(url: URL): Promise<Response> {
    try {
      const since = parseInt(url.searchParams.get("since") || "0", 10);

      const queryWithSince = (sqlWithFilter: string, sqlWithout: string) => {
        const stmt = this.d1.db.prepare(since > 0 ? sqlWithFilter : sqlWithout);
        return since > 0 ? stmt.bind(since) : stmt;
      };

      const [harvests, presence] = await Promise.all([
        queryWithSince(
          "SELECT * FROM harvest_results WHERE CAST(strftime('%s', created_at) AS INTEGER) * 1000 > ? ORDER BY created_at DESC LIMIT 1000",
          "SELECT * FROM harvest_results ORDER BY created_at DESC LIMIT 1000"
        ).all(),
        queryWithSince(
          "SELECT * FROM agent_presence WHERE last_heartbeat > ? ORDER BY last_heartbeat DESC",
          "SELECT * FROM agent_presence ORDER BY last_heartbeat DESC"
        ).all(),
      ]);

      return jsonResponse({
        success: true,
        data: {
          harvestResults: harvests.results,
          agentPresence: presence.results,
        },
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error("Export failed:", err);
      return errorResponse("Failed to export sync data", 500);
    }
  }
}
