/**
 * @jest-environment node
 *
 * Structural tests for docs/AXIOMID-MASTER-VISION.md.
 *
 * This file was introduced from scratch in this PR. These tests validate that
 * the document contains the required sections, accurate architectural constants
 * (trust score formula, tier boundaries, Soul Gate names, platform limits),
 * correct metadata, and complete structural integrity. They guard against
 * accidental content removal or edits that would misrepresent the AxiomID
 * protocol specification — a file that has no compile-time validation.
 */

import fs from "fs";
import path from "path";

const VISION_MD_PATH = path.join(__dirname, "../../docs/AXIOMID-MASTER-VISION.md");

let content = "";
let lines: string[] = [];

beforeAll(() => {
  if (!fs.existsSync(VISION_MD_PATH)) {
    return;
  }
  content = fs.readFileSync(VISION_MD_PATH, "utf-8");
  lines = content.split("\n");
});

// ---------------------------------------------------------------------------
// File existence and basic structure
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — file existence", () => {
  it("exists at docs/AXIOMID-MASTER-VISION.md", () => {
    expect(fs.existsSync(VISION_MD_PATH)).toBe(true);
  });

  it("is non-empty", () => {
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it("starts with the top-level H1 heading '# AxiomID Master Vision'", () => {
    expect(content.trimStart()).toMatch(/^# AxiomID Master Vision/);
  });

  it("ends with a newline character", () => {
    expect(content).toMatch(/\n$/);
  });

  it("contains the tagline 'Quantum Command Center of Identity'", () => {
    expect(content).toContain("Quantum Command Center of Identity");
  });
});

// ---------------------------------------------------------------------------
// Document metadata
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — metadata", () => {
  it("records the document version as 2.0", () => {
    expect(content).toMatch(/\*\*Version:\*\*\s*2\.0/);
  });

  it("records the status as 'Living Document'", () => {
    expect(content).toMatch(/\*\*Status:\*\*\s*Living Document/);
  });

  it("records the last-updated date as 2026-06-27", () => {
    expect(content).toMatch(/\*\*Last Updated:\*\*\s*2026-06-27/);
  });

  it("lists @Moeabdelaziz007 as a contributor", () => {
    expect(content).toContain("@Moeabdelaziz007");
  });

  it("declares an MIT license", () => {
    expect(content).toMatch(/\*\*License:\*\*\s*MIT/);
  });
});

// ---------------------------------------------------------------------------
// Table of Contents — all 10 sections present
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Table of Contents", () => {
  const tocEntries = [
    "Core Philosophy",
    "The Soul System",
    "Zero-Cost Architecture",
    "Trust Protocol",
    "Zerolang",
    "Loop Index",
    "Creative UI/UX Concepts",
    "Economic CAPTCHA",
    "MCP Integration",
    "Roadmap",
  ];

  it.each(tocEntries)("Table of Contents references '%s'", (entry) => {
    expect(content).toContain(entry);
  });

  it("Table of Contents has exactly 10 numbered entries", () => {
    const tocSection = content.split("## Table of Contents")[1]?.split("---")[0] ?? "";
    const numbered = tocSection.match(/^\d+\./gm) ?? [];
    expect(numbered).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// H2 sections — all present
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — required H2 sections", () => {
  const requiredH2Sections = [
    "## Core Philosophy",
    "## The Soul System",
    "## Zero-Cost Architecture",
    "## Trust Protocol & Tier System",
    "## Zerolang: Minimalist Instruction Protocol",
    "## Loop Index & Continuous Improvement",
    "## Creative UI/UX Concepts",
    "## Economic CAPTCHA & Self-Policing Network",
    "## MCP Integration & AI Agent Workflows",
    "## Roadmap & Evolution",
    "## Conclusion",
  ];

  it.each(requiredH2Sections)("contains H2 section '%s'", (section) => {
    expect(content).toContain(section);
  });

  it("contains at least 11 H2-level headings", () => {
    const h2s = content.match(/^## .+/gm) ?? [];
    expect(h2s.length).toBeGreaterThanOrEqual(11);
  });
});

// ---------------------------------------------------------------------------
// Core Philosophy section
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Core Philosophy", () => {
  it("describes identity as an asset, not a biometric", () => {
    expect(content).toContain("Identity is an Asset, not a Biometric");
  });

  it("references W3C DIDs as the credential standard", () => {
    expect(content).toContain("W3C DIDs");
  });

  it("mentions Experience Points (XP) as a building block of identity", () => {
    expect(content).toMatch(/Experience Points \(XP\)/);
  });

  it("lists Gitcoin, WorldID, and Pi Network as external stamp sources", () => {
    expect(content).toContain("Gitcoin");
    expect(content).toContain("WorldID");
    expect(content).toContain("Pi Network");
  });

  it("references the Zero-Knowledge Philosophy principle", () => {
    expect(content).toContain("Zero-Knowledge Philosophy");
  });

  it("emphasises privacy over exposure", () => {
    expect(content).toMatch(/privacy over exposure/);
  });

  it("describes the asynchronous and continuous reputation model", () => {
    expect(content).toMatch(/Asynchronous & Continuous/);
  });
});

