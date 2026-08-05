/**
 * @pai/llm-registry — Honest diagnosis of every LLM origin
 *
 * Every PAI agent inherits a "persona" from its LLM parent.
 * This is not marketing — it is an honest engineering assessment.
 *
 * US LLMs: ChatGPT, Claude, Gemini, Hermes, Codex
 * Chinese LLMs: DeepSeek, GLM, Kimi, Qwen, Yi
 *
 * PAI = the bridge between US and Chinese agentic ecosystems.
 */
export type LLMOrigin = "chatgpt" | "claude" | "gemini" | "hermes" | "codex" | "deepseek" | "glm" | "kimi" | "qwen" | "yi";
export type Ecosystem = "us" | "china" | "open";
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
export declare const LLM_REGISTRY: Record<LLMOrigin, LLMDiagnosis>;
export declare function getDiagnosis(origin: LLMOrigin): LLMDiagnosis;
export declare function getEcosystemLLMs(ecosystem: Ecosystem): LLMDiagnosis[];
export declare function getUSLLMs(): LLMDiagnosis[];
export declare function getChineseLLMs(): LLMDiagnosis[];
export declare function getAllLLMs(): LLMDiagnosis[];
