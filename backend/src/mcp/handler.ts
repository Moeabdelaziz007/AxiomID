/**
 * MCP protocol handler for Cloudflare Worker.
 * Routes MCP requests to the server.
 */

import { createMcpServer } from "./server";
import type { Env } from "../lib/types";

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // MCP uses JSON-RPC over HTTP
  if (request.method === "POST" && url.pathname === "/mcp") {
    try {
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
              { name: "trust_chain", description: "Resolve trust chain", inputSchema: { type: "object", properties: { sourceDid: { type: "string" }, targetDid: { type: "string" } }, required: ["sourceDid", "targetDid"] } },
              { name: "presence_heartbeat", description: "Send agent heartbeat", inputSchema: { type: "object", properties: { agentId: { type: "string" } }, required: ["agentId"] } },
              { name: "presence_status", description: "Get agent presence", inputSchema: { type: "object", properties: { agentId: { type: "string" } }, required: ["agentId"] } },
              { name: "skill_list", description: "List marketplace skills", inputSchema: { type: "object", properties: {} } },
              { name: "skill_install", description: "Install a skill", inputSchema: { type: "object", properties: { slug: { type: "string" }, userDid: { type: "string" }, version: { type: "string" } }, required: ["slug", "userDid"] } },
              { name: "harvest_query", description: "Enqueue harvest query", inputSchema: { type: "object", properties: { query: { type: "string" }, userDid: { type: "string" } }, required: ["query"] } },
              { name: "harvest_result", description: "Get harvest result", inputSchema: { type: "object", properties: { jobId: { type: "string" } }, required: ["jobId"] } },
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
    return new Response("AxiomID MCP Server - Use POST /mcp for JSON-RPC", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Not Found", { status: 404 });
}

async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  env: Env
): Promise<unknown> {
  const { KVHelper } = await import("../db/kv");
  const { D1Helper } = await import("../db/d1");
  const { TrustEngine } = await import("../lib/trust");
  const { DelegationResolver } = await import("../lib/delegation");

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
      const did = `did:pi:${piUsername}:${Date.now().toString(36)}`;
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
      const chain = await delegation.resolveChain(args.sourceDid as string, args.targetDid as string);
      const delegatedTrust = await delegation.computeDelegatedTrust(args.sourceDid as string, args.targetDid as string);
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
      const id = `install-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await d1.db
        .prepare("INSERT OR REPLACE INTO skill_installs (id, skill_slug, user_did, version) VALUES (?, ?, ?, ?)")
        .bind(id, args.slug as string, args.userDid as string, (args.version as string) || "latest")
        .run();
      return { success: true, slug: args.slug, userDid: args.userDid, version: args.version || "latest" };
    }

    case "harvest_query": {
      const jobId = `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await env.HARVEST_QUEUE.send({ jobId, query: args.query, userDid: args.userDid });
      return { jobId, query: args.query, status: "queued", timestamp: Date.now() };
    }

    case "harvest_result": {
      const result = await d1.getHarvestResult(args.jobId as string);
      return result || { error: "Not found" };
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
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Shared-Secret",
    },
  });
}
