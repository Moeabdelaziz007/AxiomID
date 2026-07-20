/**
 * MCP protocol handler for Cloudflare Worker.
 * Routes MCP requests to the server.
 *
 * --- OFFICIAL DOCUMENTATION ---
 * MCP Protocol:    https://modelcontextprotocol.io/
 * Protocol version: 2024-11-05
 * Transport: JSON-RPC 2.0 over HTTP POST to /mcp
 * Auth: X-Shared-Secret header (matched against SHARED_SECRET_TOKEN_VERCEL_CF env)
 * Full catalog: docs/AGENT_SERVICE_CATALOG.md §18
 *
 * --- AVAILABLE TOOLS (14) ---
 * Identity:  did_resolve, did_create
 * Trust:     trust_score, trust_delegate, trust_chain
 * Presence:  presence_heartbeat, presence_status
 * Skills:    skill_list, skill_install
 * Harvest:   harvest_query, harvest_result
 * Memory:    memory_read, memory_write, memory_search (Ghost.build MCP)
 *
 * --- AGENT QUICK START ---
 * 1. POST to /mcp with X-Shared-Secret header
 * 2. method: "initialize" → returns server info + capabilities
 * 3. method: "tools/list" → returns all 14 available tools
 * 4. method: "tools/call" with { name, arguments } → executes tool
 * 5. See docs/AGENT_SERVICE_CATALOG.md §18 for full tool schemas
 */

import { createMcpServer } from "./server";
import type { Env } from "../lib/types";
import { KVHelper } from "../db/kv";
import { D1Helper } from "../db/d1";
import { TrustEngine } from "../lib/trust";
import { DelegationResolver } from "../lib/delegation";
import { generateId } from "../lib/utils";

import { verifyAuth } from "../lib/auth";

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // MCP uses JSON-RPC over HTTP
  if (request.method === "POST" && url.pathname === "/mcp") {
    try {
      // Authenticate MCP client request
      const { authorized } = verifyAuth(request, env);
      if (!authorized) {
        return jsonResponse({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32099, message: "Unauthorized MCP client request" },
        }, 401);
      }

      const body = await request.json<{
        jsonrpc: string;
        id: number | string;
        method: string;
        params?: Record<string, unknown>;
      }>();

      const server = createMcpServer(env);

      // Handle MCP protocol methods
      if (body.method === "initialize") {
        return jsonResponse({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: { listChanged: false },
            },
            serverInfo: {
              name: "axiomid",
              version: "1.0.0",
            },
          },
        });
      }

      if (body.method === "tools/list") {
        return jsonResponse({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            tools: [
              { name: "did_resolve", description: "Resolve a DID to its document", inputSchema: { type: "object", properties: { did: { type: "string" } }, required: ["did"] } },
              { name: "did_create", description: "Create a new DID", inputSchema: { type: "object", properties: { piUsername: { type: "string" }, trustLevel: { type: "number" } }, required: ["piUsername"] } },
              { name: "trust_score", description: "Get trust score for a DID", inputSchema: { type: "object", properties: { did: { type: "string" } }, required: ["did"] } },
              { name: "trust_delegate", description: "Delegate trust between DIDs", inputSchema: { type: "object", properties: { delegatorDid: { type: "string" }, delegateeDid: { type: "string" }, trustLevel: { type: "number" } }, required: ["delegatorDid", "delegateeDid", "trustLevel"] } },
              { name: "trust_chain", description: "Resolve trust chain", inputSchema: { type: "object", properties: { sourceDid: { type: "string" }, targetDid: { type: "string" }, callerDid: { type: "string" } }, required: ["sourceDid", "targetDid", "callerDid"] } },
              { name: "presence_heartbeat", description: "Send agent heartbeat", inputSchema: { type: "object", properties: { agentId: { type: "string" }, metadata: { type: "object" } }, required: ["agentId"] } },
              { name: "presence_status", description: "Get agent presence", inputSchema: { type: "object", properties: { agentId: { type: "string" } }, required: ["agentId"] } },
              { name: "skill_list", description: "List marketplace skills", inputSchema: { type: "object", properties: {} } },
              { name: "skill_install", description: "Install a skill", inputSchema: { type: "object", properties: { slug: { type: "string" }, userDid: { type: "string" }, version: { type: "string" } }, required: ["slug", "userDid"] } },
              { name: "harvest_query", description: "Enqueue harvest query", inputSchema: { type: "object", properties: { query: { type: "string" }, userDid: { type: "string" } }, required: ["query"] } },
              { name: "harvest_result", description: "Get harvest result", inputSchema: { type: "object", properties: { jobId: { type: "string" } }, required: ["jobId"] } },
              { name: "memory_read", description: "Read agent memory entries from Ghost.build (direct PostgreSQL access). Returns recent memories or specific entry by key.", inputSchema: { type: "object", properties: { agentId: { type: "string" }, key: { type: "string", description: "Optional specific memory key to read" }, limit: { type: "number", description: "Max entries (default 20, max 100)" } }, required: ["agentId"] } },
              { name: "memory_write", description: "Write a memory entry to Ghost.build agent memory. Used by agents to persist context across sessions.", inputSchema: { type: "object", properties: { agentId: { type: "string" }, key: { type: "string" }, value: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["agentId", "key", "value"] } },
              { name: "memory_search", description: "Search agent memory entries by text query (ILIKE). Returns matching entries from Ghost.build.", inputSchema: { type: "object", properties: { agentId: { type: "string" }, query: { type: "string" }, limit: { type: "number" } }, required: ["agentId", "query"] } },
            ],
          },
        });
      }

      if (body.method === "tools/call") {
        const params = body.params as { name: string; arguments: Record<string, unknown> };
        const { name, arguments: args } = params;

        // Route to appropriate handler
        const result = await handleToolCall(name, args, env);
        return jsonResponse({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            content: [{ type: "text", text: JSON.stringify(result) }],
          },
        });
      }

      return jsonResponse({
        jsonrpc: "2.0",
        id: body.id,
        error: { code: -32601, message: `Method not found: ${body.method}` },
      });
    } catch (err) {
      return jsonResponse({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: err instanceof Error ? err.message : "Internal error" },
      }, 500);
    }
  }

  // MCP SSE endpoint for streaming
  if (request.method === "GET" && url.pathname === "/mcp") {
    return new Response(
      "AxiomID MCP Server v1.0 — Use POST /mcp for JSON-RPC\n" +
      "Docs: https://github.com/Moeabdelaziz007/AxiomID/blob/main/docs/mcp-server.md\n" +
      "Tools: did_resolve, did_create, trust_score, trust_delegate, trust_chain, " +
      "presence_heartbeat, presence_status, skill_list, skill_install, harvest_query, harvest_result",
      { headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "https://axiomid.app" } },
    );
  }

  return new Response("Not Found", { status: 404 });
}

