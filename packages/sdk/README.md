# @axiomid/sdk

TypeScript SDK for querying AxiomID passports, DIDs, trust scores, stamps, and skills.

## Mastra Integration

The SDK includes a dependency-light Mastra adapter. The host application supplies Mastra's `createTool`, and AxiomID returns tool definitions for identity context, Soul Gate enforcement, and unsigned attestation drafts.

Install Mastra in the host agent app, then import the AxiomID adapter:

```bash
npm install @axiomid/sdk @mastra/core zod
```

```ts
import { createTool } from "@mastra/core/tools";
import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { AxiomSDK, createAxiomIDMastraTools } from "@axiomid/sdk";

const sdk = new AxiomSDK({ network: "mainnet", apiKey: process.env.AXIOMID_API_KEY });

const axiomTools = createAxiomIDMastraTools({
  sdk,
  createTool,
  schemas: {
    verifyDidInput: z.object({
      did: z.string(),
      passportSlug: z.string().optional(),
      minimumTrustScore: z.number().optional(),
      purpose: z.string().optional(),
    }),
    soulGateInput: z.object({
      did: z.string(),
      minimumTrustScore: z.number().optional(),
      purpose: z.string().optional(),
    }),
    attestationDraftInput: z.object({
      issuerDid: z.string().optional(),
      subjectDid: z.string(),
      claim: z.string(),
      evidence: z.record(z.string(), z.unknown()).optional(),
      expiresAt: z.string().optional(),
    }),
    objectOutput: z.object({}).passthrough(),
  },
  agentDid: "did:axiom:agent:researcher",
  minimumTrustScore: 60,
});

export const trustedResearchAgent = new Agent({
  name: "trusted-research-agent",
  instructions:
    "Resolve AxiomID identity context before delegated work, enforce Soul Gate, and draft attestations for host signing.",
  tools: {
    verifyDid: axiomTools.verifyDid,
    enforceSoulGate: axiomTools.enforceSoulGate,
    createAttestationDraft: axiomTools.createAttestationDraft,
  },
});
```

### Tools

- `axiomid.verifyDid`: resolves a DID, fetches trust score context, optionally hydrates a passport, and returns a Soul Gate decision.
- `axiomid.enforceSoulGate`: checks whether a DID's trust score meets the configured threshold for an agent action.
- `axiomid.createAttestationDraft`: creates an unsigned AxiomID attestation draft for the host application to sign or submit.

The adapter does not force a specific Mastra or Zod version into the SDK dependency graph. The host app supplies Mastra-compatible schemas, so it can use Zod or another Standard Schema implementation supported by its Mastra version.

The repository example lives at `examples/mastra-trust-gate.ts`. Copy it into a Mastra app, set `AXIOMID_API_KEY` when using authenticated endpoints, and register `trustedResearchAgent` with that app's Mastra instance.
