/**
 * @jest-environment node
 *
 * Structural tests for SECURITY.md.
 *
 * SECURITY.md was introduced from scratch in this PR. These tests validate that
 * the file contains the required sections, accurate contact details, correct
 * severity/timeline values, complete scope tables, and all mandated contributor
 * best practices. They guard against accidental content removal or edits that
 * would mislead security reporters.
 */

import fs from "fs";
import path from "path";

const SECURITY_MD_PATH = path.join(__dirname, "../../SECURITY.md");

let content: string;

let content = "";

beforeAll(() => {
  if (!fs.existsSync(SECURITY_MD_PATH)) {
    return;
  }
  content = fs.readFileSync(SECURITY_MD_PATH, "utf-8");
});

// ---------------------------------------------------------------------------
// File existence
// ---------------------------------------------------------------------------

describe("SECURITY.md — file existence", () => {
  it("exists at the repository root", () => {
    expect(fs.existsSync(SECURITY_MD_PATH)).toBe(true);
  });

  it("is non-empty", () => {
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it("starts with a top-level heading", () => {
    expect(content.trimStart()).toMatch(/^# /);
  });
});

// ---------------------------------------------------------------------------
// Required sections
// ---------------------------------------------------------------------------

describe("SECURITY.md — required sections", () => {
  const requiredSections = [
    "## Supported Versions",
    "## Reporting a Vulnerability",
    "## What to Include in Your Report",
    "## Scope",
    "## Our Commitment",
    "## Severity Classification",
    "## Security Best Practices for Contributors",
  ];

  it.each(requiredSections)("contains section '%s'", (section) => {
    expect(content).toContain(section);
  });

  it("contains exactly 7 H2 sections", () => {
    const h2Headings = content.match(/^## .+/gm) ?? [];
    expect(h2Headings).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// Supported versions
// ---------------------------------------------------------------------------

describe("SECURITY.md — supported versions", () => {
  it("marks 0.1.x as actively supported", () => {
    expect(content).toContain("0.1.x");
    expect(content).toMatch(/0\.1\.x.*Active support/s);
  });

  it("marks versions below 0.1.0 as unsupported", () => {
    expect(content).toMatch(/< 0\.1\.0.*No longer supported/s);
  });
});

// ---------------------------------------------------------------------------
// Vulnerability reporting contact details
// ---------------------------------------------------------------------------

describe("SECURITY.md — reporting contact details", () => {
  it("provides the security contact email address", () => {
    expect(content).toContain("security@axiomid.app");
  });

  it("specifies a 48-hour initial response commitment", () => {
    expect(content).toMatch(/48 hours/i);
  });

  it("directs reporters to GitHub Security Advisories as the preferred channel", () => {
    expect(content).toContain("Security Advisories");
  });

  it("explicitly warns against reporting via public GitHub Issues", () => {
    expect(content).toContain("do NOT report security vulnerabilities via public GitHub Issues");
  });

  it("mentions PGP encryption for sensitive reports", () => {
    expect(content).toMatch(/PGP/i);
  });
});

// ---------------------------------------------------------------------------
// Report contents checklist
// ---------------------------------------------------------------------------

describe("SECURITY.md — what to include in a report", () => {
  const requiredReportFields = [
    "Description",
    "Impact",
    "Steps to reproduce",
    "Affected component",
    "Suggested fix",
  ];

  it.each(requiredReportFields)("lists '%s' as a required report field", (field) => {
    expect(content).toContain(field);
  });
});

// ---------------------------------------------------------------------------
// Scope — in scope
// ---------------------------------------------------------------------------

describe("SECURITY.md — in-scope components", () => {
  const inScopeComponents = [
    "Trust Score Engine",
    "DID / Credential System",
    "Soul System",
    "API Routes",
    "Cloudflare Workers Backend",
    "Agent Passport",
    "Pi Network Auth",
    "Secret Scanning",
  ];

  it.each(inScopeComponents)("lists '%s' as in scope", (component) => {
    expect(content).toContain(component);
  });
});

// ---------------------------------------------------------------------------
// Scope — out of scope
// ---------------------------------------------------------------------------

describe("SECURITY.md — out-of-scope items", () => {
  it("excludes third-party dependency vulnerabilities", () => {
    expect(content).toContain("third-party dependencies");
  });

  it("excludes social engineering attacks", () => {
    expect(content).toMatch(/[Ss]ocial engineering/);
  });

  it("excludes Denial of Service via legitimate API calls", () => {
    expect(content).toMatch(/Denial of Service/i);
  });

  it("excludes issues requiring physical access", () => {
    expect(content).toMatch(/physical access/i);
  });

  it("excludes already-known public issues", () => {
    expect(content).toMatch(/already known/i);
  });
});

// ---------------------------------------------------------------------------
// Commitment timelines
// ---------------------------------------------------------------------------

describe("SECURITY.md — commitment timelines", () => {
  it("commits to initial acknowledgement within 48 hours", () => {
    expect(content).toMatch(/Initial acknowledgement.*48 hours/s);
  });

  it("commits to triage within 5 business days", () => {
    expect(content).toMatch(/5 business days/i);
  });

  it("commits to a Critical fix within 7 days", () => {
    expect(content).toMatch(/Critical:?\s*7 days/i);
  });

  it("commits to a High fix within 14 days", () => {
    expect(content).toMatch(/High:?\s*14 days/i);
  });

  it("commits to a Medium fix within 30 days", () => {
    expect(content).toMatch(/Medium:?\s*30 days/i);
  });

  it("describes a coordinated disclosure model", () => {
    expect(content).toMatch(/coordinated disclosure/i);
  });
});

// ---------------------------------------------------------------------------
// Severity classification (CVSS v3.1)
// ---------------------------------------------------------------------------

describe("SECURITY.md — severity classification", () => {
  it("references the CVSS v3.1 scoring standard", () => {
    expect(content).toMatch(/CVSS v3\.1/i);
  });

  it("defines Critical as CVSS 9.0 – 10.0", () => {
    expect(content).toMatch(/Critical.*9\.0\s*[–-]\s*10\.0/s);
  });

  it("defines High as CVSS 7.0 – 8.9", () => {
    expect(content).toMatch(/High.*7\.0\s*[–-]\s*8\.9/s);
  });

  it("defines Medium as CVSS 4.0 – 6.9", () => {
    expect(content).toMatch(/Medium.*4\.0\s*[–-]\s*6\.9/s);
  });

  it("defines Low as CVSS 0.1 – 3.9", () => {
    expect(content).toMatch(/Low.*0\.1\s*[–-]\s*3\.9/s);
  });

  it("provides AxiomID-specific examples for the Critical tier", () => {
    expect(content).toMatch(/Critical.*(?:auth bypass|DID hijacking|trust score forgery)/si);
  });
});

// ---------------------------------------------------------------------------
// Security best practices for contributors
// ---------------------------------------------------------------------------

describe("SECURITY.md — security best practices for contributors", () => {
  it("prohibits 'any' types in TypeScript", () => {
    expect(content).toMatch(/No `any` types in TypeScript/);
  });

  it("requires requireAuth middleware on protected routes", () => {
    expect(content).toMatch(/requireAuth/);
  });

  it("requires Zod schema validation for all inputs", () => {
    expect(content).toMatch(/Zod schemas?/i);
  });

  it("prohibits secrets in code (requires env vars)", () => {
    expect(content).toMatch(/No secrets in code/i);
  });

  it("prohibits console.log with sensitive data", () => {
    expect(content).toMatch(/No `console\.log` with sensitive data/);
  });

  it("requires parameterized D1 queries (no string interpolation in SQL)", () => {
    expect(content).toMatch(/D1 queries must be parameterized/i);
  });

  it("prohibits logging or transmitting Ed25519 keys in plaintext", () => {
    expect(content).toMatch(/Ed25519 keys must never be logged/i);
  });

  it("lists exactly 7 best-practice bullet points", () => {
    // Each bullet in the section starts with "- "
    const section = content.split("## Security Best Practices for Contributors")[1] ?? "";
    const bullets = section.match(/^- .+/gm) ?? [];
    expect(bullets).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// Boundary / negative cases
// ---------------------------------------------------------------------------

describe("SECURITY.md — boundary and negative cases", () => {
  it("does not expose any internal server IP addresses", () => {
    // Should not contain private IPv4 ranges in plaintext
    expect(content).not.toMatch(/\b(192\.168\.|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.)/);
  });

  it("does not contain hardcoded secrets or API keys (no Bearer token patterns)", () => {
    expect(content).not.toMatch(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/);
  });

  it("does not reference an out-of-scope unsupported version as supported", () => {
    // Versions before 0.1.0 must not appear in the Supported column as active
    expect(content).not.toMatch(/< 0\.1\.0.*Active support/s);
  });

  it("file ends with a newline character", () => {
    expect(content).toMatch(/\n$/);
  });
});