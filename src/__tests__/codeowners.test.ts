/**
 * @jest-environment node
 *
 * Structural tests for .github/CODEOWNERS.
 *
 * These tests lock in the ownership rules added in this PR — specifically the
 * backend auth path and the "Critical trust and identity paths" block
 * (/src/lib/trust.ts, /src/lib/soul/, /packages/crypto/). They guard against
 * accidental removal of critical ownership assignments in a file that has no
 * compile-time validation.
 */

import fs from "fs";
import path from "path";

const CODEOWNERS_PATH = path.join(__dirname, "../../.github/CODEOWNERS");
const OWNER = "@Moeabdelaziz007";

/** Parse CODEOWNERS into an array of { pattern, owners } rule objects. */
function parseRules(content: string): Array<{ pattern: string; owners: string[] }> {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      const tokens = line.split(/\s+/);
      return { pattern: tokens[0], owners: tokens.slice(1) };
    });
}

/** Return the rule for a given path pattern, or undefined if absent. */
function findRule(
  rules: Array<{ pattern: string; owners: string[] }>,
  pattern: string,
): { pattern: string; owners: string[] } | undefined {
  return rules.find((r) => r.pattern === pattern);
}

let content = "";
let rules: Array<{ pattern: string; owners: string[] }> = [];

beforeAll(() => {
  if (!fs.existsSync(CODEOWNERS_PATH)) {
    return;
  }
  content = fs.readFileSync(CODEOWNERS_PATH, "utf-8");
  rules = parseRules(content);
});

// ---------------------------------------------------------------------------
// File existence and basic structure
// ---------------------------------------------------------------------------

describe("CODEOWNERS — file structure", () => {
  it("exists at .github/CODEOWNERS", () => {
    expect(fs.existsSync(CODEOWNERS_PATH)).toBe(true);
  });

  it("is non-empty", () => {
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it("contains at least one ownership rule", () => {
    expect(rules.length).toBeGreaterThan(0);
  });

  it("every rule line has at least one owner", () => {
    rules.forEach(({ pattern, owners }) => {
      expect(owners.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("every owner token starts with @ (GitHub handle)", () => {
    rules.forEach(({ owners }) => {
      owners.forEach((owner) => {
        expect(owner).toMatch(/^@/);
      });
    });
  });

  it("contains the section comment for critical trust and identity paths", () => {
    expect(content).toContain("# Critical trust and identity paths");
  });
});

// ---------------------------------------------------------------------------
// PR addition: backend auth path
// ---------------------------------------------------------------------------

describe("CODEOWNERS — /backend/src/lib/auth.ts (added in PR)", () => {
  it("has an ownership rule for /backend/src/lib/auth.ts", () => {
    const rule = findRule(rules, "/backend/src/lib/auth.ts");
    expect(rule).toBeDefined();
  });

  it("assigns /backend/src/lib/auth.ts to @Moeabdelaziz007", () => {
    const rule = findRule(rules, "/backend/src/lib/auth.ts");
    expect(rule!.owners).toContain(OWNER);
  });

  it("has exactly one owner for /backend/src/lib/auth.ts", () => {
    const rule = findRule(rules, "/backend/src/lib/auth.ts");
    expect(rule!.owners).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// PR addition: trust path
// ---------------------------------------------------------------------------

describe("CODEOWNERS — /src/lib/trust.ts (added in PR)", () => {
  it("has an ownership rule for /src/lib/trust.ts", () => {
    const rule = findRule(rules, "/src/lib/trust.ts");
    expect(rule).toBeDefined();
  });

  it("assigns /src/lib/trust.ts to @Moeabdelaziz007", () => {
    const rule = findRule(rules, "/src/lib/trust.ts");
    expect(rule!.owners).toContain(OWNER);
  });

  it("has exactly one owner for /src/lib/trust.ts", () => {
    const rule = findRule(rules, "/src/lib/trust.ts");
    expect(rule!.owners).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// PR addition: soul directory
// ---------------------------------------------------------------------------

describe("CODEOWNERS — /src/lib/soul/ (added in PR)", () => {
  it("has an ownership rule for /src/lib/soul/", () => {
    const rule = findRule(rules, "/src/lib/soul/");
    expect(rule).toBeDefined();
  });

  it("assigns /src/lib/soul/ to @Moeabdelaziz007", () => {
    const rule = findRule(rules, "/src/lib/soul/");
    expect(rule!.owners).toContain(OWNER);
  });

  it("has exactly one owner for /src/lib/soul/", () => {
    const rule = findRule(rules, "/src/lib/soul/");
    expect(rule!.owners).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// PR addition: crypto package
// ---------------------------------------------------------------------------

describe("CODEOWNERS — /packages/crypto/ (added in PR)", () => {
  it("has an ownership rule for /packages/crypto/", () => {
    const rule = findRule(rules, "/packages/crypto/");
    expect(rule).toBeDefined();
  });

  it("assigns /packages/crypto/ to @Moeabdelaziz007", () => {
    const rule = findRule(rules, "/packages/crypto/");
    expect(rule!.owners).toContain(OWNER);
  });

  it("has exactly one owner for /packages/crypto/", () => {
    const rule = findRule(rules, "/packages/crypto/");
    expect(rule!.owners).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Regression: all four new paths are present together
// ---------------------------------------------------------------------------

describe("CODEOWNERS — regression: all PR-added rules coexist", () => {
  const newPaths = [
    "/backend/src/lib/auth.ts",
    "/src/lib/trust.ts",
    "/src/lib/soul/",
    "/packages/crypto/",
  ];

  it.each(newPaths)("rule for %s is present", (pattern) => {
    expect(findRule(rules, pattern)).toBeDefined();
  });

  it("all four new rules appear in the file exactly once", () => {
    newPaths.forEach((pattern) => {
      const occurrences = rules.filter((r) => r.pattern === pattern);
      expect(occurrences).toHaveLength(1);
    });
  });

  it("all four new rules are assigned to @Moeabdelaziz007", () => {
    newPaths.forEach((pattern) => {
      const rule = findRule(rules, pattern);
      expect(rule!.owners).toContain(OWNER);
    });
  });
});

// ---------------------------------------------------------------------------
// Ordering: new paths appear under the correct section comment
// ---------------------------------------------------------------------------

describe("CODEOWNERS — section ordering", () => {
  it("backend auth rule appears before the critical trust section", () => {
    const backendAuthLine = content
      .split("\n")
      .findIndex((l) => l.includes("/backend/src/lib/auth.ts"));
    const criticalSectionLine = content
      .split("\n")
      .findIndex((l) => l.includes("# Critical trust and identity paths"));
    expect(backendAuthLine).toBeLessThan(criticalSectionLine);
  });

  it("trust.ts, soul/, and packages/crypto/ all appear after the critical trust section header", () => {
    const lines = content.split("\n");
    const criticalSectionLine = lines.findIndex((l) =>
      l.includes("# Critical trust and identity paths"),
    );
    const trustLine = lines.findIndex((l) => l.includes("/src/lib/trust.ts"));
    const soulLine = lines.findIndex((l) => l.includes("/src/lib/soul/"));
    const cryptoLine = lines.findIndex((l) => l.includes("/packages/crypto/"));
    expect(trustLine).toBeGreaterThan(criticalSectionLine);
    expect(soulLine).toBeGreaterThan(criticalSectionLine);
    expect(cryptoLine).toBeGreaterThan(criticalSectionLine);
  });
});