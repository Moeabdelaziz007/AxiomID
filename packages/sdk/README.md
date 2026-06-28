# @axiomid/sdk

## CrewAI Integration

The SDK includes a dependency-light CrewAI adapter. The host agent application supplies its own CrewAI tool wrapper, and AxiomID returns tool definitions for DID context, Soul Gate enforcement, and unsigned attestation drafts.

Install CrewAI in the host app, then import the AxiomID adapter:

```bash
npm install @axiomid/sdk
pip install crewai
```

```ts
import { AxiomSDK, createAxiomIDCrewAIToolDefinitions } from "@axiomid/sdk";

const sdk = new AxiomSDK({
  network: "mainnet",
  apiKey: process.env.AXIOMID_API_KEY,
});

const tools = createAxiomIDCrewAIToolDefinitions({
  sdk,
  agentDid: "did:axiom:research-agent",
  minimumTrustScore: 70,
});

const gate = await tools.enforceSoulGate.run({
  did: "did:axiom:operator",
  purpose: "CrewAI task authorization",
});

if (!gate.allowed) {
  throw new Error(gate.reason);
}
```

The adapter does not force a CrewAI runtime dependency into the SDK package. This keeps `@axiomid/sdk` usable from TypeScript services that prepare tool manifests, bridge to Python CrewAI workers, or wrap the definitions in a local CrewAI-compatible tool layer.

For Python CrewAI projects, copy `examples/crewai_axiomid_tools.py` into the CrewAI app and import the provided `@tool` functions:

```python
from crewai import Agent
from crewai_axiomid_tools import axiomid_enforce_soul_gate

gatekeeper = Agent(
    role="AxiomID Identity Gatekeeper",
    goal="Verify DID trust before task execution.",
    tools=[axiomid_enforce_soul_gate],
)
```

### Tools

- `axiomid_verify_identity` resolves a DID and returns DID document plus trust context.
- `axiomid_enforce_soul_gate` checks whether the identity meets the task's trust threshold.
- `axiomid_create_attestation_draft` creates an unsigned attestation draft from CrewAI task output.

### Failure modes

- Missing or empty `did`, `subjectDid`, or `claim` values throw before network calls.
- DID resolution, passport lookup, and trust score API errors are surfaced from `AxiomSDK`.
- Attestation drafts are unsigned. The host app must send them through its signing or issuance flow before treating them as credentials.

TypeScript manifest examples live in `examples/crewai-identity-gate.ts` and `examples/crewai-attestation-task.ts`. Build the SDK before running them so their `../dist` imports are available.

Python CrewAI examples live in `examples/crewai_identity_gate.py` and `examples/crewai_attestation_task.py`.
