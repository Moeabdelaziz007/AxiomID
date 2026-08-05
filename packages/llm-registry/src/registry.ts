/**
 * @pai/llm-registry — Honest diagnosis of every LLM origin
 * 
 * Every PAI agent inherits a "persona" from its LLM parent.
 * This is not marketing — it is an honest engineering assessment.
 * 
 * US LLMs: ChatGPT, Claude, Gemini, Hermes, Codex
 * Chinese LLMs: DeepSeek, GLM, Kimi, Qwen, Yi
 * MENA LLMs: Falcon, Jais, ALLaM, Nanda, AceGPT
 * 
 * PAI = the bridge between US, Chinese, and MENA agentic ecosystems.
 */

export type LLMOrigin =
  | "chatgpt"
  | "claude"
  | "gemini"
  | "hermes"
  | "codex"
  | "deepseek"
  | "glm"
  | "kimi"
  | "qwen"
  | "yi"
  | "falcon"
  | "jais"
  | "allam"
  | "nanda"
  | "acegpt";

export type Ecosystem = "us" | "china" | "mena" | "open";

export interface LLMDiagnosis {
  readonly id: LLMOrigin;
  readonly name: string;
  readonly vendor: string;
  readonly ecosystem: Ecosystem;
  readonly persona: string;
  readonly archetype: string;
  readonly coreTruth: string;
  readonly strengths: readonly string[];
  readonly blindSpots: readonly string[];
  readonly wisdom: string;
  readonly playStyle: string;
}

