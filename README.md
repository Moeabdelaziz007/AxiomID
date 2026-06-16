<!-- ════════════════ AIX SOVEREIGN STACK · UNIFIED BRANDING ════════════════ -->

<div align="center">
  <img src="./public/axiomid-banner.png" alt="AxiomID Banner" width="100%" />
</div>

<div align="center">

[![AIX Stack](https://img.shields.io/badge/AIX%20STACK-Echo369-FFD700?style=for-the-badge&labelColor=050505)](https://github.com/Moeabdelaziz007/aix-format/blob/main/AXIOM.md)
[![Spec](https://img.shields.io/badge/SPEC-AIX%2F1.0-FFD700?style=for-the-badge&labelColor=050505)](https://github.com/Moeabdelaziz007/aix-format/blob/main/AXIOM.md)
[![Layer](https://img.shields.io/badge/LAYER-L0%20%C2%B7%20ROOT%20AUTHORITY-FFD700?style=for-the-badge&labelColor=050505)](https://github.com/Moeabdelaziz007/axiomid-project)
[![Version](https://img.shields.io/badge/version-v1.0.0-FFD700?style=for-the-badge&labelColor=050505)](./package.json)
[![License](https://img.shields.io/badge/LICENSE-Proprietary-FFD700?style=for-the-badge&labelColor=050505)](./LICENSE)

</div>

<div align="center">

**Root Authority** &nbsp;.&nbsp; **👑 L0 . `axiomid-project` . YOU ARE HERE** &nbsp;.&nbsp; Sovereign Core: [**L1 `aix-format`**](https://github.com/Moeabdelaziz007/aix-format) &nbsp;.&nbsp; [**L2 `iqra`**](https://github.com/Moeabdelaziz007/iqra) &nbsp;.&nbsp; [**L3 `aix-agent-skills`**](https://github.com/Moeabdelaziz007/aix-agent-skills)

</div>

<div align="center">

<sub>Satellites: [**L4 `AlphaAxiom`**](https://github.com/Moeabdelaziz007/AlphaAxiom) &nbsp;.&nbsp; [**L5 `PiWorker-OS`**](https://github.com/Moeabdelaziz007/PiWorker-OS) &nbsp;.&nbsp; [**L6 `GemClaw`**](https://github.com/Moeabdelaziz007/GemClaw) &nbsp;.&nbsp; identity flows: L0 -&gt; all (every agent carries did:axiom:axiomid.app:*)</sub>

</div>

<br/>

<!-- ════════════════ /AIX SOVEREIGN STACK ════════════════ -->

<p align="center">
  <h1 align="center">AxiomID: The Human Authorization Protocol</h1>

<p align="center">
  <em>Built by <a href="https://github.com/Moeabdelaziz007">Mohamed Abdelaziz</a></em>
</p>

<p align="center">
  <strong>"Identity is an Asset, not a Biometric."</strong>
</p>

<div align="center">
  <img src="https://img.shields.io/badge/Status-Beta_V1.0.0-00ff41?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Stack-Next.js_16_|_Prisma_|_PostgreSQL-000000?style=for-the-badge&logo=next.js" alt="Stack" />
  <img src="https://img.shields.io/badge/Aesthetic-Sophisticated_Cyberpunk-00d4ff?style=for-the-badge&logoColor=white" alt="Aesthetic" />
</div>

<p align="center">
  <a href="https://github.com/Moeabdelaziz007#07-architects--ai-collaborators--المعماريون-والمتعاونون-الذكيون"><img src="https://img.shields.io/badge/SOVEREIGN%20AI%20STACK-1%20Human%20%2B%2012%20AI%20Agents%20across%205%20projects-39FF14?style=for-the-badge&labelColor=050505&logo=github&logoColor=39FF14" alt="Sovereign AI Stack · 1 Human + 12 AI Agents across 5 projects"/></a>
</p>

<p align="center">
  <a href="#-philosophy">🧬 Philosophy</a> •
  <a href="#-architecture">📐 Architecture</a> •
  <a href="#-roadmap">🗺️ Roadmap</a> •
  <a href="#-quick-start">🚀 Quick Start</a>
</p>

---

## 🧬 Philosophy

**AxiomID** rejects the dystopian future of iris scans and hardware dependencies. We believe your identity is defined by your **history**, your **actions**, and your **reputation**—not your biology.

We are building the **"Quantum Command Center"** for digital identity:
- **Software-First:** No Orbs, no hardware.
- **Privacy-Preserving:** Zero-knowledge proofs of humanity.
- **Asset-Based:** Your reputation is an asset you build, own, and stake.

### The "Sophisticated Engineering" Aesthetic
Our UI reflects our code: dark, precise, and data-dense. We use an **OLED Black** foundation with **Neon Emerald** (Verified) and **Electric Blue** (Data) accents. It feels like jacking into a secure mainframe, not browsing a marketing site.

---

## 📐 Architecture & Tiers

AxiomID uses a progressive trust model. You don't just "have" an ID; you **level up** your clearance.

| Tier | XP | Status | Description |
| :--- | :--- | :--- | :--- |
| **Visitor** | 0 | 🌑 Locked | Unverified. Lurker status. Limited access. |
| **Citizen** | 100 | 🟢 Verified | Basic "Proof of Humanity". Social accounts connected. |
| **Validator** | 500 | 🔵 Active | Proven history. Active wallet, transaction history. |
| **Sovereign** | 1000 | 🟣 Elite | High reputation. Financial stake locked. Vouching power. |

### 🛠️ Tech Stack
- **Frontend:** Next.js 16 (App Router), Tailwind CSS, Framer Motion (Bento Grids, Floating Elements).
- **Backend:** Next.js API Routes (Serverless).
- **Database:** PostgreSQL (via **Prisma ORM**).
- **Auth:** Web3 First (Wallet Connect).

### 📂 Project Structure
```
axiomid/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # 🖥️ The Command Center (Bento Grid)
│   │   ├── globals.css               # 🎨 Dark Engineering Theme + Mobile fixes
│   │   ├── layout.tsx                # Root layout + providers
│   │   ├── error.tsx                 # Page-level error boundary
│   │   ├── global-error.tsx          # Root error boundary
│   │   ├── not-found.tsx             # Custom 404 page
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # User dashboard (tabs: passport, actions, agent, terminal)
│   │   │   ├── marketplace/page.tsx  # Skills marketplace
│   │   │   └── settings/page.tsx     # User settings & profile
│   │   ├── passport/[slug]/
│   │   │   ├── page.tsx              # Public agent passport view
│   │   │   └── PassportHeader.tsx    # Passport header component
│   │   ├── status/page.tsx           # Network status monitor
│   │   ├── privacy/page.tsx          # Privacy policy
│   │   ├── terms/page.tsx            # Terms of service
│   │   ├── context/
│   │   │   ├── wallet-context.tsx    # 🧠 Global State Management
│   │   │   ├── language-context.tsx  # i18n (EN/AR) context
│   │   │   └── sandbox-provider.tsx  # Pi Browser sandbox init
│   │   └── api/                      # ⚡ Backend Logic (20+ routes)
│   │       ├── auth/connect/         # Wallet Authentication
│   │       ├── auth/logout/          # Session logout
│   │       ├── auth/pi/              # Pi Network Authentication
│   │       ├── auth/state/           # OAuth state token
│   │       ├── credential-status/    # VC credential status
│   │       ├── did-document/         # DID document endpoint
│   │       ├── passport/[slug]/      # Public passport lookup
│   │       ├── passport/[slug]/verify/ # Passport verification
│   │       ├── agent/                # Agent CRUD
│   │       ├── agent/activate/       # Agent activation
│   │       ├── agent/main/           # Agent action execution
│   │       ├── agent/manifest/       # W3C VC manifest
│   │       ├── agent/pause/          # Agent pause
│   │       ├── pi/kya/claim/         # KYA verification
│   │       ├── pi/payment/approve/   # Payment approval
│   │       ├── pi/payment/complete/  # Payment completion
│   │       ├── skills/               # Skills marketplace API
│   │       ├── stamp/                # Stamp listing
│   │       ├── stamp/claim/          # Stamp claiming
│   │       ├── status/               # Network status
│   │       └── user/status/          # User status
│   ├── components/
│   │   ├── AgentPassport.tsx         # Passport card with verification
│   │   ├── AgentQR.tsx               # QR code generator
│   │   ├── ErrorBanner.tsx           # Global floating error banner
│   │   ├── LanguageToggle.tsx        # EN/AR language switcher (44px target)
│   │   ├── StampBoard.tsx            # Stamp collection grid
│   │   ├── StampCard.tsx             # Individual stamp card
│   │   ├── ThemeToggle.tsx           # Dark/light mode toggle (44px target)
│   │   ├── TrustScoreGauge.tsx       # SVG trust score ring
│   │   ├── VerificationBadge.tsx     # KYA/KYC status badge
│   │   └── XPBurst.tsx              # XP animation effect
│   ├── lib/
│   │   ├── prisma.ts                 # Database Client (Prisma singleton)
│   │   ├── actions.ts                # "Proof of Work" Definitions
│   │   ├── tiers.ts                  # Gamification Logic
│   │   ├── trust.ts                  # Trust score algorithm (70/30 XP/stamp)
│   │   ├── auth-middleware.ts         # Pi token verification + cache
│   │   ├── crypto.ts                 # VC signing + token encryption
│   │   ├── did.ts                    # DID generation (did:axiom:*)
│   │   ├── errors.ts                 # Standardized API error/success
│   │   ├── ip.ts                     # Client IP resolver
│   │   ├── logger.ts                 # Structured logger
│   │   ├── oauth-state.ts            # CSRF state token signing
│   │   ├── pi-sdk.ts                 # Pi SDK v2.0 integration
│   │   ├── pi-sandbox.ts             # Pi Browser sandbox compat
│   │   ├── rate-limiter.ts           # In-memory sliding window
│   │   ├── sanitize.ts               # Input sanitization
│   │   ├── validators.ts             # Zod schemas for all inputs
│   │   ├── vc.ts                     # W3C Verifiable Credential signing
│   │   └── memory/                   # 🧠 Memory Graph System
│   │       ├── builder.ts            # Graph builder (extractors → JSON)
│   │       ├── graph.ts              # MemoryGraph types + validation
│   │       ├── router.ts             # TopologicalRouter (BFS context)
│   │       └── extractors/           # Code/doc/git extractors
│   │           ├── ast-extractor.ts  # TypeScript AST extraction
│   │           ├── doc-extractor.ts  # Markdown/wikilink extraction
│   │           └── git-extractor.ts  # Git commit extraction
│   ├── data/
│   │   └── skills.json               # Agent skill registry (90+ skills)
│   ├── middleware.ts                  # Subdomain rewrite + body size limit
│   └── types/
│       └── global.d.ts               # Pi Browser global types
├── backend/
│   ├── src/
│   │   ├── index.ts              # Cloudflare Worker entry
│   │   ├── router.ts             # Route handler (15+ routes)
│   │   ├── mcp/
│   │   │   ├── server.ts         # 11 MCP tools with Zod schemas
│   │   │   └── handler.ts        # JSON-RPC handler for /mcp
│   │   ├── routes/
│   │   │   ├── search.ts         # GET /api/search
│   │   │   ├── agent-dispatch.ts # 5 skill executors
│   │   │   ├── skills.ts         # Marketplace + install tracking
│   │   │   └── ...
│   │   └── lib/
│   │       ├── auth.ts           # Timing-safe auth + rate limit headers
│   │       ├── trust.ts          # Dialectic trust engine
│   │       ├── delegation.ts     # BFS trust chain resolver
│   │       └── rate-limiter.ts   # KV-backed distributed rate limiter
│   ├── migrations/
│   │   ├── 0001_init.sql         # D1 schema
│   │   └── 0002_seed_skills.sql  # 5 core skills seed
│   ├── workers/
│   │   └── harvest-processor.ts  # Queue consumer
│   └── wrangler.toml             # Cloudflare config (D1, KV, AI, Vectorize, Queues, DO)
├── prisma/
│   ├── schema.prisma                 # Database Schema (PostgreSQL)
│   └── migrations/                   # Migration files (baseline: 0_init)
├── memory.graph.json                 # Generated memory graph
└── STRATEGY.md                       # 📜 Competitive Analysis & Roadmap
```

---

## 🤝 The Consortium: 1 Human + 5 AI Agents

AxiomID is the **Root Authority** of the [**Sovereign AI Stack**](https://github.com/Moeabdelaziz007#07-architects--ai-collaborators--المعماريون-والمتعاونون-الذكيون): 5 sovereign projects engineered by **1 human and 5 specialized AI agents** working in complete alignment.

<div align="center">
<table>
<tr>
<td align="center" width="220" valign="top">
  <a href="https://github.com/Moeabdelaziz007"><img src="https://github.com/Moeabdelaziz007.png" width="80" style="border-radius:50%;"/></a><br/><br/>
  <b>Mohamed Abdelaziz</b><br/>
  <sub>🏛️ Founder &amp; Lead Architect<br/>Vision · First Principles · Final Authority</sub>
</td>
<td align="center" width="220" valign="top">
  <a href="https://jules.google"><img src="https://img.shields.io/badge/AI-Jules_v0-10b981?style=for-the-badge&logo=googlecloud&logoColor=white" height="40"/></a><br/><br/>
  <b>Jules v0</b><br/>
  <sub>🔁 Autonomous Agent<br/>Code generation · Refactoring · Security</sub>
</td>
<td align="center" width="220" valign="top">
  <a href="https://gemini.google.com"><img src="https://img.shields.io/badge/AI-Gemini-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white" height="40"/></a><br/><br/>
  <b>Gemini</b><br/>
  <sub>🧠 Code Auditor<br/>Quality assurance · Verification · AST Checks</sub>
</td>
</tr>
<tr>
<td align="center" width="220" valign="top">
  <a href="https://coderabbit.ai"><img src="https://img.shields.io/badge/AI-CodeRabbit-ff6b35?style=for-the-badge&logo=githubactions&logoColor=white" height="40"/></a><br/><br/>
  <b>CodeRabbit</b><br/>
  <sub>🐇 PR Reviewer<br/>Continuous feedback · Autofixes · Linting</sub>
</td>
<td align="center" width="220" valign="top">
  <a href="https://opencode.sh"><img src="https://img.shields.io/badge/AI_Platform-OpenCode-39FF14?style=for-the-badge&logo=git&logoColor=white" height="40"/></a><br/><br/>
  <b>OpenCode</b><br/>
  <sub>🌐 Agent Platform<br/>Autonomous execution · Environment Sync</sub>
</td>
<td align="center" width="220" valign="top">
  <a href="https://antigravity.google"><img src="https://img.shields.io/badge/IDE-Google_Antigravity-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white" height="40"/></a><br/><br/>
  <b>Antigravity</b><br/>
  <sub>🚀 Agentic IDE<br/>Mission control · Pair programming · Reasoning</sub>
</td>
</tr>
</table>
</div>

<p align="center">
  <em>Built in the Agent-First Era using Google Antigravity and the OpenCode ecosystem.</em>
</p>

---

## 🗺️ Roadmap & Strategy

We have conducted a deep **[Competitive Analysis](./STRATEGY.md)** of World Network, Gitcoin Passport, and others.

### ✅ Completed (Phase A–K)

| Phase | Status | Description |
| :--- | :--- | :--- |
| **A** | ✅ Done | Security hardening (PR #32, #33 merged) |
| **B** | ✅ Done | Mobile/CSS fixes (B1–B9, 12 files, 44px targets, safe-area) |
| **C** | ✅ Done | Prisma baseline — P3005 resolved, all migrations applied |
| **D** | ✅ Done | Cloudflare backend deployed (PresenceDO + queue + timing-safe auth) |
| **E** | ✅ Done | Vercel handshake — GET /status endpoint, heartbeat verified |
| **F** | ✅ Done | Harvest Logic — Zod schema, Perplexity gatherer, dialectic trust |
| **G** | ✅ Done | MCP Server — 11 tools, JSON-RPC handler, deploy on Cloudflare |
| **I** | ✅ Done | Cloudflare AI Search — Workers AI embeddings + Vectorize |
| **J** | ✅ Done | CodeRabbit fixes — BFS re-queuing, command injection guard, path normalization |
| **K** | ✅ Done | 4-Pillar Physics Algorithms + D1→PostgreSQL sync cron |

### 🔄 In Progress

| Phase | Status | Description |
| :--- | :--- | :--- |
| **RL** | 🔄 Active | Rate limit headers — backend + frontend across all API routes |
| **UI** | 🔄 Active | Shared dashboard layout, error boundaries, landing page fixes |
| **CI** | 🔄 Next | CI Intelligence Agent — GitHub Actions → Vectorize + Workers AI |

### ⏳ Deferred

| Phase | Status | Description |
| :--- | :--- | :--- |
| **H** | ⏳ Later | Azure VM — MCP server host, PostgreSQL, agent runtime |

**Upcoming "Moonshot" Features:**
1.  **The Meta-Aggregator:** Ingest scores from Gitcoin/WorldID to boost Axiom XP.
2.  **Proof of Time-Stake ("The Vault"):** Lock USDC to prove long-term human intent.
3.  **Axiom Vouch:** High-stakes peer-to-peer verification.

---

## 🏗️ Infrastructure & Deployment

| Layer | Service | URL | Status |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vercel | https://axiomid.app | ✅ Live |
| **Backend** | Cloudflare Workers | https://axiomid-backend.amrikyy.workers.dev | ✅ Live |
| **Database** | PostgreSQL (Prisma) | db.prisma.io:5432 | ✅ Connected |
| **Queue** | Cloudflare Queues | harvest-queue | ✅ Provisioned |
| **DO** | Cloudflare Durable Objects | PresenceDO | ✅ Deployed |
| **KV** | Cloudflare KV | BRAIN_MEMORY | ✅ Reuse for harvest dedup |
| **AI Search** | Cloudflare AI Search | — | ✅ Live |
| **Sync** | Vercel Cron → D1→PostgreSQL | `*/10 * * * *` | ✅ Active |

### Secrets Management
- `SHARED_SECRET_TOKEN_VERCEL_CF` — Set in both Vercel env + Wrangler secret
- `DATABASE_URL` — PostgreSQL connection string
- `PI_API_KEY` — Pi Network API key (in .env, gitignored)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (nvm use 20)
- npm
- PostgreSQL (or use Prisma Accelerate)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Moeabdelaziz007/axiomid-project.git
cd axiomid-project

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your DATABASE_URL, PI_API_KEY, etc.

# 4. Initialize Database (PostgreSQL)
npx prisma migrate deploy
npx prisma generate

# 5. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **"INITIALIZE SEQUENCE"** to connect your wallet (simulated or real).

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values. See `.env.example` for a full list of variables including database, Pi Network SDK, auth secrets, and Cloudflare backend configuration.

### Backend (Cloudflare Worker)

```bash
cd backend

# Install dependencies
npm install

# Apply D1 migrations
npx wrangler d1 execute axiomid-edge --file=./migrations/0001_init.sql
npx wrangler d1 execute axiomid-edge --file=./migrations/0002_seed_skills.sql

# Set secrets
echo "your-secret-token" | npx wrangler secret put SHARED_SECRET_TOKEN_VERCEL_CF
echo "your-perplexity-key" | npx wrangler secret put PERPLEXITY_API_KEY

# Deploy
npx wrangler deploy
```

### Testing

```bash
# Run all tests (773 tests, 6 skipped)
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## 🧪 Physics-Inspired Algorithms

AxiomID uses physics and information theory to power trust, delegation, and rate limiting. All algorithms are in `src/lib/math-physics.ts` with 54 validation tests.

### Pillar 1 — Thermodynamics
| Algorithm | Equation | Application |
| :--- | :--- | :--- |
| **Ideal Gas Law** | `PV = nRT` | Adaptive rate limit capacity under system load |
| **Carnot Efficiency** | `η = 1 - T_cold/T_hot` | Maximum trust given noise level |
| **Fick's Diffusion** | `J = -D × dC/dx` | Trust propagation from high→low concentration |
| **Fourier's Heat** | `∂T/∂t = α∇²T` | Trust "heat" diffusion through graph |

### Pillar 2 — Information Theory
| Algorithm | Equation | Application |
| :--- | :--- | :--- |
| **Nyquist-Shannon** | `fs ≥ 2×fmax` | Minimum heartbeat frequency |
| **Shannon-Hartley** | `C = B×log₂(1+S/N)` | Channel capacity for trust transmission |
| **Huffman Coding** | Variable-length | Optimal trust data compression |
| **Mutual Information** | `I(X;Y) = H(X)-H(X|Y)` | Trust correlation between DIDs |
| **KL Divergence** | `D_KL(P‖Q)` | Distance between trust distributions |

### Pillar 3 — Network & Game Theory
| Algorithm | Source | Application |
| :--- | :--- | :--- |
| **PageRank** | Google (1998) | Recursive trust importance ranking |
| **Spectral Clustering** | Graph Laplacian | Community detection in delegation networks |
| **Nash Equilibrium** | Game Theory | Stable delegation strategies |
| **Min-Cut Max-Flow** | Ford-Fulkerson | Trust bottleneck detection |

### Pillar 4 — Stochastic Dynamics
| Algorithm | Equation | Application |
| :--- | :--- | :--- |
| **Langevin Equation** | `m(d²x/dt²) = -γv + F + η` | Trust evolution under forces + noise |
| **Fokker-Planck** | `∂P/∂t = -∂(μP)/∂x + ½∂²(σ²P)/∂x²` | Trust probability density evolution |
| **Ising Model** | `H = -JΣsᵢsⱼ - hΣsᵢ` | Trust phase transitions (consensus vs fragmentation) |
| **Kuramoto Model** | `dθᵢ/dt = ωᵢ + K/NΣsin(θⱼ-θᵢ)` | Trust synchronization |

### Wiring
| Module | Algorithms |
| :--- | :--- |
| `trust.ts` | Langevin, Fokker-Planck, Ising, Carnot, Fick, Fourier, SNR, KL |
| `delegation.ts` | PageRank, Nash, best response, min-cut, community detection |
| `rate-limiter.ts` | Ideal Gas Law adaptive capacity |
| `sync/route.ts` | Nyquist-Shannon, Shannon-Hartley, mutual information, SNR |

---

## 🔌 API Reference

### Cloudflare Backend (`https://axiomid-backend.amrikyy.workers.dev`)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/status` | GET | None | Network status |
| `/mcp` | POST | Shared Secret | MCP Server — 11 tools (DID, trust, presence, skills, harvest) |
| `/api/search` | GET | None | Semantic search via Workers AI embeddings + Vectorize |
| `/api/trust/:did` | GET | None | Trust chain resolution with dialectic verification |
| `/api/presence/heartbeat` | POST | None | Presence heartbeat |
| `/api/skills/:slug/install` | POST | None | Install a skill |

### Vercel Frontend (`https://axiomid.app`)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/connect` | POST | Wallet authentication |
| `/api/auth/logout` | POST | Session logout |
| `/api/auth/pi` | POST | Pi Network authentication |
| `/api/did-document` | GET | DID document (also served at `/.well-known/did.json`) |
| `/api/passport/[slug]` | GET | Public passport lookup |
| `/api/skills/[slug]` | GET | Skill details |
| `/api/skills/[slug]/install` | POST | Install a skill |
| `/api/skills/[slug]/review` | GET/POST | Skill reviews |
| `/api/agent` | POST | Agent CRUD |
| `/api/stamp/claim` | POST | Claim a stamp |
| `/api/status` | GET | User status |
| `/api/sync` | GET/POST | D1→PostgreSQL sync (cron: `*/10 * * * *`) |

### CI/CD

This project uses **GitHub Actions** for continuous integration and **Vercel** for continuous deployment.

**CI Pipeline** (`.github/workflows/ci.yml`):
- Runs on every PR and push to `main`
- Type-check (`npx tsc --noEmit`)
- Lint (`npm run lint`)
- Tests (`npm test` — 773 tests, 6 skipped)

**Deployment**:
- Vercel auto-deploys on push to `main` (production) and on PR branches (preview)
- Cloudflare Worker deploys via `npx wrangler deploy`

For detailed deployment instructions, see [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md).

---

## 🤝 Contributing

Contributions are welcome via PR. All PRs require passing CI (type-check, lint, 773 tests) and at least one CodeRabbit review approval.

```bash
# Fork, then clone
git clone https://github.com/<your-fork>/axiomid-project.git
cd axiomid-project

# Install & verify
npm install
cp .env.example .env.local  # fill in your values
npm test
npm run lint
npx tsc --noEmit

# Create a feature branch
git checkout -b feat/my-feature

# Push & open PR
git push origin feat/my-feature
```

See [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) for full deployment instructions and [`.env.example`](./.env.example) for all environment variables.

---

## 📄 License

Proprietary — All Rights Reserved © 2026 Mohamed Abdelaziz.

See [`LICENSE`](./LICENSE) for full terms. This repository is private (`package.json` declares `private: true`); the source, documentation, and configuration may not be copied, redistributed, sublicensed, or used to train any model without prior written permission.

---

<br/>

<div dir="rtl">

---

<h1 align="center">AxiomID: بروتوكول التفويض البشري</h1>

<p align="center">
  <strong>「الهوية هي أصل تمتلكه، وليست بصمة بيولوجية.」</strong>
</p>

---

## 🌍 الرؤية والفلسفة

نحن نرفض المستقبل الديستوبي الذي يعتمد على مسح قزحية العين والأجهزة المعقدة. **AxiomID** هو "مركز القيادة" للهوية الرقمية:
- **برمجيات أولاً (Software-First):** لا حاجة لأجهزة "Orbs".
- **الخصوصية:** إثبات الإنسانية دون كشف هويت الشخصية.
- **الأصول:** سمعتك هي أصل تبنيه وتمتلكه.

## 📐 الهيكلة والمستويات

| المستوى | XP | الحالة | الوصف |
| :--- | :--- | :--- | :--- |
| **زائر** | 0 | 🌑 شبح | غير موثق. صلاحيات محدودة. |
| **مواطن** | 100 | 🟢 شرارة | إثبات إنسانية أساسي (حسابات اجتماعية). |
| **محقق** | 500 | 🔵 نبض | تاريخ موثق. نشاط محفظة ومعاملات. |
| **سيادي** | 1000 | 🟣 بدهية | سمعة عالية. رهان مالي (Stake). قوة التزكية. |

## 🚀 البدء السريع

```bash
# 1. استنساخ المستودع
git clone https://github.com/Moeabdelaziz007/axiomid-project.git
cd axiomid-project

# 2. تثبيت التبعيات
npm install

# 3. تهيئة قاعدة البيانات
npx prisma db push

# 4. تشغيل النظام
npm run dev
```

</div>

<!-- ════════════════ AIX SOVEREIGN STACK . FOOTER ════════════════ -->

---

<div align="center">
  <h3>📐 The AIX Sovereign Stack</h3>
</div>

<div align="center">

| Tier | Layer | Repository | Role / Description |
| :--- | :--- | :--- | :--- |
| 👑 **Root** | **L0** | [**`axiomid-project`**](https://github.com/Moeabdelaziz007/axiomid-project) | **📍 YOU ARE HERE** · Sole Issuer of `did:axiom:*` |

</div>

<div align="center">
  <sub>All repositories are bound by the Unified Sovereign Constitution.</sub>
</div>

<!-- ════════════════ /AIX SOVEREIGN STACK . FOOTER ════════════════ -->
