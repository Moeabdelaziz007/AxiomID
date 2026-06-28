import { AxiomSDK, createAxiomIDAutoGenToolDefinitions } from "../dist";

const sdk = new AxiomSDK({
  network: "testnet",
  apiKey: process.env.AXIOMID_API_KEY,
});

const tools = createAxiomIDAutoGenToolDefinitions({
  sdk,
  agentDid: "did:axiom:autogen-attester",
  minimumTrustScore: 65,
});

async function runGatedAutoGenTask() {
  const context = await tools.enforceSoulGate.run({
    did: "did:axiom:task-operator",
    purpose: "Authorize AutoGen task execution",
  });

  const draft = await tools.createAttestationDraft.run({
    subjectDid: context.did,
    claim: "AutoGen task completed after AxiomID Soul Gate approval",
    evidence: {
      trustScore: context.trustScore.score,
      trustTier: context.trustScore.tier,
      gateReason: context.soulGate.reason,
    },
  });

  console.log(JSON.stringify(draft, null, 2));
}

runGatedAutoGenTask().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