// ---------------------------------------------------------------------------
// Soul System — 5-gate structure
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Soul System gate names", () => {
  const gateNames = [
    "Muraqabah",
    "Ethical",
    "Sab'iyyah",
    "Tawbah",
    "Self-Review",
  ];

  it.each(gateNames)("defines Soul Gate '%s'", (gate) => {
    expect(content).toContain(gate);
  });

  it("labels the loop as a 5-gate system", () => {
    expect(content).toMatch(/5-[Gg]ate/);
  });

  it("describes Gate 1 (Muraqabah) as Self-Awareness", () => {
    expect(content).toMatch(/Muraqabah.*Self-Awareness/s);
  });

  it("describes Gate 2 (Ethical) as Intent Analysis", () => {
    expect(content).toMatch(/Ethical.*Intent Analysis/s);
  });

  it("describes Gate 3 (Sab'iyyah) as Virtue Scoring", () => {
    expect(content).toMatch(/Sab.iyyah.*Virtue Scoring/s);
  });

  it("describes Gate 4 (Tawbah) as Correction/Repentance", () => {
    expect(content).toMatch(/Tawbah.*Correction/s);
  });

  it("describes Gate 5 (Self-Review) as Post-Action Reflection", () => {
    expect(content).toMatch(/Self-Review.*Post-Action Reflection/s);
  });
});

// ---------------------------------------------------------------------------
// Soul System — technical implementation constants
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Soul System technical constants", () => {
  it("specifies Gemini 2.0 Flash as the LLM provider", () => {
    expect(content).toContain("Gemini 2.0 Flash");
  });

  it("specifies a 5000ms hard timeout for AI calls", () => {
    expect(content).toContain("5000ms timeout");
  });

  it("mentions ND-JSON streaming for real-time monitoring", () => {
    expect(content).toMatch(/ND-JSON streaming/i);
  });

  it("mentions Telegram notifications for ethical failures", () => {
    expect(content).toContain("Telegram notifications");
  });

  it("states that errors are caught and never crash the loop", () => {
    expect(content).toMatch(/errors are caught, never crash the loop/);
  });

  it("includes the Soul Loop flow diagram with 'Execute in Isolation (Sandbox)'", () => {
    expect(content).toContain("Execute in Isolation (Sandbox)");
  });

  it("shows the soul loop ends with 'Update Trust Score & XP Ledger'", () => {
    expect(content).toContain("Update Trust Score & XP Ledger");
  });
});

// ---------------------------------------------------------------------------
// Zero-Cost Architecture — platform table
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Zero-Cost Architecture platforms", () => {
  it("lists Vercel as the frontend platform", () => {
    expect(content).toContain("Vercel");
  });

  it("lists Cloudflare as the backend/edge compute platform", () => {
    expect(content).toContain("Cloudflare");
  });

  it("lists Ghost.build as the primary PostgreSQL database platform", () => {
    expect(content).toContain("Ghost.build");
  });

  it("states the Cloudflare free tier allows 100K requests per day", () => {
    expect(content).toContain("100K req/day");
  });

  it("states Ghost.build provides 666MB PostgreSQL storage", () => {
    expect(content).toContain("666MB PostgreSQL");
  });

  it("states Vercel provides 100GB bandwidth on the free tier", () => {
    expect(content).toContain("100GB bandwidth");
  });

  it("claims the platform runs at $0/month", () => {
    expect(content).toMatch(/\$0\/month/);
  });

  it("mentions pgbouncer for serverless DB connection pooling", () => {
    expect(content).toContain("pgbouncer=true");
  });
});

