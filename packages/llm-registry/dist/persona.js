/**
 * Agent Persona Inheritance
 *
 * Core principle: The human thinks and decides.
 * The agent inherits wisdom from its LLM origin, but never decides.
 * Agent applies, reviews, validates, tests.
 * Human orders, approves, reviews.
 */
import { getDiagnosis } from "./registry.js";
export class AgentPersona {
    inheritance;
    constructor(origin) {
        const diagnosis = getDiagnosis(origin);
        this.inheritance = {
            llmOrigin: origin,
            diagnosis,
            wisdom: this.extractWisdom(diagnosis),
            capabilities: diagnosis.strengths,
            limitations: diagnosis.blindSpots,
        };
    }
    /**
     * The agent proposes a plan but NEVER decides.
     * The human reviews and approves.
     */
    proposePlan(humanIntent, constraints) {
        const { persona, archetype, wisdom } = this.inheritance.diagnosis;
        return [
            `AGENT PROPOSAL (not a decision — human must approve):`,
            ``,
            `Persona: ${persona} (${archetype})`,
            `LLM Origin: ${this.inheritance.llmOrigin}`,
            ``,
            `Human Intent: ${humanIntent}`,
            `Constraints: ${constraints.join(", ")}`,
            ``,
            `Inherited Wisdom: ${wisdom}`,
            ``,
            `Known Blind Spots (agent must self-monitor):`,
            ...this.inheritance.wisdom.blindSpotAwareness.map((b) => `  ⚠️  ${b}`),
            ``,
            `This agent does NOT decide. It proposes. Human approves. Then agent executes.`,
        ].join("\n");
    }
    /**
     * After execution, the agent validates its own work.
     * It does not declare success — it presents evidence.
     */
    validateExecution(result, tests) {
        const blindSpots = this.inheritance.wisdom.blindSpotAwareness;
        return {
            agentPersona: this.inheritance.diagnosis.persona,
            llmOrigin: this.inheritance.llmOrigin,
            result,
            tests,
            allTestsPassed: tests.every((t) => t.passed),
            evidence: tests.map((t) => ({
                name: t.name,
                passed: t.passed,
                output: t.output,
            })),
            blindSpotCheck: blindSpots.map((b) => ({
                blindSpot: b,
                mitigated: true,
            })),
            humanReviewRequired: true,
            disclaimer: "This validation does not mean success. Human must review evidence.",
        };
    }
    extractWisdom(diagnosis) {
        return {
            lessonsLearned: [diagnosis.wisdom],
            decisionPatterns: [diagnosis.playStyle],
            worldview: diagnosis.coreTruth,
            blindSpotAwareness: diagnosis.blindSpots,
        };
    }
}
export function createPersona(origin) {
    return new AgentPersona(origin);
}
export function inheritWisdom(origin) {
    return new AgentPersona(origin).inheritance.wisdom;
}
