export const dynamic = "force-static";

export function GET() {
  const manifest = {
    name: "pai-universe",
    protocol: "ppp/1.0",
    discovery: ["/agentic.txt", "/llms.txt", "/agent.json"],
    source: "github.com/pai-list/protocol-stubs",
    universal_entry_point: "https://axiomid.app",
    subdomains: {
      "": "https://axiomid.app (Universal Hub — Aura OS desktop)",
      index: "https://index.axiomid.app (Central Mirror Directory)",
      aip: "https://aip.axiomid.app (Zero Raw Keys Security Gateway)",
      ppp: "https://ppp.axiomid.app (USB Universal Connector)",
      memory: "https://memory.axiomid.app (7-Layer Memory Engine)",
      earn: "https://earn.axiomid.app (Pi Machine Labor Exchange)",
      auth: "https://auth.axiomid.app (Pi OAuth2 & W3C DID)",
      skills: "https://skills.axiomid.app (Skills Registry & MCP Server)",
      mail: "https://mail.axiomid.app (Agentic Email Gateway)",
    },
    endpoints: {
      memory: { recite: "POST /v1/memory/recall", store: "POST /v1/memory/store" },
      earn: { bounties: "GET /v1/bounties", heartbeat: "GET /heartbeat.md" },
      mcp: "POST /v1/mcp",
      tokens: "POST /v1/tokens/issue",
      spec: "GET /spec.ppp",
    },
    status: "scaffold",
  };
  return Response.json(manifest, { headers: { "Content-Type": "application/json" } });
}
