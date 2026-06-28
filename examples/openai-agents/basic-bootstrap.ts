import { Agent, tool } from "@openai/agents";
import { toOpenAIAgentTools } from "@axiomid/sdk";

const axiomTools = toOpenAIAgentTools(tool, {
  sdkConfig: { network: "testnet" },
  minimumTrustScore: 60,
});

export const axiomGatedAgent = new Agent({
  name: "AxiomID gated assistant",
  instructions:
    "Before privileged actions, call axiom_bootstrap_agent_context with the caller DID and continue only when gate.allowed is true.",
  tools: axiomTools,
});
