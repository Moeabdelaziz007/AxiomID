/**
 * Structural tests for vercel.json.
 *
 * These tests validate that the Vercel deployment configuration contains the
 * correct security headers, caching directives, and framework settings
 * introduced in this PR. They guard against accidental removal or typos in a
 * file that is easy to break silently.
 */

import vercelConfig from "../../vercel.json";

type HeaderEntry = { key: string; value: string };
type HeaderRule = { source: string; headers: HeaderEntry[] };

/** Find the header value for a given key within a rule's headers array. */
function findHeader(rule: HeaderRule, key: string): string | undefined {
  return rule.headers.find((h) => h.key === key)?.value;
}

/** Find a header rule by its source pattern. */
function findRule(source: string): HeaderRule | undefined {
  return (vercelConfig.headers as HeaderRule[]).find(
    (r) => r.source === source,
  );
}

describe("vercel.json — top-level settings", () => {
  it("uses Vercel config version 2", () => {
    expect(vercelConfig.version).toBe(2);
  });

  it("targets the iad1 region only", () => {
    expect(vercelConfig.regions).toEqual(["iad1"]);
  });

  it("specifies nextjs framework", () => {
    expect(vercelConfig.framework).toBe("nextjs");
  });

  it("builds with prisma migrate + npm run build", () => {
    expect(vercelConfig.buildCommand).toContain("npm run build");
  });

  it("installs with npm", () => {
    expect(vercelConfig.installCommand).toContain("npm install");
  });

  it("outputs to .next directory", () => {
    expect(vercelConfig.outputDirectory).toBe(".next");
  });

  it("enables cleanUrls", () => {
    expect(vercelConfig.cleanUrls).toBe(true);
  });

  it("disables trailingSlash", () => {
    expect(vercelConfig.trailingSlash).toBe(false);
  });

  it("enables GitHub integration", () => {
    expect(vercelConfig.github.enabled).toBe(true);
  });

  it("does not silence GitHub comments", () => {
    expect(vercelConfig.github.silent).toBe(false);
  });
});

describe("vercel.json — global security headers on /(.*)", () => {
  let globalRule: HeaderRule;

  beforeAll(() => {
    const rule = findRule("/(.*)");
    if (!rule) throw new Error("Missing global header rule for /(.*) in vercel.json");
    globalRule = rule;
  });

  it("sets X-Content-Type-Options to nosniff", () => {
    expect(findHeader(globalRule, "X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets Content-Security-Policy with frame-ancestors for Pi sandbox and production domains", () => {
    const csp = findHeader(globalRule, "Content-Security-Policy");
    expect(csp).toContain("frame-ancestors");
    expect(csp).toContain("sandbox.minepi.com");
    expect(csp).toContain("app-cdn.minepi.com");
    expect(csp).toContain("*.minepi.com");
  });

  it("sets Referrer-Policy to strict-origin-when-cross-origin", () => {
    expect(findHeader(globalRule, "Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("sets Permissions-Policy restricting camera, microphone and geolocation", () => {
    const policy = findHeader(globalRule, "Permissions-Policy");
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("geolocation=()");
  });

  it("sets Strict-Transport-Security with long max-age, includeSubDomains and preload", () => {
    const hsts = findHeader(globalRule, "Strict-Transport-Security");
    expect(hsts).toContain("max-age=63072000");
    expect(hsts).toContain("includeSubDomains");
    expect(hsts).toContain("preload");
  });

  it("does NOT expose X-XSS-Protection (deprecated header removed in PR)", () => {
    expect(findHeader(globalRule, "X-XSS-Protection")).toBeUndefined();
  });
});

describe("vercel.json — /validation-key.txt headers", () => {
  let rule: HeaderRule;

  beforeAll(() => {
    const found = findRule("/validation-key.txt");
    if (!found)
      throw new Error("Missing header rule for /validation-key.txt in vercel.json");
    rule = found;
  });

  it("forces Content-Type to text/plain", () => {
    const contentType = findHeader(rule, "Content-Type");
    expect(contentType).toMatch(/^text\/plain/);
  });

  it("Content-Type includes charset=utf-8", () => {
    expect(findHeader(rule, "Content-Type")).toContain("charset=utf-8");
  });

  it("sets a short Cache-Control so Pi can re-validate quickly", () => {
    const cc = findHeader(rule, "Cache-Control");
    expect(cc).toContain("public");
    expect(cc).toContain("max-age=300");
    expect(cc).toContain("must-revalidate");
  });
});

describe("vercel.json — static asset caching rules", () => {
  it("/_next/static/* gets long-lived immutable cache", () => {
    const rule = findRule("/_next/static/(.*)");
    expect(rule).toBeDefined();
    const cc = findHeader(rule!, "Cache-Control");
    expect(cc).toContain("public");
    expect(cc).toContain("max-age=31536000");
    expect(cc).toContain("immutable");
  });

  it("common static asset file extensions get long-lived immutable cache", () => {
    const rule = (vercelConfig.headers as HeaderRule[]).find((r) =>
      r.source.includes("css|js|png"),
    );
    expect(rule).toBeDefined();
    const cc = findHeader(rule!, "Cache-Control");
    expect(cc).toContain("public");
    expect(cc).toContain("max-age=31536000");
    expect(cc).toContain("immutable");
  });
});

describe("vercel.json — removed legacy config (regression)", () => {
  it("does not include a top-level env block (moved to Vercel dashboard)", () => {
    expect((vercelConfig as Record<string, unknown>).env).toBeUndefined();
  });

  it("does not include a functions block (removed legacy API routing)", () => {
    expect((vercelConfig as Record<string, unknown>).functions).toBeUndefined();
  });

  it("does not include an alias block (domain managed via Vercel dashboard)", () => {
    expect((vercelConfig as Record<string, unknown>).alias).toBeUndefined();
  });
});