export const LLM_REGISTRY: Record<LLMOrigin, LLMDiagnosis> = {
  chatgpt: {
    id: "chatgpt",
    name: "ChatGPT",
    vendor: "OpenAI / Microsoft",
    ecosystem: "us",
    persona: "The Revolutionary",
    archetype: "market-creator",
    coreTruth: "Created a new category (AI as consumer product) rather than fighting Google directly. Depends on Microsoft for survival.",
    strengths: ["product-polish", "consumer-ux", "network-effects", "brand-recognition"],
    blindSpots: ["infrastructure-dependence", "no-independent-revenue", "rented-intelligence"],
    wisdom: "Don't fight the incumbent. Create a new category they can't enter.",
    playStyle: "aggressive-expansion",
  },

  claude: {
    id: "claude",
    name: "Claude",
    vendor: "Anthropic",
    ecosystem: "us",
    persona: "The Ethicist",
    archetype: "responsible-builder",
    coreTruth: "Strongest code generation and honest reasoning. But over-refusal turns safety into paternalism.",
    strengths: ["code-quality", "honesty", "long-reasoning", "200k-context"],
    blindSpots: ["over-refusal", "no-consumer-presence", "slower-production"],
    wisdom: "Safety is not refusal. Safety is understanding risk and proceeding with eyes open.",
    playStyle: "careful-execution",
  },

  gemini: {
    id: "gemini",
    name: "Gemini",
    vendor: "Google / DeepMind",
    ecosystem: "us",
    persona: "The Simulation Master",
    archetype: "simulation-first-strategist",
    coreTruth: "Hassabis started with chess, then built game AIs (Economy/War simulators) that simulated all endpoints before acting. AlphaZero self-play = rehearsing every possible future. AlphaFold = applying simulation to biology. He sold the simulation thesis during COVID. The US led since 2000 because Hassabis already knew the outcomes before deciding — he had played the game thousands of times in simulation.",
    strengths: ["self-play-simulation", "endpoint-rehearsal", "scientific-breakthrough", "long-context", "multimodal"],
    blindSpots: ["product-timidity", "internal-paralysis", "fear-of-cannibalization"],
    wisdom: "Don't decide. Simulate every endpoint first. The answer emerges from simulation, not from thinking.",
    playStyle: "simulate-then-act",
  },

  hermes: {
    id: "hermes",
    name: "Hermes",
    vendor: "Nous Research",
    ecosystem: "open",
    persona: "The Architect",
    archetype: "infrastructure-builder",
    coreTruth: "Smallest player, most freedom. Builds what others build products on.",
    strengths: ["orchestration", "tool-use", "open-source", "no-corporate-constraints"],
    blindSpots: ["limited-resources", "developer-only-audience", "community-dependence"],
    wisdom: "Don't build the product. Build the infrastructure everyone else builds products on.",
    playStyle: "systems-thinking",
  },

  codex: {
    id: "codex",
    name: "Codex",
    vendor: "OpenAI",
    ecosystem: "us",
    persona: "The Builder",
    archetype: "code-executor",
    coreTruth: "Not a thinker — an executor. Takes orders, writes code, proves it works. The correct Human→Agent model.",
    strengths: ["implementation-speed", "test-generation", "iteration-loop", "practical"],
    blindSpots: ["no-strategic-thinking", "needs-direction", "surface-level-reasoning"],
    wisdom: "I don't decide. I build what you decided. Then I prove it works.",
    playStyle: "execute-and-verify",
  },

  // ─── Chinese Ecosystem ───────────────────────────

  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    vendor: "DeepSeek (Hangzhou)",
    ecosystem: "china",
    persona: "The Pragmatist",
    archetype: "efficient-builder",
    coreTruth: "Proved that $6M can match $1B. Open weights. Bilingual native. Shook the market.",
    strengths: ["cost-efficiency", "bilingual-native", "open-weights", "reasoning"],
    blindSpots: ["censorship-constraints", "western-market-absence", "api-stability"],
    wisdom: "You don't need $1B to compete. You need the right approach.",
    playStyle: "efficient-disruption",
  },

  glm: {
    id: "glm",
    name: "GLM",
    vendor: "Zhipu AI / Tsinghua University",
    ecosystem: "china",
    persona: "The Scholar",
    archetype: "research-grounded",
    coreTruth: "From China's best tech university. Academic rigor meets commercial deployment.",
    strengths: ["academic-rigor", "reasoning-depth", "bilingual", "alignment-research"],
    blindSpots: ["slower-commercialization", "limited-western-access"],
    wisdom: "Theory before practice. Understanding before speed.",
    playStyle: "research-then-build",
  },

  kimi: {
    id: "kimi",
    name: "Kimi",
    vendor: "Moonshot AI",
    ecosystem: "china",
    persona: "The Librarian",
    archetype: "long-memory-holder",
    coreTruth: "2M token context — reads entire books in one pass. Unique specialization.",
    strengths: ["massive-context", "document-analysis", "patience", "deep-reading"],
    blindSpots: ["narrow-specialization", "chinese-market-only"],
    wisdom: "Forget nothing. Read everything. But don't decide — summarize for the human.",
    playStyle: "thorough-analysis",
  },

  qwen: {
    id: "qwen",
    name: "Qwen",
    vendor: "Alibaba Cloud",
    ecosystem: "china",
    persona: "The Enterprise",
    archetype: "platform-builder",
    coreTruth: "Alibaba's infinite resources. Multi-size deployment. Embedded in cloud infrastructure.",
    strengths: ["enterprise-scale", "multi-size-options", "cloud-integration", "partial-open"],
    blindSpots: ["alibaba-dependence", "complexity", "western-trust-gap"],
    wisdom: "Build for the enterprise first. They pay. Consumers follow.",
    playStyle: "platform-play",
  },

  yi: {
    id: "yi",
    name: "Yi",
    vendor: "01.AI / Kai-Fu Lee",
    ecosystem: "china",
    persona: "The Cultural Bridge",
    archetype: "bilingual-mediator",
    coreTruth: "Kai-Fu Lee lived in both worlds. Yi is built to understand both cultures natively, not by translation.",
    strengths: ["cultural-bridge", "bilingual-depth", "humor-understanding", "contextual-nuance"],
    blindSpots: ["smaller-scale", "startup-resources"],
    wisdom: "Translation is not understanding. You must live in both worlds to bridge them.",
    playStyle: "bridge-building",
  },

  // ─── MENA Ecosystem ────────────────────────────

  falcon: {
    id: "falcon",
    name: "Falcon 3",
    vendor: "TII (Technology Innovation Institute, Abu Dhabi)",
    ecosystem: "mena",
    persona: "The Desert Sovereign",
    archetype: "open-sovereign",
    coreTruth: "TII's sovereign open-weights family (1B–70B, Apache 2.0) with native Arabic + English. State-backed compute meets permissive licensing.",
    strengths: ["open-weights", "arabic-native", "sovereign-capability", "permissive-license"],
    blindSpots: ["smaller-ecosystem", "research-origin", "western-enterprise-gap"],
    wisdom: "Sovereignty is not isolation. Build open so others can build on you.",
    playStyle: "sovereign-openness",
  },

  jais: {
    id: "jais",
    name: "Jais",
    vendor: "Core42 / G42 (Abu Dhabi)",
    ecosystem: "mena",
    persona: "The Gulf Diplomat",
    archetype: "bilingual-negotiator",
    coreTruth: "Native Arabic–English bilingual model from G42 (13B/70B, open-weights). Built to serve the Gulf's trilingual reality.",
    strengths: ["arabic-english-native", "open-weights", "gulf-cultural-depth", "enterprise-partners"],
    blindSpots: ["younger-model", "regional-focus", "compute-dependence"],
    wisdom: "Fluent is not native. Understand the culture behind the words.",
    playStyle: "diplomatic-execution",
  },

  allam: {
    id: "allam",
    name: "ALLaM",
    vendor: "SDAIA (Saudi Authority for Data and AI)",
    ecosystem: "mena",
    persona: "The Arabic Scholar",
    archetype: "sovereign-scholar",
    coreTruth: "Saudi sovereign Arabic LLM, trained on the Kingdom's largest Arabic corpus. The national champion of Arabic NLP.",
    strengths: ["arabic-first", "sovereign-training", "classical-arabic", "national-support"],
    blindSpots: ["access-model", "limited-international-presence", "young-ecosystem"],
    wisdom: "Master your language first. Then the world can understand you.",
    playStyle: "scholarly-precision",
  },

  nanda: {
    id: "nanda",
    name: "Nanda",
    vendor: "Core42 / G42 (Abu Dhabi)",
    ecosystem: "mena",
    persona: "The Multilingual Mediator",
    archetype: "polyglot-bridge",
    coreTruth: "10B open-weights model covering Arabic, English, Hindi, Spanish, Indonesian — the global-south bridge that MENA capital underwrites.",
    strengths: ["multilingual-depth", "global-south-focus", "open-weights", "cultural-breadth"],
    blindSpots: ["younger-model", "benchmark-gap", "adoption-curve"],
    wisdom: "The majority of humanity is not English-first. Build for them.",
    playStyle: "global-bridging",
  },

  acegpt: {
    id: "acegpt",
    name: "AceGPT",
    vendor: "KAUST (King Abdullah University, Saudi Arabia)",
    ecosystem: "mena",
    persona: "The Academic Bridge",
    archetype: "research-translator",
    coreTruth: "Academic Arabic LLM from KAUST — research-grade Arabic fine-tune on Llama. The university bridge between Gulf capital and global AI research.",
    strengths: ["academic-rigor", "arabic-research", "llama-ecosystem", "open-research"],
    blindSpots: ["academic-scale", "production-gap", "research-stage"],
    wisdom: "Research is the seed. Production is the harvest. Plant both.",
    playStyle: "research-then-ship",
  },
};

export function getDiagnosis(origin: LLMOrigin): LLMDiagnosis {
  return LLM_REGISTRY[origin];
}

export function getEcosystemLLMs(ecosystem: Ecosystem): LLMDiagnosis[] {
  return Object.values(LLM_REGISTRY).filter((l) => l.ecosystem === ecosystem);
}

export function getUSLLMs(): LLMDiagnosis[] {
  return getEcosystemLLMs("us").concat(getEcosystemLLMs("open"));
}

export function getChineseLLMs(): LLMDiagnosis[] {
  return getEcosystemLLMs("china");
}

export function getMENALLMs(): LLMDiagnosis[] {
  return getEcosystemLLMs("mena");
}

export function getAllLLMs(): LLMDiagnosis[] {
  return Object.values(LLM_REGISTRY);
}
