# @axiomid/sdk

TypeScript SDK for querying AxiomID passports, DIDs, trust scores, stamps, and skills.

## AutoGen Integration

The SDK includes a dependency-light AutoGen adapter. It resolves AxiomID identity context before an AutoGen run, checks a Soul Gate trust threshold, and creates unsigned attestation drafts from agent output.

The adapter deliberately does not add AutoGen as a runtime dependency. Host applications can wrap the exported function definitions in Microsoft AutoGen `FunctionTool`, register them in an AutoGen workbench, or call the helpers before creating an agent.

```bash
npm install @axiomid/sdk
pip install autogen-agentchat autogen-core
```

```ts
import { AxiomSDK, createAxiomIDAutoGenAdapter } from "@axiomid/sdk";

const sdk = new AxiomSDK({
  network: "mainnet",
  apiKey: process.env.AXIOMID_API_KEY,
});

const axiom = createAxiomIDAutoGenAdapter({
  sdk,
  agentDid: "did:axiom:autogen-reviewer",
  minimumTrustScore: 70,
});

const context = await axiom.requireSoulGate({
  did: "did:axiom:operator",
  purpose: "Authorize AutoGen research task",
});

const systemMessage = [
  "You are a review agent.",
  context.systemMessage,
].join("\n\n");
```

### Tools

`createAxiomIDAutoGenToolDefinitions()` returns three dependency-free function definitions:

- `axiomid_bootstrap_identity` resolves a DID, fetches trust score context, optionally hydrates a passport, and returns a system message plus tool context.
- `axiomid_enforce_soul_gate` requires the DID to meet the configured trust threshold before work proceeds.
- `axiomid_create_attestation_draft` creates an unsigned attestation draft for host signing or submission.

### Failure Modes

- Missing `did`, `issuerDid`, `subjectDid`, or `claim` values throw before network calls.
- DID, passport, and trust score lookup errors are surfaced from `AxiomSDK`.
- `requireSoulGate()` throws `AxiomIDAutoGenGateError` when the trust score is below the configured threshold.
- Attestation drafts are unsigned; the host application must sign or submit them through its own issuance flow.

### Examples

- `examples/autogen-basic-bootstrap.ts` resolves identity context and prints the system message that can be injected into an AutoGen agent.
- `examples/autogen-gated-task.ts` uses the exported tool definitions to enforce Soul Gate and draft task-completion evidence.

When running these examples from a source checkout of this repository, build the SDK first so their `../dist` imports are available.
