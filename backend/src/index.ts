import { DurableObject } from "cloudflare:workers";
import { Router } from "./router";
import { processHarvestJob } from "./workers/harvest-processor";
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
    const router = new Router(env);
    return router.handle(request);
  },

  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    // Concurrency limit: prevent 1000 parallel API calls to Perplexity
    const CONCURRENCY = 15;
    let running = 0;
    const queue: Array<() => void> = [];

    const wait = () => new Promise<void>((resolve) => queue.push(resolve));
    const release = () => {
      running--;
      if (queue.length > 0) queue.shift()!();
    };

    await Promise.allSettled(
      batch.messages.map(async (message) => {
        while (running >= CONCURRENCY) await wait();
        running++;
        try {
          await processHarvestJob(message, env);
        } catch (err) {
          console.error(`Harvest job failed: ${message.id}`, err);
          // Don't rethrow — individual failure doesn't kill the batch
        } finally {
          release();
        }
      })
    );
  },
};
