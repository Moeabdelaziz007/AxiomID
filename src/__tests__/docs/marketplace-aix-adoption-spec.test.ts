/**
 * Content tests for docs/superpowers/specs/marketplace-aix-adoption.md
 *
 * PR change: renamed the SOUL Protocol terminology used throughout the spec —
 * the section header "SOUL Alignment" became "Principle Alignment", and the
 * six principle display names were renamed from their original Arabic
 * transliterations to their English meanings: Vigilance, Correction, Ledger,
 * Triad, Septet, Compounding.
 */

import fs from "fs";
import path from "path";

const specPath = path.join(__dirname, "..", "..", "..", "docs", "superpowers", "specs", "marketplace-aix-adoption.md");
const specContent = fs.readFileSync(specPath, "utf-8");

describe("marketplace-aix-adoption.md — Principle Alignment renaming (PR change)", () => {
  it("uses the 'Principle Alignment' section header in the skill template", () => {
    expect(specContent).toContain("Principle Alignment");
  });

  it("lists all six renamed principle display names together", () => {
    expect(specContent).toContain("Vigilance / Correction / Ledger / Triad / Septet / Compounding");
  });

  it("still contains the underlying SOUL_PRINCIPLES enum keys (unrenamed identifiers)", () => {
    for (const key of ["MURAQABAH", "TAWBAH", "TRUSTCHAIN", "TASBIH", "SABIYYAH", "BARAKAH"]) {
      expect(specContent).toContain(key);
    }
  });

  it("maps each enum key to its renamed English display name in the SOUL_PRINCIPLES definition", () => {
    expect(specContent).toMatch(/MURAQABAH:\s*{\s*en:\s*"Vigilance"/);
    expect(specContent).toMatch(/TAWBAH:\s*{\s*en:\s*"Correction"/);
    expect(specContent).toMatch(/TRUSTCHAIN:\s*{\s*en:\s*"Ledger"/);
    expect(specContent).toMatch(/TASBIH:\s*{\s*en:\s*"Triad"/);
    expect(specContent).toMatch(/SABIYYAH:\s*{\s*en:\s*"Septet"/);
    expect(specContent).toMatch(/BARAKAH:\s*{\s*en:\s*"Compounding"/);
  });
});

describe("marketplace-aix-adoption.md — document structure (regression)", () => {
  it("still documents all six phases in the scope table", () => {
    for (let phase = 1; phase <= 6; phase++) {
      expect(specContent).toContain(`| ${phase} |`);
    }
  });

  it("still contains the Phase 3 SOUL Protocol Alignment section heading", () => {
    expect(specContent).toContain("## Phase 3: SOUL Protocol Alignment");
  });

  it("is non-empty and starts with the expected document title", () => {
    expect(specContent.length).toBeGreaterThan(0);
    expect(specContent.trimStart().startsWith("# Marketplace AIX Adoption")).toBe(true);
  });
});