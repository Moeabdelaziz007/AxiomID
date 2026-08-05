/**
 * @jest-environment node
 *
 * Structural tests for .github/workflows/label.yml.
 *
 * This workflow triages pull requests and applies labels based on the paths
 * modified, using actions/labeler@v6. It runs on `pull_request_target`,
 * which executes with access to repository secrets even for PRs opened from
 * forks — so its permissions and trusted-action version must stay tightly
 * scoped. These tests lock in that configuration and guard against silent,
 * security-relevant regressions (e.g. an over-broad permissions block, an
 * unpinned action reference, or a hardcoded token) in a YAML file that has
 * no compile-time validation.
 *
 * No YAML parsing library is available in this project, so the file is
 * validated with targeted line-based parsing, mirroring the approach used
 * for other unparsed config files (see codeowners.test.ts).
 */

import fs from "fs";
import path from "path";

const WORKFLOW_PATH = path.join(
  __dirname,
  "../../.github/workflows/label.yml",
);

let content = "";
let lines: string[] = [];

beforeAll(() => {
  if (!fs.existsSync(WORKFLOW_PATH)) {
    return;
  }
  content = fs.readFileSync(WORKFLOW_PATH, "utf-8");
  lines = content.split("\n");
});

/** Return the index of the first line matching the given predicate, or -1. */
function findLineIndex(predicate: (line: string) => boolean): number {
  return lines.findIndex(predicate);
}

// ---------------------------------------------------------------------------
// File existence and basic structure
// ---------------------------------------------------------------------------

describe("label.yml — file structure", () => {
  it("exists at .github/workflows/label.yml", () => {
    expect(fs.existsSync(WORKFLOW_PATH)).toBe(true);
  });

  it("is non-empty", () => {
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it("contains no tab characters (YAML requires spaces for indentation)", () => {
    expect(content).not.toMatch(/\t/);
  });

  it("documents the required .github/labeler.yml companion file", () => {
    expect(content).toContain(".github/labeler.yml");
  });
});

// ---------------------------------------------------------------------------
// Workflow name and trigger
// ---------------------------------------------------------------------------

describe("label.yml — name and trigger", () => {
  it("names the workflow 'Labeler'", () => {
    expect(content).toMatch(/^name:\s*Labeler\s*$/m);
  });

  it("triggers on pull_request_target", () => {
    expect(content).toMatch(/^on:\s*\[pull_request_target\]\s*$/m);
  });

  it("does NOT trigger on plain pull_request (would lack secrets access needed by labeler)", () => {
    expect(content).not.toMatch(/^on:\s*\[pull_request\]\s*$/m);
    expect(content).not.toMatch(/^\s*-\s*pull_request\s*$/m);
  });

  it("does not trigger on push (labeler is PR-scoped only)", () => {
    expect(content).not.toMatch(/^\s*-?\s*push:?\s*$/m);
  });
});

// ---------------------------------------------------------------------------
// Job configuration
// ---------------------------------------------------------------------------

describe("label.yml — job configuration", () => {
  it("defines a 'label' job", () => {
    expect(content).toMatch(/^\s*label:\s*$/m);
  });

  it("runs the label job on ubuntu-latest", () => {
    expect(content).toMatch(/^\s*runs-on:\s*ubuntu-latest\s*$/m);
  });

  it("defines exactly one job", () => {
    const jobsIndex = findLineIndex((l) => /^jobs:\s*$/.test(l));
    expect(jobsIndex).toBeGreaterThanOrEqual(0);
    // Top-level job keys are indented exactly two spaces under `jobs:`.
    const jobKeyLines = lines
      .slice(jobsIndex + 1)
      .filter((l) => /^ {2}\S.*:\s*$/.test(l));
    expect(jobKeyLines).toHaveLength(1);
    expect(jobKeyLines[0].trim()).toBe("label:");
  });
});

// ---------------------------------------------------------------------------
// Permissions — least privilege
// ---------------------------------------------------------------------------

describe("label.yml — permissions (least privilege)", () => {
  it("grants read-only access to contents", () => {
    expect(content).toMatch(/^\s*contents:\s*read\s*$/m);
  });

  it("grants write access to pull-requests (required to apply labels)", () => {
    expect(content).toMatch(/^\s*pull-requests:\s*write\s*$/m);
  });

  it("does not grant write access to contents", () => {
    expect(content).not.toMatch(/^\s*contents:\s*write\s*$/m);
  });

  it("does not request any additional, unused permission scopes", () => {
    const permissionsIndex = findLineIndex((l) => /^\s*permissions:\s*$/.test(l));
    expect(permissionsIndex).toBeGreaterThanOrEqual(0);
    const permissionLines = lines
      .slice(permissionsIndex + 1)
      .filter((l) => /^\s{6}[a-z-]+:\s*(read|write|none)\s*$/.test(l));
    const scopes = permissionLines.map((l) => l.trim().split(":")[0]);
    expect(scopes.sort()).toEqual(["contents", "issues", "pull-requests"]);
  });
});

// ---------------------------------------------------------------------------
// Steps — labeler action usage
// ---------------------------------------------------------------------------

describe("label.yml — labeler step", () => {
  it("uses the actions/labeler action", () => {
    expect(content).toMatch(/uses:\s*actions\/labeler@v7/);
  });

  it("pins the labeler action to a specific major version (not @main or @latest)", () => {
    const usesLine = lines.find((l) => l.includes("uses:") && l.includes("actions/labeler"));
    expect(usesLine).toBeDefined();
    expect(usesLine).not.toMatch(/@(main|master|latest)\b/);
    expect(usesLine).toMatch(/@v\d+$/);
  });

  it("passes repo-token via the GITHUB_TOKEN secret, not a hardcoded value", () => {
    expect(content).toMatch(
      /repo-token:\s*"\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}"/,
    );
  });

  it("defines exactly one step", () => {
    const stepUsesLines = lines.filter((l) => /^\s*-\s*uses:/.test(l));
    expect(stepUsesLines).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Regression: overall shape stays intact
// ---------------------------------------------------------------------------

describe("label.yml — regression: key sections appear in expected order", () => {
  it("orders sections as name -> on -> jobs -> permissions -> steps", () => {
    const nameIdx = findLineIndex((l) => /^name:/.test(l));
    const onIdx = findLineIndex((l) => /^on:/.test(l));
    const jobsIdx = findLineIndex((l) => /^jobs:\s*$/.test(l));
    const permissionsIdx = findLineIndex((l) => /^\s*permissions:\s*$/.test(l));
    const stepsIdx = findLineIndex((l) => /^\s*steps:\s*$/.test(l));

    expect(nameIdx).toBeGreaterThanOrEqual(0);
    expect(onIdx).toBeGreaterThan(nameIdx);
    expect(jobsIdx).toBeGreaterThan(onIdx);
    expect(permissionsIdx).toBeGreaterThan(jobsIdx);
    expect(stepsIdx).toBeGreaterThan(permissionsIdx);
  });
});