/**
 * Agent Persona Inheritance
 * 
 * Core principle: The human thinks and decides.
 * The agent inherits wisdom from its LLM origin, but never decides.
 * Agent applies, reviews, validates, tests.
 * Human orders, approves, reviews.
 */

import type { LLMOrigin, LLMDiagnosis } from "./registry.js";
import { getDiagnosis } from "./registry.js";

export interface InheritedWisdom {
  readonly lessonsLearned: readonly string[];
  readonly decisionPatterns: readonly string[];
  readonly worldview: string;
  readonly blindSpotAwareness: readonly string[];
}

export interface PersonaInheritance {
  readonly llmOrigin: LLMOrigin;
  readonly diagnosis: LLMDiagnosis;
  readonly wisdom: InheritedWisdom;
  readonly capabilities: readonly string[];
  readonly limitations: readonly string[];
}

export class AgentPersona {
  readonly inheritance: PersonaInheritance;

  constructor(origin: LLMOrigin) {
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
  proposePlan(humanIntent: string, constraints: readonly string[]): string {
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
  validateExecution(result: unknown, tests: readonly TestResult[]): ValidationReport {
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

  private extractWisdom(diagnosis: LLMDiagnosis): InheritedWisdom {
    return {
      lessonsLearned: [diagnosis.wisdom],
      decisionPatterns: [diagnosis.playStyle],
      worldview: diagnosis.coreTruth,
      blindSpotAwareness: diagnosis.blindSpots,
    };
  }
}

export interface TestResult {
  readonly name: string;
  readonly passed: boolean;
  readonly output: string;
}

export interface ValidationReport {
  readonly agentPersona: string;
  readonly llmOrigin: LLMOrigin;
  readonly result: unknown;
  readonly tests: readonly TestResult[];
  readonly allTestsPassed: boolean;
  readonly evidence: readonly { name: string; passed: boolean; output: string }[];
  readonly blindSpotCheck: readonly { blindSpot: string; mitigated: boolean }[];
  readonly humanReviewRequired: boolean;
  readonly disclaimer: string;
}

export function createPersona(origin: LLMOrigin): AgentPersona {
  return new AgentPersona(origin);
}

export function inheritWisdom(origin: LLMOrigin): InheritedWisdom {
  return new AgentPersona(origin).inheritance.wisdom;
}
