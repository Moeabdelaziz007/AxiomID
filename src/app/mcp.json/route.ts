export const dynamic = "force-static";

export function GET() {
  const discovery = {
    name: "pai-universe-hub",
    version: "3.0.0",
    protocol: "publicmcp",
    capabilities: { tools: true, resources: true, context: true },
    servers: [
      {
        name: "pai-hub",
        url: "https://axiomid.app/mcp",
        tools: [
          { name: "pi_kyc_verify", description: "Verify Pi KYC UID evidence", inputSchema: { type: "object", properties: { uid: { type: "string" } }, required: ["uid"] }, fuel: { rate: 0.01, currency: "PI", cap_per_turn: 0.05 } },
          { name: "pi_wallet_pay", description: "Pay an agent via Pi", inputSchema: { type: "object", properties: { to: { type: "string" }, memo: { type: "string" } }, required: ["to"] }, fuel: { rate: 0.1, currency: "PI", cap_per_turn: 1.0 } },
          { name: "memory_recall", description: "Bitemporal memory query", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }, fuel: { rate: 0.01, currency: "PI", cap_per_turn: 0.1 } },
          { name: "context_get", description: "CaaS: fetch session context at session start", inputSchema: { type: "object", properties: { session: { type: "string" } } }, fuel: { rate: 0.0, currency: "PI", cap_per_turn: 0.0 } },
        ],
      },
    ],
    verification: { registry: "https://publicmcp.org", status: "pending" },
  };
  return Response.json(discovery, { headers: { "Content-Type": "application/json" } });
}
