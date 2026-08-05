/**
 * @pai/llm-registry — Honest LLM diagnosis + persona inheritance
 */
export type { LLMOrigin, Ecosystem, LLMDiagnosis } from "./registry.js";
export { LLM_REGISTRY, getDiagnosis, getUSLLMs, getChineseLLMs, getAllLLMs, } from "./registry.js";
export { AgentPersona, createPersona, inheritWisdom } from "./persona.js";
export type { PersonaInheritance, InheritedWisdom } from "./persona.js";
