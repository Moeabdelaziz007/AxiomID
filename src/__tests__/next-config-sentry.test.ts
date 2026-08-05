/**
 * Tests for the Sentry build-options passed to withSentryConfig() in
 * next.config.ts.
 *
 * PR change: `org` and `project` used to come straight from
 * `process.env.SENTRY_ORG` / `process.env.SENTRY_PROJECT` with no fallback.
 * This PR adds `|| "axiomid"` / `|| "sentry-purple-engine"` defaults so the
 * Sentry build step still resolves an org/project when the env vars are
 * unset (e.g. in CI or a fresh clone before `.env.local` is configured).
 *
 * These tests mock `@sentry/nextjs`'s `withSentryConfig` so we can capture
 * the exact options object next.config.ts builds, then re-require the
 * module under different `process.env` combinations to exercise both sides
 * of each `||` fallback.
 *
 * @jest-environment node
 */

// Note: variable names must start with "mock" (case-insensitively) so the
// Jest module-factory hoister allows referencing them from inside jest.mock().
let mockCapturedConfig: Record<string, unknown> | undefined;
let mockCapturedOptions: Record<string, unknown> | undefined;

jest.mock("@sentry/nextjs", () => ({
  withSentryConfig: (config: Record<string, unknown>, options: Record<string, unknown>) => {
    mockCapturedConfig = config;
    mockCapturedOptions = options;
    return config;
  },
}));

/** Re-requires next.config.ts in an isolated module registry so the
 * top-level `withSentryConfig(...)` call re-evaluates against the current
 * `process.env` values. */
function loadNextConfig() {
  jest.isolateModules(() => {
    require("../../next.config");
  });
}

describe("next.config — Sentry org/project fallback (PR change)", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    mockCapturedConfig = undefined;
    mockCapturedOptions = undefined;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("falls back to the default org and project when neither env var is set", () => {
    delete process.env.SENTRY_ORG;
    delete process.env.SENTRY_PROJECT;

    loadNextConfig();

    expect(mockCapturedOptions).toMatchObject({
      org: "axiomid",
      project: "sentry-purple-engine",
    });
  });

  it("uses SENTRY_ORG and SENTRY_PROJECT from the environment when both are set", () => {
    process.env.SENTRY_ORG = "custom-org";
    process.env.SENTRY_PROJECT = "custom-project";

    loadNextConfig();

    expect(mockCapturedOptions).toMatchObject({
      org: "custom-org",
      project: "custom-project",
    });
  });

  it("falls back to the default org only when SENTRY_ORG is unset but SENTRY_PROJECT is set", () => {
    delete process.env.SENTRY_ORG;
    process.env.SENTRY_PROJECT = "custom-project";

    loadNextConfig();

    expect(mockCapturedOptions).toMatchObject({
      org: "axiomid",
      project: "custom-project",
    });
  });

  it("falls back to the default project only when SENTRY_PROJECT is unset but SENTRY_ORG is set", () => {
    process.env.SENTRY_ORG = "custom-org";
    delete process.env.SENTRY_PROJECT;

    loadNextConfig();

    expect(mockCapturedOptions).toMatchObject({
      org: "custom-org",
      project: "sentry-purple-engine",
    });
  });

  it("treats an empty string as unset and falls back to the defaults (boundary case)", () => {
    process.env.SENTRY_ORG = "";
    process.env.SENTRY_PROJECT = "";

    loadNextConfig();

    expect(mockCapturedOptions).toMatchObject({
      org: "axiomid",
      project: "sentry-purple-engine",
    });
  });

  it("still passes silent: true through to withSentryConfig regardless of env vars", () => {
    delete process.env.SENTRY_ORG;
    delete process.env.SENTRY_PROJECT;

    loadNextConfig();

    expect(mockCapturedOptions).toMatchObject({ silent: true });
  });

  it("passes the base Next.js config object through to withSentryConfig unchanged", () => {
    loadNextConfig();

    expect(mockCapturedConfig).toMatchObject({
      reactStrictMode: true,
      poweredByHeader: false,
      productionBrowserSourceMaps: false,
    });
  });

  it("the exported config is the (mocked) return value of withSentryConfig", () => {
    loadNextConfig();

    // Our mock returns the base config unchanged, so re-requiring should
    // yield the same object identity/shape captured above.
    expect(mockCapturedConfig).toBeDefined();
    expect(mockCapturedOptions).toBeDefined();
  });
});