import { DurableObject } from "cloudflare:workers";
import { Router } from "./router";
import { processHarvestJob } from "./workers/harvest-processor";
import { handleMcp } from "./mcp/handler";
import type { Env } from "./lib/types";

// --- Durable Object: Agent Presence ---
export class PresenceDO extends DurableObject {
  private status = false;
  private lastHeartbeat = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<{ status: boolean; lastHeartbeat: number }>("presence");
      if (stored) {
        this.status = stored.status;
        this.lastHeartbeat = stored.lastHeartbeat;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.endsWith("/heartbeat")) {
      this.status = true;
      this.lastHeartbeat = Date.now();
      await this.ctx.storage.put("presence", { status: this.status, lastHeartbeat: this.lastHeartbeat });
      await this.ctx.storage.setAlarm(Date.now() + 10 * 60 * 1000);
      return new Response(JSON.stringify({ status: "ok" }), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname.endsWith("/status")) {
      return new Response(JSON.stringify({
        status: this.status,
        lastHeartbeat: this.lastHeartbeat,
        agentId: url.searchParams.get("agentId") || "default",
      }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("Not Found", { status: 404 });
  }

  async alarm(): Promise<void> {
    this.status = false;
    try {
      await this.ctx.storage.put("presence", { status: this.status, lastHeartbeat: this.lastHeartbeat });
    } catch (err) {
      console.error("PresenceDO alarm storage error:", err);
    }
  }
}

// --- Worker Entry ---
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // MCP endpoint — direct SDK wiring (bypasses router auth/rate-limiting)
    if (url.pathname === "/mcp") {
      return handleMcp(request, env);
    }

    const router = new Router(env);
    return router.handle(request);
  },

  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      await processHarvestJob(message, env);
    }
  },
};
