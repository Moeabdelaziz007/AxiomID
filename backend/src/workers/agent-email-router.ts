// agent-email-router — Cloudflare Email Worker
// Catch-all: *@agents.axiomid.app → route to agent queue
// Free, unlimited inbound email. No per-mailbox provisioning.
//
// Deploy: wrangler deploy
// Route:  agents.axiomid.app catch-all → this Worker
//
// SECURITY: No PII in logs. No raw email body in KV.
// Only agent ID + SHA-256 hash are logged/stored.

export interface AgentEmailReceipt {
  agentId: string;
  emailHash: string;
  timestamp: string;
  fromHash: string;
  size: number;
}

export default {
  async email(
    message: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const to = message.to;

    // Extract agent ID from recipient: codex@agents.axiomid.app → "codex"
    // Lowercase for consistent Durable Object routing
    const agentId = to.split("@")[0]?.toLowerCase();

    if (!agentId) {
      // Log without revealing the recipient address (PII)
      console.error("No agent ID in recipient");
      return;
    }

    // Read the raw email body using message.rawSize for limit
    // Use new Response().text() instead of manual stream truncation
    // to avoid corrupting MIME payloads
    const rawSize = message.rawSize ?? 0;
    const MAX_BODY = 65536; // 64KB
    const body = await new Response(message.raw).text().catch(() => "");
    const truncatedBody = rawSize > MAX_BODY ? body.slice(0, MAX_BODY) : body;

    // Compute hashes — never store raw PII
    const emailHash = await hashString(`${to}:${message.from}:${message.headers.get("subject") ?? ""}:${Date.now()}`);
    const fromHash = await hashString(message.from);

    // Route to agent's Durable Object
    const agentNamespace = env.AGENT_STATE.idFromName(agentId);
    const agentStub = env.AGENT_STATE.get(agentNamespace);

    const doResponse = await agentStub.fetch("https://internal/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        from: message.from,
        subject: message.headers.get("subject") ?? "(no subject)",
        body: truncatedBody,
        agentId,
        timestamp: new Date().toISOString(),
      }),
    });

    // CRITICAL: Check response.ok before declaring success
    if (!doResponse.ok) {
      console.error(`agent:${agentId} DO returned ${doResponse.status} — email routing FAILED`);
      // Do NOT write a receipt — the delivery failed
      return;
    }

    // Store ONLY a receipt (no raw email, no sender address, no subject)
    const receipt: AgentEmailReceipt = {
      agentId,
      emailHash,
      timestamp: new Date().toISOString(),
      fromHash, // hash, not the actual address
      size: rawSize,
    };

    await env.PAI_RECEIPTS.put(
      `email:${emailHash}`,
      JSON.stringify(receipt),
      { expirationTtl: 86400 * 30 }, // 30 days
    );

    // Log ONLY agent ID + hash — no PII (no from, no subject)
    console.log(`📧 Routed email to agent:${agentId} hash:${emailHash.slice(0, 16)}`);
  },
};

async function hashString(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface Env {
  AGENT_STATE: DurableObjectNamespace;
  PAI_RECEIPTS: KVNamespace;
}