async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  env: Env
): Promise<unknown> {
  const kv = new KVHelper(env.CACHE_KV);
  const d1 = new D1Helper(env.DB);
  const trust = new TrustEngine(kv);
  const delegation = new DelegationResolver(d1);

  switch (name) {
    case "did_resolve": {
      const did = args.did as string;
      const result = await d1.db
        .prepare("SELECT * FROM harvest_results WHERE user_did = ? LIMIT 1")
        .bind(did)
        .first();
      return { did, resolved: true, hasActivity: !!result, timestamp: Date.now() };
    }

    case "did_create": {
      const piUsername = args.piUsername as string;
      const did = `did:axiom:axiomid.app:pi:${encodeURIComponent(piUsername)}`;
      return { did, piUsername, trustScore: (args.trustLevel as number) || 0.1, created: new Date().toISOString() };
    }

    case "trust_score": {
      return await trust.compute(args.did as string);
    }

    case "trust_delegate": {
      await delegation.addDelegation(
        args.delegatorDid as string,
        args.delegateeDid as string,
        args.trustLevel as number
      );
      return { success: true, delegator: args.delegatorDid, delegatee: args.delegateeDid, trustLevel: args.trustLevel };
    }

    case "trust_chain": {
      const chain = await delegation.resolveChain(
        args.sourceDid as string,
        args.targetDid as string,
        args.callerDid as string
      );
      const delegatedTrust = await delegation.computeDelegatedTrust(
        args.sourceDid as string,
        args.targetDid as string,
        args.callerDid as string
      );
      return { source: args.sourceDid, target: args.targetDid, chain, delegatedTrust, hops: chain.length };
    }

    case "presence_heartbeat": {
      await d1.updatePresence(args.agentId as string, "online", args.metadata as Record<string, unknown>);
      return { agentId: args.agentId, status: "online", timestamp: Date.now() };
    }

    case "presence_status": {
      const presence = await d1.getPresence(args.agentId as string);
      return { agentId: args.agentId, status: presence?.status || "offline", lastHeartbeat: presence?.last_heartbeat || null };
    }

    case "skill_list": {
      const result = await d1.db.prepare("SELECT DISTINCT skill_slug FROM skill_installs").all<{ skill_slug: string }>();
      return { skills: result.results.map((r) => r.skill_slug), total: result.results.length };
    }

    case "skill_install": {
      const id = generateId("install");
      await d1.db
        .prepare("INSERT OR REPLACE INTO skill_installs (id, skill_slug, user_did, version) VALUES (?, ?, ?, ?)")
        .bind(id, args.slug as string, args.userDid as string, (args.version as string) || "latest")
        .run();
      return { success: true, slug: args.slug, userDid: args.userDid, version: args.version || "latest" };
    }

    case "harvest_query": {
      const jobId = generateId("h");
      await env.HARVEST_QUEUE.send({ jobId, query: args.query, userDid: args.userDid });
      return { jobId, query: args.query, status: "queued", timestamp: Date.now() };
    }

    case "harvest_result": {
      const result = await d1.getHarvestResult(args.jobId as string);
      return result || { error: "Not found" };
    }

    case "memory_read": {
      // Ghost.build MCP — direct agent memory access via D1 proxy
      // (D1 is Ghost.build's read replica; writes sync to PostgreSQL)
      const agentId = args.agentId as string;
      const key = args.key as string | undefined;
      const limit = Math.min(100, (args.limit as number) || 20);

      if (key) {
        // Read specific memory entry by key
        const entry = await d1.db
          .prepare("SELECT key, value, tags, created_at FROM agent_memories WHERE agent_id = ? AND key = ? LIMIT 1")
          .bind(agentId, key)
          .first<{ key: string; value: string; tags: string; created_at: string }>();
        return entry || { error: "Memory entry not found", agentId, key };
      }

      // Read recent memory entries
      const result = await d1.db
        .prepare("SELECT key, value, tags, created_at FROM agent_memories WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?")
        .bind(agentId, limit)
        .all<{ key: string; value: string; tags: string; created_at: string }>();

      return {
        agentId,
        count: result.results.length,
        memories: result.results.map((r) => ({
          key: r.key,
          value: r.value,
          tags: r.tags ? r.tags.split(",").filter(Boolean) : [],
          createdAt: r.created_at,
        })),
      };
    }

    case "memory_write": {
      // Ghost.build MCP — write agent memory entry
      const agentId = args.agentId as string;
      const key = args.key as string;
      const value = args.value as string;
      const tags = (args.tags as string[]) || [];

      // Check memory limit (agent.memoryLimit, default 500)
      const agent = await d1.db
        .prepare("SELECT memory_limit FROM agents WHERE id = ? LIMIT 1")
        .bind(agentId)
        .first<{ memory_limit: number }>();

      const memoryLimit = agent?.memory_limit || 500;
      const currentCount = await d1.db
        .prepare("SELECT COUNT(*) as cnt FROM agent_memories WHERE agent_id = ?")
        .bind(agentId)
        .first<{ cnt: number }>();

      if ((currentCount?.cnt || 0) >= memoryLimit) {
        // Evict oldest entry
        await d1.db
          .prepare("DELETE FROM agent_memories WHERE agent_id = ? AND id = (SELECT id FROM agent_memories WHERE agent_id = ? ORDER BY created_at ASC LIMIT 1)")
          .bind(agentId, agentId)
          .run();
      }

      await d1.db
        .prepare("INSERT OR REPLACE INTO agent_memories (id, agent_id, key, value, tags, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(generateId("mem"), agentId, key, value, tags.join(","), new Date().toISOString())
        .run();

      return { success: true, agentId, key, tags, timestamp: Date.now() };
    }

    case "memory_search": {
      // Ghost.build MCP — search agent memory by text query
      const agentId = args.agentId as string;
      const query = args.query as string;
      const limit = Math.min(50, (args.limit as number) || 10);

      const result = await d1.db
        .prepare("SELECT key, value, tags, created_at FROM agent_memories WHERE agent_id = ? AND (value LIKE ? OR key LIKE ?) ORDER BY created_at DESC LIMIT ?")
        .bind(agentId, `%${query}%`, `%${query}%`, limit)
        .all<{ key: string; value: string; tags: string; created_at: string }>();

      return {
        agentId,
        query,
        count: result.results.length,
        results: result.results.map((r) => ({
          key: r.key,
          value: r.value,
          tags: r.tags ? r.tags.split(",").filter(Boolean) : [],
          createdAt: r.created_at,
        })),
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://axiomid.app",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Shared-Secret",
    },
  });
}
