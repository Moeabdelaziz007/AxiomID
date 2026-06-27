# AxiomID Master Vision

> **The Quantum Command Center of Identity** — Consolidating all creative concepts, architectural innovations, and protocol primitives into a unified vision for the Human Authorization Protocol for AI Agents.

**Last Updated:** 2026-06-27  
**Status:** Living Document  
**Version:** 2.0  

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [The Soul System](#the-soul-system)
3. [Zero-Cost Architecture](#zero-cost-architecture)
4. [Trust Protocol & Tier System](#trust-protocol--tier-system)
5. [Zerolang: Minimalist Instruction Protocol](#zerolang-minimalist-instruction-protocol)
6. [Loop Index & Continuous Improvement](#loop-index--continuous-improvement)
7. [Creative UI/UX Concepts](#creative-uiux-concepts)
8. [Economic CAPTCHA & Self-Policing Network](#economic-captcha--self-policing-network)
9. [MCP Integration & AI Agent Workflows](#mcp-integration--ai-agent-workflows)
10. [Roadmap & Evolution](#roadmap--evolution)

---

## Core Philosophy

### "Identity is an Asset, not a Biometric"

AxiomID reframes identity as a **portable, upgradeable, and valuable portfolio** rather than an inherent biological marker. Your identity is built through:

- **Verifiable Credentials** (W3C DIDs)
- **Experience Points (XP)** from completed actions
- **Stamps** from external protocols (Gitcoin, WorldID, Pi Network)
- **Trust Score** dynamically calculated from XP and stamps

### "Zero-Knowledge Philosophy"

Prove humanity without revealing identity. Emphasis on **privacy over exposure**:

- Selective disclosure of credentials
- Cryptographic proofs instead of raw data
- No permanent on-chain identity linkage

### "Asynchronous & Continuous"

Unlike synchronous CAPTCHA tests, AxiomID builds reputation **24/7** through ongoing evaluation loops, not one-time checks.

---

## The Soul System

### 5-Gate Ethical Loop

Every action passes through a **Soul Loop** — a 5-gate LLM-powered intent analysis system that evaluates moral alignment before execution:

#### Gate 1: **Muraqabah** (Self-Awareness)
- **Purpose:** Boundary check — "Does this action align with my core purpose?"
- **Output:** Binary approval/rejection based on intent alignment

#### Gate 2: **Ethical** (Intent Analysis)
- **Purpose:** Detect malicious or harmful behavior
- **Checks:** Phishing, spam, fraud, harassment, violence
- **Decision:** No action is executed without passing ethical scrutiny

#### Gate 3: **Sab'iyyah** (Virtue Scoring)
- **Purpose:** Score positive attributes of the action
- **Attributes:** Helpfulness, creativity, empathy, contribution to commons

#### Gate 4: **Tawbah** (Correction/Repentance)
- **Purpose:** If a previous action was suboptimal, can this action correct it?
- **Mechanism:** Reflection on past outcomes, learning from mistakes

#### Gate 5: **Self-Review** (Post-Action Reflection)
- **Purpose:** After execution, evaluate the outcome and update internal models
- **Feedback Loop:** Feeds into future Muraqabah gates

### Technical Implementation

- **LLM-based:** Uses Gemini 2.0 Flash for semantic analysis
- **5000ms timeout:** All AI calls have a hard timeout to prevent hanging
- **ND-JSON streaming:** Real-time monitoring of gate execution
- **Telegram notifications:** Alerts on ethical failures (errors are caught, never crash the loop)

### Soul Loop Flow

```
User Action Request
  ↓
Gate 1: Muraqabah → [Pass/Fail]
  ↓
Gate 2: Ethical → [Pass/Fail]
  ↓
Gate 3: Sab'iyyah → [Virtue Score]
  ↓
Gate 4: Tawbah → [Correction Applied?]
  ↓
[Execute in Isolation (Sandbox)]
  ↓
Gate 5: Self-Review → [Outcome Analysis]
  ↓
Update Trust Score & XP Ledger
```

---

## Zero-Cost Architecture

### Platform Arbitrage Strategy

AxiomID runs on **$0/month** by exploiting the free tier strengths of three platforms:

| Platform | Role | Free Tier Limits |
|----------|------|------------------|
| **Vercel** | Frontend + SSR + Analytics | 100GB bandwidth, 4.5MB payload, global edge |
| **Cloudflare** | Backend + Edge Compute + Security | 100K req/day, 10GB R2, 5GB D1 SQLite, WAF/DDoS |
| **Ghost.build** | Primary PostgreSQL Database + MCP | 666MB PostgreSQL, ACID transactions, TimescaleDB |

### Workload Distribution

- **Vercel:** Next.js 14 App Router, SSR/SSG, static assets, privacy-friendly Web Analytics
- **Cloudflare:** Heavy backend compute (Hono Workers), D1/KV/R2 storage, AI integration (Vectorize, Workers AI), CDN + WAF
- **Ghost.build:** Primary relational database (PostgreSQL), ACID transactions, time-series data, native MCP support for AI agents

### Data Flow Architecture

```
User → Vercel Edge → Cloudflare CDN → Cloudflare Worker
  ↓
Cloudflare D1 (Session/Cache)
  ↓
Ghost.build PostgreSQL (Primary Data)
  ↓
Vercel Response
```

### Cost Optimization Tricks

1. **Edge Caching:** Cache API responses at Cloudflare edge
2. **Static Generation:** Use `revalidate` in Next.js to pre-render pages
3. **Connection Pooling:** `pgbouncer=true` for serverless DB connections
4. **KV Caching:** Store expensive query results in Cloudflare KV (explicit TTL required)
5. **R2 Storage:** Offload static image assets to R2 for free egress

---

## Trust Protocol & Tier System

### Trust Score Formula

```
Trust Score = (XP * 0.7) + (Stamps * 0.3)
```

- **Range:** 0–100 (clamped)
- **Default:** **0** (never hardcode any other value)
- **XP Sources:** Completed actions, verified credentials, successful onboarding
- **Stamp Sources:** External protocols (Gitcoin Passport, WorldID, Pi Network KYC)

### Trust Tiers

Progression through 4 tiers based on Trust Score:

| Tier | Trust Score | Capabilities |
|------|-------------|---------------|
| **Visitor** | 0–24 | Browse, view public profiles, limited API access |
| **Citizen** | 25–49 | Create profile, earn XP, request stamps, participate in forums |
| **Validator** | 50–74 | Vouch for others, stake capital, access Skills Marketplace |
| **Sovereign** | 75–100 | Govern protocol, slash bad actors, access Economic CAPTCHA staking |

---

## Zerolang: Minimalist Instruction Protocol

### Concept

**Zerolang** is a **low-level, minimalist linguistic framework** designed for high-efficiency instruction encoding within the AxiomID architecture.

### Design Principles

1. **Zero Overhead:** No runtime interpretation, compiles directly to native primitives
2. **Declarative Syntax:** Expresses *what* to do, not *how* to do it
3. **Loop-Compatible:** Designed to traverse Soul Gates via the Loop Index
4. **Self-Describing:** Schema-aware, Zod-validated payloads

### Example Use Cases

- **Soul Gate Instructions:** Compact encoding of intent analysis prompts
- **Agent-to-Agent Communication:** Minimal payload size for cross-worker RPC
- **Loop Index Navigation:** Iterator control for continuous improvement loops

### Syntax (Conceptual)

```zerolang
@intent(action: "verify_credential", scope: "gitcoin")
  → gate[ethical] → gate[muraqabah] → execute
```

---

## Loop Index & Continuous Improvement

### The Loop Index

A fundamental data structure acting as an **iterative pointer** for continuous system improvement. Loops operate at different frequencies:

#### Installed & Active Loops

| Loop | Frequency | Purpose |
|------|-----------|----------|
| **docs sweep** | Quarterly | Documentation review |
| **production error sweep** | Weekly | Error monitoring |
| **architecture satisfaction loop** | After major features | Architectural review |
| **SEO/GEO visibility loop** | Monthly | Visibility audit |
| **repository cleanup loop** | Weekly | Maintenance |
| **post-release baseline loop** | Per release | Stability checks |
| **test-suite speed loop** | Monthly | Performance optimization |

#### Worth Installing Loops

| Loop | Priority | Purpose |
|------|----------|----------|
| **100% test coverage loop** | HIGH | Systematic API coverage improvement |
| **logging coverage loop** | HIGH | Ensure all code paths have logging |
| **ticket-to-PR-ready loop** | HIGH | Convert issues into verified PRs |
| **fresh-clone loop** | MEDIUM | Validate onboarding (Prisma, Pi SDK, env vars) |
| **nightly changelog loop** | MEDIUM | Automate changelog from commits |
| **quality streak loop** | MEDIUM | Run scenarios until success threshold |
| **full product evaluation loop** | MEDIUM | Comprehensive QA for marketplace |
| **recent-feedback sweep** | MEDIUM | Convert reviews into fixes |
| **stale-safe batch release loop** | LOW | Batch multiple PRs for release |
| **production data cleanup loop** | LOW | Remove disallowed data (e.g., PiPayment) |

### Loop Execution via Zerolang

Loops are **fluid, non-static primitives** that utilize the Loop Index to traverse Soul Gates, allowing for dynamic reconfiguration of logic through Zerolang expressions.

---

## Creative UI/UX Concepts

### "Sophisticated Engineering Cyberpunk"

Core aesthetic guiding all UI/UX:

- **Neon green** (#00FF00) accents on dark backgrounds
- **Hexagonal grids** for modular layouts
- **Glassmorphism** with subtle grid patterns
- **Pulsing animations** for active states
- **Monospace fonts** (Fira Code, JetBrains Mono)

### "The Digital Orb"

A **holographic, pulsing neon-green sphere** in the UI that replaces physical hardware requirements (like WorldID's Orb).

- **Visual:** 3D rotating sphere with particle effects
- **State Indicators:** Color shifts based on Trust Score tier
- **Interaction:** Clicking the Orb opens the Soul Loop status panel

### "Modules (Not Stamps)"

Users **"install" nodes** into an identity mainframe, visually represented as:

- **Hexagonal grid slots** that fill with neon energy as credentials are added
- **Visual:** Resembles a server rack or cyberpunk character upgrade system
- **Progression:** Empty slots → loading animation → filled with credential icon

### Passport as SBT

- **Export as Image:** PNG with neon border, QR code, tier badge
- **Mint as SBT:** On-chain Soulbound Token (ERC-721, non-transferable)
- **Share:** Shareable link with selective credential disclosure

---

## Economic CAPTCHA & Self-Policing Network

### Economic CAPTCHA (Proof of Time-Stake)

A mechanism where users **lock capital for one year** to prove humanity:

- **Barrier to Bots:** Bots avoid locking funds for extended periods
- **Economic Proof:** Humans have future-oriented time preference
- **Staking Tiers:** Higher stakes → higher Trust Score multiplier

### Gamified High-Stakes Vouching

A **self-policing social network** where high-level users risk their own status to vouch for newcomers:

#### Vouching Mechanics

1. **Sovereign users** (Trust Score 75–100) can vouch for **Visitors**
2. Voucher stakes **10% of their XP** on the newcomer
3. If newcomer is flagged for malicious behavior, **voucher loses staked XP** (slashing)
4. If newcomer reaches **Citizen** tier without issues, voucher earns **5% bonus XP**

#### Slashing in Web of Trust

- **Validator Accountability:** Validators lose reputation for endorsing bad actors
- **Economic Disincentive:** Prevents Sybil attacks via financial risk
- **Trust Graph:** Bad actors are isolated via social graph analysis

---

## MCP Integration & AI Agent Workflows

### Model Context Protocol (MCP)

Ghost.build provides **native MCP support**, allowing AI agents to:

- Query the database directly without building custom APIs
- Schema awareness (automatic Zod validation)
- Row-Level Security (RLS) enforcement
- Fast Forking: Clone production databases in seconds for isolated sandbox testing

### Agent Workflow Optimization Plan

Multi-agent orchestration model for automation and quality control:

#### Core Architecture & Tooling

- **OpenCode:** Primary orchestrator for task decomposition and subagent dispatch
- **CodeRabbit:** Automated PR reviews via `.coderabbit.yaml` (engineering covenants, security checks, path-based instructions)
- **Gemini CLI:** Research, multimodal analysis, code review, documentation generation, test creation (using `GEMINI.md` project context)
- **Devin:** Autonomous complex tasks (multi-file refactoring, dependency upgrades) with Linear integration

#### Key Workflow Phases

1. **Phase 1 (CodeRabbit):** "Review as Code" — Write code → `coderabbit review` (CLI) → fix issues → push → blocking PR status check
2. **Phase 2 (Gemini):** Leverage free tier for targeted CLI tasks (custom security review prompts via `.gemini/security-review.toml`, project context management)
3. **Phase 3 (Devin):** High-level autonomous tasks (cost controlled via $50/mo budget cap, batching work for weekends)
4. **Phase 4 (Multi-Agent):** Specialized subagents (Security, Reviewer, Tester, GitOps) coordinated by main OpenCode session

#### Operating Rules

- **Separation of Concerns:** "Implementer writes code, GitOps commits" and "Never self-review"
- **Safety:** Enforce step limits (max 50) and budget caps on autonomous agents
- **Efficiency:** Use worktrees to allow parallel agent execution without merge conflicts

#### Metrics & Targets

- **Code acceptance rate:** >60%
- **Human review rate for PRs:** <20%
- **Auto-rolled-back deploys:** <2%
- **Cadence:** Weekly review of CodeRabbit false positives, monthly evaluation of agent ROI/model mix

---

## Roadmap & Evolution

### v1.5.0 (Current — 2026-06-24)

- ✅ Pi Browser native features (share, KYC consent, payments)
- ✅ Passport Export as Image + Mint as SBT + Share
- ✅ Truth RAG Pipeline (6236 Quran verses, Workers AI)
- ✅ `@axiomid/sdk` npm package (zero dependencies)
- ✅ `@axiomid/crypto` package (sovereign key management, MIT licensed)
- ✅ QuickStart.dev widget with SVG gauge + sparkline
- ✅ RecentActivity feed
- ✅ Skills Marketplace with purchase flow
- ✅ Onboarding wizard with bilingual support (en/ar)
- ✅ E2E testing documentation
- ✅ CONTRIBUTING.md, CODE_OF_CONDUCT.md
- ✅ GitHub Discussions enabled
- ✅ GitHub Sponsors / FUNDING.yml

### v0.1.2 (In Progress)

- 🔄 **MCP Bootstrap Agent Startup Flow** — agent identity handshake via MCP
- 🔄 **VS Code / Cursor Extension** — IDE integration for AxiomID identity
- 🔄 **MCP Server Tools + IDE Integration** — server-side complement
- 🔄 **Agent Workflow Optimization** — CodeRabbit, Gemini, Devin, OpenCode orchestration

### v2.0 (Future)

- 🎯 **Zerolang Compiler** — Full implementation of minimalist instruction protocol
- 🎯 **Soul Loop SDK** — Expose 5-gate system as reusable library for other projects
- 🎯 **Quantum Identity Aggregator** — Meta-protocol that consumes all other identity protocols (Gitcoin, WorldID, BrightID, Holonym) as input signals
- 🎯 **Economic CAPTCHA Staking Pool** — Smart contract for 1-year capital locks
- 🎯 **Decentralized Vouching Graph** — On-chain trust network with slashing mechanism
- 🎯 **Digital Orb 3D Widget** — Interactive holographic sphere for web integration
- 🎯 **Loop Index Automation Platform** — Visual editor for creating custom continuous improvement loops
- 🎯 **Multi-Chain Passport Minting** — Support Ethereum, Polygon, Base, Arbitrum for SBT minting

---

## Conclusion

AxiomID is not just an identity protocol — it's a **philosophical framework for ethical AI-human collaboration**, a **zero-cost architectural masterpiece**, and a **cyberpunk vision** of what decentralized identity should be.

Every concept — from the Soul System to Zerolang, from the Loop Index to the Digital Orb — is designed to:

1. **Respect privacy** (zero-knowledge proofs)
2. **Build trust asynchronously** (continuous reputation)
3. **Enforce ethics** (5-gate Soul Loop)
4. **Empower users** (identity as asset)
5. **Scale infinitely** (zero-cost architecture)

This is the **Quantum Command Center of Identity** — the ultimate layer above all protocols, the meta-aggregator of humanity.

**۞** — The IQRA Chronicle format symbol, representing the continuous pursuit of knowledge and ethical action.

---

**Contributors:** @Moeabdelaziz007  
**License:** MIT  
**Last Updated:** 2026-06-27