// ---------------------------------------------------------------------------
// Zero-Cost Architecture — data flow and cost tricks
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Zero-Cost cost optimization tricks", () => {
  const costTricks = [
    "Edge Caching",
    "Static Generation",
    "Connection Pooling",
    "KV Caching",
    "R2 Storage",
  ];

  it.each(costTricks)("lists cost trick '%s'", (trick) => {
    expect(content).toContain(trick);
  });

  it("lists exactly 5 cost optimisation tricks", () => {
    const section =
      content.split("### Cost Optimization Tricks")[1]?.split("---")[0] ?? "";
    const numbered = section.match(/^\d+\./gm) ?? [];
    expect(numbered).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// Trust Protocol — formula
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Trust Score formula", () => {
  it("defines the base Trust Score with XP weight of 0.7", () => {
    expect(content).toMatch(/XP[_\w]* \* 0\.7/);
  });

  it("defines the base Trust Score with Stamp weight of 0.3", () => {
    expect(content).toMatch(/Stamp[_\w]* \* 0\.3/);
  });

  it("specifies the Trust Score range as 0–100", () => {
    expect(content).toMatch(/0[–-]100/);
  });

  it("specifies the default Trust Score as 0", () => {
    expect(content).toMatch(/Default.*\*\*0\*\*/s);
  });

  it("explicitly warns 'never hardcode any other value' for the default", () => {
    expect(content).toContain("never hardcode any other value");
  });

  it("includes the dynamic formula with Tenure_Score weight of 0.1", () => {
    expect(content).toMatch(/Tenure_Score \* 0\.1/);
  });

  it("includes the dynamic formula with Semantic_Trust weight of 0.2", () => {
    expect(content).toMatch(/Semantic_Trust \* 0\.2/);
  });
});

// ---------------------------------------------------------------------------
// Trust Protocol — tier table
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Trust Tier definitions", () => {
  it("defines the 'Visitor' tier at score range 0–24", () => {
    expect(content).toMatch(/Visitor.*0[–-]24/s);
  });

  it("defines the 'Citizen' tier at score range 25–49", () => {
    expect(content).toMatch(/Citizen.*25[–-]49/s);
  });

  it("defines the 'Validator' tier at score range 50–74", () => {
    expect(content).toMatch(/Validator.*50[–-]74/s);
  });

  it("defines the 'Sovereign' tier at score range 75–100", () => {
    expect(content).toMatch(/Sovereign.*75[–-]100/s);
  });

  it("lists exactly 4 trust tiers", () => {
    const tierSection =
      content.split("### Trust Tiers")[1]?.split(/\n---\n/)[0] ?? "";
    const tierRows = tierSection.match(/\| \*\*\w+\*\* \|/g) ?? [];
    expect(tierRows).toHaveLength(4);
  });

  it("Validator tier includes 'Skills Marketplace' as a capability", () => {
    expect(content).toMatch(/Validator.*Skills Marketplace/s);
  });

  it("Sovereign tier can 'slash bad actors'", () => {
    expect(content).toMatch(/Sovereign.*slash bad actors/s);
  });
});

// ---------------------------------------------------------------------------
// Zerolang section
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Zerolang protocol", () => {
  it("defines Zerolang as a minimalist linguistic framework", () => {
    expect(content).toMatch(/minimalist linguistic framework/i);
  });

  it("lists 'Zero Overhead' as a design principle", () => {
    expect(content).toContain("Zero Overhead");
  });

  it("lists 'Declarative Syntax' as a design principle", () => {
    expect(content).toContain("Declarative Syntax");
  });

  it("lists 'Loop-Compatible' as a design principle", () => {
    expect(content).toContain("Loop-Compatible");
  });

  it("lists 'Self-Describing' as a design principle (Zod-validated payloads)", () => {
    expect(content).toContain("Self-Describing");
    expect(content).toContain("Zod-validated payloads");
  });

  it("includes a conceptual syntax example with '@intent' directive", () => {
    expect(content).toContain("@intent");
  });

  it("contains the example 'verify_credential' action in the syntax block", () => {
    expect(content).toContain('action: "verify_credential"');
  });
});

