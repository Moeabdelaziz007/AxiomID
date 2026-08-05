/**
 * Structural tests for the Sentry integration added in this PR:
 *   - package.json: new "@sentry/nextjs" runtime dependency
 *   - .env.example: new Sentry env var placeholders
 *
 * These guard against the dependency accidentally being dropped, moved to
 * devDependencies only, or left with a malformed semver range, and against
 * secrets being accidentally checked into .env.example.
 *
 * @jest-environment node
 */

import fs from "fs";
import path from "path";
import packageJson from "../../package.json";

const ENV_EXAMPLE_PATH = path.join(__dirname, "../../.env.example");
const NEXT_CONFIG_PATH = path.join(__dirname, "../../next.config.ts");

let envExampleContent = "";
let nextConfigContent = "";

beforeAll(() => {
  envExampleContent = fs.readFileSync(ENV_EXAMPLE_PATH, "utf-8");
  nextConfigContent = fs.readFileSync(NEXT_CONFIG_PATH, "utf-8");
});

describe("package.json — @sentry/nextjs runtime dependency (PR change)", () => {
  it("declares @sentry/nextjs as a runtime dependency", () => {
    expect(packageJson.dependencies).toHaveProperty("@sentry/nextjs");
  });

  it("uses a caret semver range for @sentry/nextjs", () => {
    expect(packageJson.dependencies["@sentry/nextjs"]).toMatch(/^\^\d+\.\d+\.\d+$/);
  });

  it("pins the @sentry/nextjs runtime dependency to a 10.x major version", () => {
    expect(packageJson.dependencies["@sentry/nextjs"]).toMatch(/^\^10\./);
  });

  it("does not accidentally declare @sentry/nextjs only in devDependencies (it is imported by runtime config files)", () => {
    // next.config.ts, sentry.server.config.ts, sentry.client.config.ts and
    // sentry.edge.config.ts all `import ... from "@sentry/nextjs"` and ship
    // in the production build, so it must be a real (non-dev) dependency.
    expect(packageJson.dependencies).toHaveProperty("@sentry/nextjs");
    expect(typeof packageJson.dependencies["@sentry/nextjs"]).toBe("string");
    expect(packageJson.dependencies["@sentry/nextjs"].length).toBeGreaterThan(0);
  });

  it("regression: preexisting dependencies (e.g. zod) are still present after the new entry was appended", () => {
    expect(packageJson.dependencies).toHaveProperty("zod");
    expect(packageJson.dependencies.zod).toMatch(/^\^4\./);
  });

  it("regression: the standard test script is unchanged", () => {
    expect(packageJson.scripts.test).toContain("jest");
  });
});

describe(".env.example — Sentry environment variable placeholders (PR change)", () => {
  it("documents a Sentry section header", () => {
    expect(envExampleContent).toContain("Sentry");
  });

  it("sets SENTRY_ORG to the default org used by next.config.ts", () => {
    expect(envExampleContent).toMatch(/^SENTRY_ORG=axiomid$/m);
  });

  it("sets SENTRY_PROJECT to the default project used by next.config.ts", () => {
    expect(envExampleContent).toMatch(/^SENTRY_PROJECT=sentry-purple-engine$/m);
  });

  it("declares NEXT_PUBLIC_SENTRY_DSN as a key with no value committed", () => {
    expect(envExampleContent).toMatch(/^NEXT_PUBLIC_SENTRY_DSN=$/m);
  });

  it("declares SENTRY_AUTH_TOKEN as a key with no value committed", () => {
    expect(envExampleContent).toMatch(/^SENTRY_AUTH_TOKEN=$/m);
  });

  it("negative case: does not leak a real-looking DSN or auth token value", () => {
    // A real Sentry DSN looks like https://<key>@o<org>.ingest.sentry.io/<project>
    expect(envExampleContent).not.toMatch(/NEXT_PUBLIC_SENTRY_DSN=https?:\/\//);
    // Sentry auth tokens are long opaque strings (sntrys_... or similar); make
    // sure nothing but an empty value follows the key.
    expect(envExampleContent).not.toMatch(/SENTRY_AUTH_TOKEN=\S+/);
  });

  it("places the Sentry section before the Database section", () => {
    const sentryIdx = envExampleContent.indexOf("SENTRY_ORG=");
    const databaseIdx = envExampleContent.indexOf("DATABASE_URL=");
    expect(sentryIdx).toBeGreaterThanOrEqual(0);
    expect(databaseIdx).toBeGreaterThan(sentryIdx);
  });

  it("all four Sentry lines are well-formed KEY=VALUE (or KEY=) entries", () => {
    const sentryLines = [
      "SENTRY_ORG=axiomid",
      "SENTRY_PROJECT=sentry-purple-engine",
      "NEXT_PUBLIC_SENTRY_DSN=",
      "SENTRY_AUTH_TOKEN=",
    ];
    for (const line of sentryLines) {
      expect(envExampleContent).toContain(line);
      const found = envExampleContent
        .split("\n")
        .find((l) => l.trim() === line);
      expect(found).toBe(line);
    }
  });
});

describe("Sentry org/project defaults stay in sync across next.config.ts and .env.example (regression)", () => {
  it("the fallback org literal in next.config.ts matches the SENTRY_ORG example value", () => {
    const envOrgMatch = envExampleContent.match(/^SENTRY_ORG=(.+)$/m);
    expect(envOrgMatch).not.toBeNull();
    const exampleOrg = envOrgMatch![1];

    expect(nextConfigContent).toContain(`|| "${exampleOrg}"`);
  });

  it("the fallback project literal in next.config.ts matches the SENTRY_PROJECT example value", () => {
    const envProjectMatch = envExampleContent.match(/^SENTRY_PROJECT=(.+)$/m);
    expect(envProjectMatch).not.toBeNull();
    const exampleProject = envProjectMatch![1];

    expect(nextConfigContent).toContain(`|| "${exampleProject}"`);
  });
});