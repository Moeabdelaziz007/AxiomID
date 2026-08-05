import type { PaiSkill, SkillContext } from "./atom.js";

// Compile-time validation that the Atom interface works as designed.
// If this file compiles, the Atom is structurally sound.

const testSkill: PaiSkill<{ x: number }, { y: number }> = {
  name: "atom-test",
  version: "1.0.0-immutable",
  metadata: {
    price: 0,
    permissions: [],
    acp: { agentId: "atom-test" },
    sandbox: "wasm",
  },
  validateInput(input) {
    return typeof input.x === "number" && Number.isFinite(input.x);
  },
  async execute(input) {
    return { y: input.x * 2 };
  },
};

const ctx: SkillContext = {
  agentId: "test-agent",
  agentDid: "did:agent:0x0",
  config: {},
  secrets: {},
  logger: {
    async info() {},
    async warn() {},
    async error() {},
  },
  storage: {
    async get() { return null; },
    async set() {},
    async delete() {},
  },
  http: {
    async fetch() { return { status: 200, body: "" }; },
  },
};

void testSkill;
void ctx;
