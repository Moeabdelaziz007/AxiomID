import { AxiomSDK, createAxiomIDAutoGenAdapter } from "../dist";

const sdk = new AxiomSDK({
  network: "mainnet",
  apiKey: process.env.AXIOMID_API_KEY,
});

const axiom = createAxiomIDAutoGenAdapter({
  sdk,
  agentDid: "did:axiom:autogen-reviewer",
  minimumTrustScore: 70,
  defaultPurpose: "Prepare trusted AutoGen context",
});

async function bootstrapAutoGenContext() {
  const context = await axiom.bootstrapAgent({
    did: "did:axiom:task-operator",
    passportSlug: "task-operator",
    metadata: {
      conversationId: "autogen-demo",
    },
  });

  console.log(context.systemMessage);
  console.log(JSON.stringify(context.toolContext, null, 2));
}

bootstrapAutoGenContext().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
