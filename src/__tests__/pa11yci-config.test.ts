/**
 * Structural tests for .pa11yci.json and the related package.json changes.
 *
 * PR change: added a new pa11y-ci accessibility testing configuration file
 * (.pa11yci.json), a new "a11y" npm script to run it, and the
 * "react-error-boundary" dependency used by the new ErrorBoundary/error.tsx
 * pages introduced in this PR.
 */

import pa11yConfig from "../../.pa11yci.json";
import packageJson from "../../package.json";

describe(".pa11yci.json — structure", () => {
  it("defines a non-empty list of URLs to audit", () => {
    expect(Array.isArray(pa11yConfig.urls)).toBe(true);
    expect(pa11yConfig.urls.length).toBeGreaterThan(0);
  });

  it("includes the root and dashboard URLs", () => {
    expect(pa11yConfig.urls).toContain("http://localhost:3000");
    expect(pa11yConfig.urls).toContain("http://localhost:3000/dashboard");
  });

  it("includes the marketplace and settings dashboard sub-routes", () => {
    expect(pa11yConfig.urls).toContain("http://localhost:3000/dashboard/marketplace");
    expect(pa11yConfig.urls).toContain("http://localhost:3000/dashboard/settings");
  });

  it("every URL is a well-formed http(s) URL string", () => {
    for (const url of pa11yConfig.urls) {
      expect(typeof url).toBe("string");
      expect(url).toMatch(/^https?:\/\//);
    }
  });

  it("sets the WCAG2AA accessibility standard as the default", () => {
    expect(pa11yConfig.defaults?.standard).toBe("WCAG2AA");
  });

  it("configures positive timeout and wait durations", () => {
    expect(pa11yConfig.defaults?.timeout).toBeGreaterThan(0);
    expect(pa11yConfig.defaults?.wait).toBeGreaterThan(0);
  });
});

describe("package.json — a11y script (PR change)", () => {
  it("defines an 'a11y' script", () => {
    expect(packageJson.scripts).toHaveProperty("a11y");
  });

  it("the 'a11y' script invokes pa11y-ci against .pa11yci.json", () => {
    expect(packageJson.scripts.a11y).toContain("pa11y-ci");
    expect(packageJson.scripts.a11y).toContain(".pa11yci.json");
  });
});

describe("package.json — react-error-boundary dependency (PR change)", () => {
  it("declares react-error-boundary as a runtime dependency", () => {
    expect(packageJson.dependencies).toHaveProperty("react-error-boundary");
  });

  it("react-error-boundary version is a valid non-empty semver range", () => {
    expect(typeof packageJson.dependencies["react-error-boundary"]).toBe("string");
    expect(packageJson.dependencies["react-error-boundary"].length).toBeGreaterThan(0);
  });
});

describe("package.json — regression: existing scripts untouched", () => {
  it("still defines the standard test script", () => {
    expect(packageJson.scripts.test).toContain("jest");
  });

  it("still defines the build script", () => {
    expect(packageJson.scripts.build).toContain("next build");
  });
});