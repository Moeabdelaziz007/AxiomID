import { DurableObject } from "cloudflare:workers";

export class PresenceDO extends DurableObject {
  private status: boolean = false;
  private lastHeartbeat: number = 0;

  constructor(ctx: DurableObjectState, env: any) {
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
    if (url.pathname === "/heartbeat") {
      this.status = true;
      this.lastHeartbeat = Date.now();
      await this.ctx.storage.put("presence", { status: this.status, lastHeartbeat: this.lastHeartbeat });
      
      await this.ctx.storage.setAlarm(Date.now() + 10 * 60 * 1000);
      
      return new Response("OK", { status: 200 });
    }
    
    if (url.pathname === "/status") {
      return new Response(JSON.stringify({
        status: this.status,
        lastHeartbeat: this.lastHeartbeat,
        agentId: url.searchParams.get("agentId") || "default",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    return new Response("Not Found", { status: 404 });
  }

  async alarm(): Promise<void> {
    this.status = false;
    await this.ctx.storage.put("presence", { status: this.status, lastHeartbeat: this.lastHeartbeat });
  }

  async queue(batch: MessageBatch<any>): Promise<void> {
    for (const message of batch.messages) {
      const { jobId } = message.body;
      console.log(`Processing harvest job: ${jobId}`);
      message.ack();
    }
  }
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === "/heartbeat" || url.pathname === "/" || url.pathname === "/status") {
      const authHeader = request.headers.get("X-Shared-Secret");
      if (!env.SHARED_SECRET_TOKEN_VERCEL_CF || !authHeader) {
        return new Response("Unauthorized", { status: 401 });
      }
      const secret = env.SHARED_SECRET_TOKEN_VERCEL_CF;
      if (authHeader.length !== secret.length) {
        return new Response("Unauthorized", { status: 401 });
      }
      let match = 0;
      for (let i = 0; i < authHeader.length; i++) {
        match |= authHeader.charCodeAt(i) ^ secret.charCodeAt(i);
      }
      if (match !== 0) {
        return new Response("Unauthorized", { status: 401 });
      }

      const agentId = url.searchParams.get("agentId") || "default";
      const id = env.PRESENCE_DO.idFromName(agentId);
      const obj = env.PRESENCE_DO.get(id);
      return obj.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
  async queue(batch: MessageBatch<any>, env: any): Promise<void> {
    const id = env.PRESENCE_DO.idFromName("harvest-processor");
    const obj = env.PRESENCE_DO.get(id);
    await obj.queue(batch);
  }
};
