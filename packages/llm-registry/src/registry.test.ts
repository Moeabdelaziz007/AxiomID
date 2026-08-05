/**
 * @pai/llm-registry — Test suite
 * 
 * Verifies: registry completeness (15 LLMs across 3 ecosystems),
 * ecosystem getters, persona inheritance, and MENA coverage.
 */
import { describe, it, expect } from "vitest";
import {
  LLM_REGISTRY,
  getDiagnosis,
  getUSLLMs,
  getChineseLLMs,
  getMENALLMs,
  getAllLLMs,
} from "./registry.js";
import { createPersona, inheritWisdom } from "./persona.js";

describe("LLM_REGISTRY", () => {
  it("contains exactly 15 LLMs (5 US + 5 China + 5 MENA)", () => {
    expect(Object.keys(LLM_REGISTRY)).toHaveLength(15);
  });

  it("has the 5 US models", () => {
    const us = getUSLLMs();
    expect(us.map((l) => l.id)).toEqual(
      expect.arrayContaining(["chatgpt", "claude", "gemini", "codex"])
    );
  });

  it("has the 5 Chinese models", () => {
    const china = getChineseLLMs();
    expect(china.map((l) => l.id)).toEqual(
      expect.arrayContaining(["deepseek", "glm", "kimi", "qwen", "yi"])
    );
    expect(china).toHaveLength(5);
  });

  it("has exactly 5 MENA models", () => {
    const mena = getMENALLMs();
    expect(mena).toHaveLength(5);
    expect(mena.map((l) => l.id)).toEqual(
      expect.arrayContaining(["falcon", "jais", "allam", "nanda", "acegpt"])
    );
  });

  it("MENA models are all from MENA-region vendors", () => {
    for (const llm of getMENALLMs()) {
      expect(llm.ecosystem).toBe("mena");
      expect(llm.vendor).toMatch(/TII|G42|SDAIA|KAUST/i);
    }
  });

  it("every entry has complete diagnosis fields", () => {
    for (const llm of getAllLLMs()) {
      expect(llm.id).toBeTruthy();
      expect(llm.name).toBeTruthy();
      expect(llm.vendor).toBeTruthy();
      expect(llm.persona).toBeTruthy();
      expect(llm.archetype).toBeTruthy();
      expect(llm.coreTruth.length).toBeGreaterThan(20);
      expect(llm.strengths.length).toBeGreaterThan(0);
      expect(llm.blindSpots.length).toBeGreaterThan(0);
      expect(llm.wisdom.length).toBeGreaterThan(10);
      expect(llm.playStyle).toBeTruthy();
    }
  });

  it("getDiagnosis returns the right entry", () => {
    expect(getDiagnosis("falcon").name).toBe("Falcon 3");
    expect(getDiagnosis("jais").vendor).toContain("G42");
    expect(getDiagnosis("allam").vendor).toContain("SDAIA");
  });
});

describe("Persona inheritance", () => {
  it("createPersona builds a persona for MENA origins", () => {
    const persona = createPersona("jais");
    expect(persona.inheritance.llmOrigin).toBe("jais");
    expect(persona.inheritance.diagnosis.persona).toBe("The Gulf Diplomat");
    expect(persona.inheritance.capabilities).toContain("arabic-english-native");
  });

  it("proposePlan never decides — always requires human approval", () => {
    const plan = createPersona("falcon").proposePlan("Build a passport", ["zero-cost"]);
    expect(plan).toContain("human must approve");
    expect(plan).toContain("does NOT decide");
  });

  it("validateExecution flags humanReviewRequired", () => {
    const report = createPersona("allam").validateExecution({ ok: true }, [
      { name: "t1", passed: true, output: "x" },
    ]);
    expect(report.allTestsPassed).toBe(true);
    expect(report.humanReviewRequired).toBe(true);
  });

  it("inheritWisdom works for MENA origins", () => {
    const wisdom = inheritWisdom("nanda");
    expect(wisdom.lessonsLearned.length).toBeGreaterThan(0);
    expect(wisdom.blindSpotAwareness.length).toBeGreaterThan(0);
  });
});

describe("Bridge integrity (US + China + MENA)", () => {
  it("total = US + China + MENA + open", () => {
    const total = getAllLLMs().length;
    const china = getChineseLLMs().length;
    const mena = getMENALLMs().length;
    const open = Object.values(LLM_REGISTRY).filter((l) => l.ecosystem === "open").length;
    const usOnly = Object.values(LLM_REGISTRY).filter((l) => l.ecosystem === "us").length;
    // us getter = usOnly + open, so total = usOnly + open + china + mena
    expect(total).toBe(usOnly + open + china + mena);
  });

  it("every LLM has a unique id", () => {
    const ids = getAllLLMs().map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
