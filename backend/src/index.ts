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
      
      // Set an alarm for TTL cleanup (e.g., 10 minutes)
      await this.ctx.storage.setAlarm(Date.now() + 10 * 60 * 1000);
      
      return new Response("OK", { status: 200 });
    }
    
    return new Response("Not Found", { status: 404 });
  }

  async queue(batch: MessageBatch<any>): Promise<void> {
    for (const message of batch.messages) {
      const { jobId } = message.body;
      // Implement harvest logic here
      console.log(`Processing harvest job: ${jobId}`);
      message.ack();
    }
  }
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/heartbeat") {
      const id = env.PRESENCE_DO.idFromName(url.searchParams.get("agentId") || "default");
      const obj = env.PRESENCE_DO.get(id);
      return obj.fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  },
  async queue(batch: MessageBatch<any>, env: any): Promise<void> {
    // You can also route to a DO or directly process
    const id = env.PRESENCE_DO.idFromName("harvest-processor");
    const obj = env.PRESENCE_DO.get(id);
    await obj.queue(batch);
  }
};
