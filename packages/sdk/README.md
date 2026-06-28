# AxiomID SDK

TypeScript SDK for resolving AxiomID passports, DIDs, trust scores, and agent context.

## LangGraph Integration

The SDK includes dependency-light helpers for LangGraph workflows. They expose AxiomID identity, trust score, Soul Gate, delegation, and attestation context without adding `@langchain/langgraph` as a runtime dependency of `@axiomid/sdk`.

```ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { createAxiomLangGraphNodes, type LangGraphState } from "@axiomid/sdk";

type AgentState = LangGraphState & {
  did: string;
  task: string;
};

const axiom = createAxiomLangGraphNodes({
  sdkConfig: { network: "testnet" },
  minimumTrustScore: 70,
});

const graph = new StateGraph<AgentState>()
  .addNode("axiom_bootstrap", axiom.bootstrapAgentContext)
  .addNode("axiom_gate", axiom.enforceSoulGate)
  .addEdge(START, "axiom_bootstrap")
  .addEdge("axiom_bootstrap", "axiom_gate")
  .addEdge("axiom_gate", END)
  .compile();

await graph.invoke({
  did: "did:axiom:pioneer.username",
  task: "review-restricted-action",
});
```

### What The Integration Provides

- `bootstrapLangGraphAgentContext()` resolves the DID document, fetches trust score context, evaluates Soul Gate, and can create an unsigned attestation draft.
- `assertLangGraphSoulGate()` throws `AxiomIDError` when graph execution should stop.
- `createAxiomLangGraphNodes()` returns graph-ready nodes:
  - `bootstrapAgentContext(state)` reads a DID from graph state and writes AxiomID context back into state. It also forwards optional `attestationSubjectDid`, `delegationChain`, and `metadata` state fields into the bootstrap input.
  - `enforceSoulGate(state)` fails closed when the stored context is denied or missing.
- `streamLangGraphBootstrap()` emits async bootstrap events for streaming graph UIs or audit logs, ending with a `bootstrap:complete` event that includes the final context.

### State Shape

By default, `bootstrapAgentContext()` reads `state.did` and writes `state.axiom`.

```ts
const axiom = createAxiomLangGraphNodes({
  didField: "agentDid",
  contextKey: "identity",
});
```

When `includeAttestationDraft` is enabled on node helpers, graph state can include `attestationSubjectDid`, `delegationChain`, and `metadata` so the generated draft preserves delegation context.

### Delegation And Attestation

Use `includeAttestationDraft` and `delegationChain` when a graph needs to show how authority moved across agents before a privileged task.

```ts
import { bootstrapLangGraphAgentContext } from "@axiomid/sdk";

const context = await bootstrapLangGraphAgentContext(
  {
    did: "did:axiom:agent-a",
    attestationSubjectDid: "did:axiom:agent-c",
    delegationChain: [
      {
        fromDid: "did:axiom:agent-a",
        toDid: "did:axiom:agent-b",
        capability: "research",
      },
      {
        fromDid: "did:axiom:agent-b",
        toDid: "did:axiom:agent-c",
        capability: "attest",
      },
    ],
  },
  {
    sdkConfig: { network: "testnet" },
    includeAttestationDraft: true,
  }
);
```

### Validation

Run these commands from `packages/sdk`:

```bash
npm test
npm run type-check
npm run build
```
