// agent-email-router — Cloudflare Email Worker
// Catch-all: *@agents.axiomid.app → route to agent queue
// Free, unlimited inbound email. No per-mailbox provisioning.
//
// Deploy: wrangler deploy
// Route:  agents.axiomid.app catch-all → this Worker

export interface AgentEmail {
  to: string;
  from: string;
  subject: string;
  body: string;
  agentId: string;
  timestamp: string;
}

export default {
  async email(
    message: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const to = message.to;
    const from = message.from;
    const subject = message.headers.get("subject") ?? "(no subject)";

    // Extract agent ID from recipient: codex@agents.axiomid.app → "codex"
    const agentId = to.split("@")[0];

    if (!agentId) {
      console.error("No agent ID in recipient:", to);
      return;
    }

    const email: AgentEmail = {
      to,
      from,
      subject,
      body: await streamToText(message.raw),
      agentId,
      timestamp: new Date().toISOString(),
    };

    // Route to agent's Durable Object
    const agentNamespace = env.AGENT_STATE.idFromName(agentId);
    const agentStub = env.AGENT_STATE.get(agentNamespace);

    await agentStub.fetch("https://internal/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(email),
    });

    // Log to PAI_RECEIPTS KV for audit
    const emailHash = await hashEmail(email);
    await env.PAI_RECEIPTS.put(
      `email:${emailHash}`,
      JSON.stringify({ ...email, hash: emailHash }),
      { expirationTtl: 86400 * 30 }, // 30 days
    );

    console.log(`📧 Routed email to agent:${agentId} from:${from} subj:"${subject}"`);
  },
};

async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const MAX = 65536; // 64KB max body
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (total + value.length > MAX) break;
    chunks.push(value);
    total += value.length;
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function hashEmail(email: AgentEmail): Promise<string> {
  const data = new TextEncoder().encode(
    `${email.to}:${email.from}:${email.subject}:${email.timestamp}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface Env {
  AGENT_STATE: DurableObjectNamespace;
  PAI_RECEIPTS: KVNamespace;
}
