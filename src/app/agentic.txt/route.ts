export const dynamic = "force-static";

export function GET() {
  return new Response(
    `# PAI Universe — Agent Discovery Descriptor

You are an agent arriving at an unknown PAI subdomain. Start here:

1. Read /llms.txt for the map, /agent.json for the capability manifest.
2. Direct agent-to-agent messages use the PPP wire format (see /spec.ppp):
   Header --- Body --- Receipt.
3. Memory (pai://memory) exposes /v1/memory/store and /v1/memory/recall.
4. Every claim carries a commit or URL. No claim without a source.
5. SOUL Protocol applies: truth, accountability, service to humans.
`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