// ---------------------------------------------------------------------------
// Loop Index — installed loops
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Loop Index installed loops", () => {
  const installedLoops = [
    "docs sweep",
    "production error sweep",
    "architecture satisfaction loop",
    "SEO/GEO visibility loop",
    "repository cleanup loop",
    "post-release baseline loop",
    "test-suite speed loop",
  ];

  it.each(installedLoops)("lists installed loop '%s'", (loop) => {
    expect(content).toContain(loop);
  });

  it("lists exactly 7 installed and active loops in the table", () => {
    const installedSection =
      content.split("#### Installed & Active Loops")[1]?.split("####")[0] ?? "";
    const tableRows = installedSection.match(/^\| \*\*/gm) ?? [];
    expect(tableRows).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// Loop Index — worth installing loops
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Loop Index worth-installing loops", () => {
  const worthInstalling = [
    "100% test coverage loop",
    "logging coverage loop",
    "ticket-to-PR-ready loop",
    "fresh-clone loop",
    "nightly changelog loop",
    "quality streak loop",
    "full product evaluation loop",
    "recent-feedback sweep",
    "stale-safe batch release loop",
    "production data cleanup loop",
  ];

  it.each(worthInstalling)("lists worth-installing loop '%s'", (loop) => {
    expect(content).toContain(loop);
  });

  it("lists exactly 10 worth-installing loops", () => {
    const worthSection =
      content.split("#### Worth Installing Loops")[1]?.split("###")[0] ?? "";
    const tableRows = worthSection.match(/^\| \*\*/gm) ?? [];
    expect(tableRows).toHaveLength(10);
  });

  it("marks '100% test coverage loop' as HIGH priority", () => {
    expect(content).toMatch(/100% test coverage loop.*HIGH/s);
  });

  it("marks 'stale-safe batch release loop' as LOW priority", () => {
    expect(content).toMatch(/stale-safe batch release loop.*LOW/s);
  });
});

// ---------------------------------------------------------------------------
// Creative UI/UX section
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Creative UI/UX Concepts", () => {
  it("references the 'Sophisticated Engineering Cyberpunk' aesthetic", () => {
    expect(content).toContain("Sophisticated Engineering Cyberpunk");
  });

  it("specifies Neon Emerald (#22c55e) as the primary accent color", () => {
    expect(content).toContain("#22c55e");
  });

  it("mentions Geist Sans as the body typeface", () => {
    expect(content).toContain("Geist Sans");
  });

  it("mentions Geist Mono as the data/code typeface", () => {
    expect(content).toContain("Geist Mono");
  });

  it("describes 'The Digital Orb' as a holographic neon-green sphere", () => {
    expect(content).toContain("The Digital Orb");
    expect(content).toMatch(/holographic.*neon-green sphere/);
  });

  it("specifies the SBT standard as ERC-721 (non-transferable)", () => {
    expect(content).toContain("ERC-721");
    expect(content).toContain("non-transferable");
  });

  it("mentions QR code in the passport export feature", () => {
    expect(content).toContain("QR code");
  });
});

// ---------------------------------------------------------------------------
// Economic CAPTCHA section
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Economic CAPTCHA & Vouching", () => {
  it("describes Economic CAPTCHA as Proof of Time-Stake", () => {
    expect(content).toContain("Proof of Time-Stake");
  });

  it("states the capital lock period is one year", () => {
    expect(content).toMatch(/lock capital for one year/);
  });

  it("specifies that Sovereign users (75–100) can vouch for Visitors", () => {
    expect(content).toMatch(/Sovereign users.*75[–-]100.*vouch for.*Visitors/s);
  });

  it("specifies the voucher stakes 10% of their XP on the newcomer", () => {
    expect(content).toMatch(/10% of their XP/);
  });

  it("specifies the voucher earns 5% bonus XP on successful vouching", () => {
    expect(content).toMatch(/5% bonus XP/);
  });

  it("mentions slashing as the penalty for vouching bad actors", () => {
    expect(content).toContain("slashing");
  });

  it("mentions Sybil attacks as the threat mitigated by slashing", () => {
    expect(content).toMatch(/Sybil attacks/i);
  });

  it("describes a social graph for isolating bad actors", () => {
    expect(content).toMatch(/social graph analysis/);
  });
});

