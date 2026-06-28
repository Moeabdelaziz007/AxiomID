import { AxiomSDK, createAxiomIDCrewAIToolDefinitions } from "../dist";

const sdk = new AxiomSDK({
  network: "mainnet",
  apiKey: process.env.AXIOMID_API_KEY,
});

const tools = createAxiomIDCrewAIToolDefinitions({
  sdk,
  agentDid: "did:axiom:crewai-research-agent",
  minimumTrustScore: 70,
});

async function authorizeCrewAITask() {
  const result = await tools.enforceSoulGate.run({
    did: "did:axiom:task-operator",
    purpose: "Authorize CrewAI research task",
  });

  if (!result.allowed) {
    throw new Error(result.reason);
  }

  return result.context;
}

authorizeCrewAITask()
  .then((context) => {
    console.log("CrewAI task authorized for", context.did);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
