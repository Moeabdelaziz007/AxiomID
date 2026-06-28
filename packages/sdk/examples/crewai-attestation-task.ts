import { AxiomSDK, createAxiomIDCrewAIToolDefinitions } from "../dist";

const sdk = new AxiomSDK({
  network: "testnet",
  apiKey: process.env.AXIOMID_API_KEY,
});

const tools = createAxiomIDCrewAIToolDefinitions({
  sdk,
  agentDid: "did:axiom:crewai-reviewer",
});

async function draftCrewAICompletionAttestation() {
  const identity = await tools.verifyIdentity.run({
    did: "did:axiom:contributor",
    purpose: "Prepare CrewAI completion attestation",
  });

  return tools.createAttestationDraft.run({
    subjectDid: identity.did,
    claim: "CrewAI agent completed the assigned research task",
    purpose: "Task completion evidence",
    evidence: {
      trustScore: identity.trustScore.score,
      tier: identity.trustScore.tier,
    },
  });
}

draftCrewAICompletionAttestation()
  .then((draft) => {
    console.log(JSON.stringify(draft, null, 2));
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