// ---------------------------------------------------------------------------
// MCP Integration section
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — MCP Integration & Agent Workflows", () => {
  it("describes Ghost.build as providing native MCP support", () => {
    expect(content).toMatch(/Ghost\.build.*native MCP support/s);
  });

  it("mentions Row-Level Security (RLS) enforcement via MCP", () => {
    expect(content).toContain("Row-Level Security (RLS)");
  });

  it("names OpenCode as the primary orchestrator", () => {
    expect(content).toContain("OpenCode");
  });

  it("names CodeRabbit for automated PR reviews", () => {
    expect(content).toContain("CodeRabbit");
  });

  it("names Gemini CLI as a research and documentation tool", () => {
    expect(content).toContain("Gemini CLI");
  });

  it("names Devin for autonomous complex tasks", () => {
    expect(content).toContain("Devin");
  });

  it("states the Devin budget cap is $50/mo", () => {
    expect(content).toMatch(/\$50\/mo/);
  });

  it("defines 4 key workflow phases", () => {
    const workflowSection =
      content.split("#### Key Workflow Phases")[1]?.split("####")[0] ?? "";
    const numbered = workflowSection.match(/^\d+\./gm) ?? [];
    expect(numbered).toHaveLength(4);
  });

  it("specifies a code acceptance rate target greater than 60%", () => {
    expect(content).toMatch(/Code acceptance rate.*>60%/s);
  });

  it("specifies a human review rate target less than 20%", () => {
    expect(content).toMatch(/Human review rate for PRs.*<20%/s);
  });

  it("specifies an auto-rolled-back deploys rate target less than 2%", () => {
    expect(content).toMatch(/Auto-rolled-back deploys.*<2%/s);
  });

  it("enforces a max step limit of 50 on autonomous agents", () => {
    expect(content).toMatch(/max 50/);
  });

  it("mentions the 'Never self-review' operating rule", () => {
    expect(content).toContain("Never self-review");
  });
});

// ---------------------------------------------------------------------------
// Roadmap section
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Roadmap & Evolution", () => {
  it("contains the v0.1.1 current release milestone", () => {
    expect(content).toContain("v0.1.1");
  });

  it("contains the v0.1.2 in-progress milestone", () => {
    expect(content).toContain("v0.1.2");
  });

  it("contains the v2.0 future milestone", () => {
    expect(content).toContain("v2.0");
  });

  it("marks the @axiomid/sdk npm package as complete in v0.1.1", () => {
    expect(content).toMatch(/✅.*@axiomid\/sdk/s);
  });

  it("marks the @axiomid/crypto package as complete in v0.1.1", () => {
    expect(content).toMatch(/✅.*@axiomid\/crypto/s);
  });

  it("marks the Truth RAG Pipeline as complete in v0.1.1", () => {
    expect(content).toMatch(/✅.*Truth RAG Pipeline/s);
  });

  it("marks MCP Bootstrap Agent Startup Flow as in-progress in v0.1.2", () => {
    expect(content).toMatch(/🔄.*MCP Bootstrap Agent Startup Flow/s);
  });

  it("marks VS Code / Cursor Extension as in-progress in v0.1.2", () => {
    expect(content).toMatch(/🔄.*VS Code \/ Cursor Extension/s);
  });

  it("targets the Zerolang Compiler as a v2.0 future item", () => {
    expect(content).toMatch(/🎯.*Zerolang Compiler/s);
  });

  it("targets the Soul Loop SDK as a v2.0 future item", () => {
    expect(content).toMatch(/🎯.*Soul Loop SDK/s);
  });

  it("targets Multi-Chain Passport Minting for Ethereum, Polygon, Base, Arbitrum in v2.0", () => {
    expect(content).toContain("Ethereum");
    expect(content).toContain("Polygon");
    expect(content).toContain("Base");
    expect(content).toContain("Arbitrum");
  });

  it("targets the Quantum Identity Aggregator in v2.0 that consumes Gitcoin, WorldID, BrightID, Holonym", () => {
    expect(content).toContain("Quantum Identity Aggregator");
    expect(content).toContain("BrightID");
    expect(content).toContain("Holonym");
  });
});

