# AxiomID SDK

TypeScript SDK for resolving AxiomID passports, DIDs, trust scores, and agent context.

## OpenAI Agents SDK integration

The SDK includes dependency-light helpers for OpenAI Agents SDK projects. They expose AxiomID identity and Soul Gate context without forcing `@openai/agents` into this package's runtime dependencies.

```ts
import { Agent, tool } from "@openai/agents";
import { toOpenAIAgentTools } from "@axiomid/sdk";

const axiomTools = toOpenAIAgentTools(tool, {
  sdkConfig: { network: "mainnet" },
  minimumTrustScore: 70,
});

export const agent = new Agent({
  name: "Axiom-gated assistant",
  instructions:
    "Resolve the caller DID and check AxiomID Soul Gate before taking privileged actions.",
  tools: axiomTools,
});
```

### What the integration provides

- `bootstrapOpenAIAgentContext()` resolves the DID document, fetches trust score context, and evaluates Soul Gate.
- `assertOpenAIAgentSoulGate()` throws `AxiomIDError` when the agent context does not meet the configured minimum trust score.
- `createAxiomOpenAIAgentTools()` returns plain tool definitions with `name`, `description`, `parameters`, and `execute`.
- `toOpenAIAgentTools()` adapts those definitions through a caller-supplied OpenAI Agents SDK `tool` factory.

### Minimal setup

1. Install both packages in your agent project:

   ```bash
   npm install @axiomid/sdk @openai/agents
   ```

2. Create AxiomID tools:

   ```ts
   import { tool } from "@openai/agents";
   import { toOpenAIAgentTools } from "@axiomid/sdk";

   const tools = toOpenAIAgentTools(tool, {
     sdkConfig: { network: "testnet" },
     minimumTrustScore: 60,
   });
   ```

3. Add the tools to your OpenAI agent and instruct it to call `axiom_bootstrap_agent_context` before privileged work.

### Tool list

| Tool | Purpose |
| --- | --- |
| `axiom_resolve_did` | Resolve the AxiomID DID document. |
| `axiom_get_trust_score` | Fetch trust score and tier context. |
| `axiom_bootstrap_agent_context` | Resolve DID, fetch trust score, and evaluate Soul Gate in one call. Tool callers may request a stricter `minimumTrustScore`, but they cannot lower the developer-configured floor. |

### Validation

Run these commands from `packages/sdk`:

```bash
npm test
npm run type-check
npm run build
```
