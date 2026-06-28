import {
  bootstrapLangGraphAgentContext,
  streamLangGraphBootstrap,
  type AxiomLangGraphDelegationStep,
} from "../src";

const delegationChain: AxiomLangGraphDelegationStep[] = [
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
];

export async function createDelegationAttestationDraft() {
  return bootstrapLangGraphAgentContext(
    {
      did: "did:axiom:agent-a",
      attestationSubjectDid: "did:axiom:agent-c",
      delegationChain,
      metadata: { graph: "delegated-review" },
    },
    {
      sdkConfig: { network: "testnet" },
      minimumTrustScore: 70,
      includeAttestationDraft: true,
    }
  );
}

export async function logBootstrapStream() {
  for await (const event of streamLangGraphBootstrap(
    { did: "did:axiom:agent-a" },
    { sdkConfig: { network: "testnet" } }
  )) {
    if (event.type === "bootstrap:complete") {
      console.log(event.type, event.context.gate.allowed);
      continue;
    }

    console.log(event.type, event.did);
  }
}