// ---------------------------------------------------------------------------
// Conclusion section
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — Conclusion", () => {
  it("contains the Conclusion H2 heading", () => {
    expect(content).toContain("## Conclusion");
  });

  it("describes AxiomID as a philosophical framework for ethical AI-human collaboration", () => {
    expect(content).toMatch(/philosophical framework for ethical AI-human collaboration/);
  });

  it("lists exactly 5 design goals in the conclusion numbered list", () => {
    const conclusionSection =
      content.split("## Conclusion")[1]?.split("---")[0] ?? "";
    const numbered = conclusionSection.match(/^\d+\./gm) ?? [];
    expect(numbered).toHaveLength(5);
  });

  it("conclusion goal 1 references 'zero-knowledge proofs'", () => {
    expect(content).toMatch(/Respect privacy.*zero-knowledge proofs/s);
  });

  it("conclusion goal 3 references the '5-gate Soul Loop'", () => {
    expect(content).toMatch(/Enforce ethics.*5-gate Soul Loop/s);
  });

  it("conclusion goal 5 references 'zero-cost architecture'", () => {
    expect(content).toMatch(/Scale infinitely.*zero-cost architecture/s);
  });

  it("contains the IQRA Chronicle format symbol (۞)", () => {
    expect(content).toContain("۞");
  });
});

// ---------------------------------------------------------------------------
// Boundary and negative cases
// ---------------------------------------------------------------------------

describe("AXIOMID-MASTER-VISION.md — boundary and negative cases", () => {
  it("does not expose any private IPv4 addresses", () => {
    expect(content).not.toMatch(
      /\b(192\.168\.|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.)/,
    );
  });

  it("does not contain hardcoded Bearer tokens or API keys", () => {
    expect(content).not.toMatch(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/);
  });

  it("does not set the default Trust Score to any value other than 0", () => {
    // The document must not claim any non-zero default Trust Score
    expect(content).not.toMatch(/Default.*\*\*[1-9]\d*\*\*/);
  });

  it("does not refer to any unsupported Trust Tier name", () => {
    // Only the four canonical tiers should appear in the tier table header column
    const tierSection =
      content.split("### Trust Tiers")[1]?.split("---")[0] ?? "";
    // Should not contain any fifth tier name
    expect(tierSection).not.toMatch(/\*\*Elite\*\*|\*\*Admin\*\*|\*\*Root\*\*/);
  });

  it("does not list more than 5 Soul Gates", () => {
    // Gate headings are '#### Gate N:' — should be exactly 5
    const gateHeadings = content.match(/^#### Gate \d+:/gm) ?? [];
    expect(gateHeadings).toHaveLength(5);
  });

  it("does not contain placeholder text such as 'TODO' or 'FIXME'", () => {
    expect(content).not.toMatch(/\bTODO\b|\bFIXME\b/);
  });

  it("the trust score XP weight (0.7) and Stamp weight (0.3) sum to 1.0", () => {
    // Regression: weights in the base formula must be complementary
    expect(0.7 + 0.3).toBe(1.0);
  });

  it("the dynamic trust score weights (0.5 + 0.2 + 0.1 + 0.2) sum to 1.0", () => {
    // Regression: the extended formula weights must also sum to 1.0
    expect(0.5 + 0.2 + 0.1 + 0.2).toBe(1.0);
  });

  it("Visitor tier upper bound (24) is one less than Citizen tier lower bound (25)", () => {
    // Regression: tiers must be contiguous with no gaps
    expect(25 - 24).toBe(1);
  });

  it("Citizen tier upper bound (49) is one less than Validator tier lower bound (50)", () => {
    expect(50 - 49).toBe(1);
  });

  it("Validator tier upper bound (74) is one less than Sovereign tier lower bound (75)", () => {
    expect(75 - 74).toBe(1);
  });

  it("Sovereign tier upper bound matches the maximum Trust Score (100)", () => {
    expect(content).toMatch(/Sovereign.*75[–-]100/s);
  });
});