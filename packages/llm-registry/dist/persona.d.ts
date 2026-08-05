/**
 * Agent Persona Inheritance
 *
 * Core principle: The human thinks and decides.
 * The agent inherits wisdom from its LLM origin, but never decides.
 * Agent applies, reviews, validates, tests.
 * Human orders, approves, reviews.
 */
import type { LLMOrigin, LLMDiagnosis } from "./registry.js";
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
export declare class AgentPersona {
    readonly inheritance: PersonaInheritance;
    constructor(origin: LLMOrigin);
    /**
     * The agent proposes a plan but NEVER decides.
     * The human reviews and approves.
     */
    proposePlan(humanIntent: string, constraints: readonly string[]): string;
    /**
     * After execution, the agent validates its own work.
     * It does not declare success — it presents evidence.
     */
    validateExecution(result: unknown, tests: readonly TestResult[]): ValidationReport;
    private extractWisdom;
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
    readonly evidence: readonly {
        name: string;
        passed: boolean;
        output: string;
    }[];
    readonly blindSpotCheck: readonly {
        blindSpot: string;
        mitigated: boolean;
    }[];
    readonly humanReviewRequired: boolean;
    readonly disclaimer: string;
}
export declare function createPersona(origin: LLMOrigin): AgentPersona;
export declare function inheritWisdom(origin: LLMOrigin): InheritedWisdom;
