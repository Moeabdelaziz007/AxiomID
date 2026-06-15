/**
 * MCP Server for AxiomID — DID/trust/presence/skill tools.
 * Deployed on Cloudflare Workers.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "../lib/types";
import { KVHelper } from "../db/kv";
import { D1Helper } from "../db/d1";
import { TrustEngine } from "../lib/trust";
import { DelegationResolver } from "../lib/delegation";

export function createMcpServer(env: Env): McpServer {
  const server = new McpServer({
    name: "axiomid",
    version: "1.0.0",
  });

  const kv = new KVHelper(env.CACHE_KV);
  const d1 = new D1Helper(env.DB);
  const trust = new TrustEngine(kv);
  const delegation = new DelegationResolver(d1);

  // --- DID Tools ---

  server.tool(
    "did_resolve",
    "Resolve a DID to its document",
    { did: z.string().describe("The DID to resolve (e.g. did:pi:abc123)") },
    async ({ did }) => {
      try {
        const result = await d1.db
          .prepare("SELECT * FROM harvest_results WHERE user_did = ? LIMIT 1")
          .bind(did)
          .first();
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              did,
              resolved: true,
              hasActivity: !!result,
              timestamp: Date.now(),
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: err instanceof Error ? err.message : "Resolution failed" }),
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "did_create",
    "Create a new DID for a user",
    {
      piUsername: z.string().describe("Pi Network username"),
      trustLevel: z.number().optional().describe("Initial trust level (0-1)"),
    },
    async ({ piUsername, trustLevel }) => {
      const did = `did:pi:${piUsername}:${Date.now().toString(36)}`;
      const score = trustLevel || 0.1;
      await trust.invalidate(did);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            did,
            piUsername,
            trustScore: score,
            created: new Date().toISOString(),
          }),
        }],
      };
    }
  );

  // --- Trust Tools ---

  server.tool(
    "trust_score",
    "Get trust score for a DID",
    { did: z.string().describe("The DID to check") },
    async ({ did }) => {
      try {
        const result = await trust.compute(did);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(result),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: err instanceof Error ? err.message : "Trust computation failed" }),
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "trust_delegate",
    "Delegate trust from one DID to another",
    {
      delegatorDid: z.string().describe("DID granting trust"),
      delegateeDid: z.string().describe("DID receiving trust"),
      trustLevel: z.number().min(0).max(1).describe("Trust level (0-1)"),
    },
    async ({ delegatorDid, delegateeDid, trustLevel }) => {
      try {
        await delegation.addDelegation(delegatorDid, delegateeDid, trustLevel);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              delegator: delegatorDid,
              delegatee: delegateeDid,
              trustLevel,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: err instanceof Error ? err.message : "Delegation failed" }),
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "trust_chain",
    "Resolve trust delegation chain between two DIDs",
    {
      sourceDid: z.string().describe("Source DID"),
      targetDid: z.string().describe("Target DID"),
    },
    async ({ sourceDid, targetDid }) => {
      try {
        const chain = await delegation.resolveChain(sourceDid, targetDid);
        const delegatedTrust = await delegation.computeDelegatedTrust(sourceDid, targetDid);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              source: sourceDid,
              target: targetDid,
              chain,
              delegatedTrust,
              hops: chain.length,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: err instanceof Error ? err.message : "Chain resolution failed" }),
          }],
          isError: true,
        };
      }
    }
  );

  // --- Presence Tools ---

  server.tool(
    "presence_heartbeat",
    "Send agent heartbeat",
    {
      agentId: z.string().describe("Agent identifier"),
      metadata: z.record(z.string(), z.unknown()).optional().describe("Optional metadata"),
    },
    async ({ agentId, metadata }) => {
      try {
        await d1.updatePresence(agentId, "online", metadata);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              agentId,
              status: "online",
              timestamp: Date.now(),
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: err instanceof Error ? err.message : "Heartbeat failed" }),
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "presence_status",
    "Get agent presence status",
    { agentId: z.string().describe("Agent identifier") },
    async ({ agentId }) => {
      try {
        const presence = await d1.getPresence(agentId);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              agentId,
              status: presence?.status || "offline",
              lastHeartbeat: presence?.last_heartbeat || null,
              metadata: presence?.metadata ? JSON.parse(presence.metadata) : null,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: err instanceof Error ? err.message : "Status check failed" }),
          }],
          isError: true,
        };
      }
    }
  );

  // --- Skill Tools ---

  server.tool(
    "skill_list",
    "List available skills in the marketplace",
    {},
    async () => {
      try {
        const result = await d1.db
          .prepare("SELECT DISTINCT skill_slug FROM skill_installs")
          .all<{ skill_slug: string }>();
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              skills: result.results.map((r) => r.skill_slug),
              total: result.results.length,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: err instanceof Error ? err.message : "List failed" }),
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "skill_install",
    "Install a skill for a user",
    {
      slug: z.string().describe("Skill slug"),
      userDid: z.string().describe("User DID"),
      version: z.string().optional().describe("Version to install"),
    },
    async ({ slug, userDid, version }) => {
      try {
        const id = `install-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await d1.db
          .prepare(
            "INSERT OR REPLACE INTO skill_installs (id, skill_slug, user_did, version) VALUES (?, ?, ?, ?)"
          )
          .bind(id, slug, userDid, version || "latest")
          .run();
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              slug,
              userDid,
              version: version || "latest",
              installedAt: new Date().toISOString(),
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: err instanceof Error ? err.message : "Install failed" }),
          }],
          isError: true,
        };
      }
    }
  );

  // --- Harvest Tools ---

  server.tool(
    "harvest_query",
    "Enqueue a harvest query to Perplexity",
    {
      query: z.string().describe("Research query"),
      userDid: z.string().optional().describe("User DID for tracking"),
    },
    async ({ query, userDid }) => {
      try {
        const jobId = `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await env.HARVEST_QUEUE.send({ jobId, query, userDid });
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              jobId,
              query,
              status: "queued",
              timestamp: Date.now(),
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: err instanceof Error ? err.message : "Enqueue failed" }),
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "harvest_result",
    "Get harvest result by job ID",
    { jobId: z.string().describe("Harvest job ID") },
    async ({ jobId }) => {
      try {
        const result = await d1.getHarvestResult(jobId);
        if (!result) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ error: "Harvest result not found" }),
            }],
            isError: true,
          };
        }
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(result),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: err instanceof Error ? err.message : "Fetch failed" }),
          }],
          isError: true,
        };
      }
    }
  );

  return server;
}
