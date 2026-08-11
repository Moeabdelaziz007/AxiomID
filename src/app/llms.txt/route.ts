export const dynamic = "force-static";

export function GET() {
  return new Response(
    `# axiomid.app (Aura OS — Sovereign AI Desktop)

> Summary: PAI Universe hub. Full Aura OS desktop, agent identity, skills registry, memory engine, and protocol mirror.

- /plans — Aura OS compute tiers (P1/P2/P3)
- /dashboard — Control Center
- /agent.json — structured capability manifest (JSON)
- /agentic.txt — agent instructions (markdown)
- /mcp.json — MCP server discovery (JSON)
- /spec.ppp — 3-section PPP wire format sample (ppp.axiomid.app)
- /v1/memory/recall — memory RECALL endpoint (POST)
- /v1/memory/store — memory STORE endpoint (POST)
- /v1/bounties — earn bounties (GET)
- /heartbeat.md — 10-min liveness pulse sample
- /skill.md — machine-labor submission spec
`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
