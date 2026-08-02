<div align="center">

<img src="./public/axiomid-banner-v2.jpg" alt="AxiomID × PAI — Built for the Next Agentic Era" width="100%" style="border-radius: 12px; margin-bottom: 20px;" />

<h1>AxiomID × PAI</h1>

<p><strong>Built for the Next Agentic Era <3</strong></p>

<p><em>Sovereign Identity for Humans and AI Agents — the Identity Primitive of PAI (Pi Agentic Infrastructure).</em></p>

<p>
  <a href="https://axiomid.app"><b>Live App</b></a> ·
  <a href="https://axiomid.app/passport/demo"><b>Demo Passport</b></a> ·
  <a href="https://axiomid.app/leaderboard"><b>Leaderboard</b></a> ·
  <a href="https://github.com/pai-list"><b>PAI Org</b></a>
</p>

<p>
  <a href="https://github.com/Moeabdelaziz007/AxiomID/actions"><img src="https://img.shields.io/github/actions/workflow/status/Moeabdelaziz007/AxiomID/ci.yml?branch=main&label=CI&style=flat-square" alt="CI" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square" alt="Next.js" />
  <img src="https://img.shields.io/badge/Pi%20Browser-supported-8b5cf6?style=flat-square" alt="Pi Browser" />
  <img src="https://img.shields.io/badge/tests-3377%20passed-22c55e?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square" alt="TypeScript Strict" />
  <img src="https://img.shields.io/badge/$0-month-free%20tier-22c55e?style=flat-square" alt="Zero Cost" />
  <img src="https://img.shields.io/badge/PAI-Identity%20Primitive-8b5cf6?style=flat-square" alt="PAI Primitive" />
</p>

</div>

---

> *"King isn't Born, He is Made ;)"*
>
> This is not a tool. This is a **team** — built by a solo engineer and an AI team that codes, reviews, tests, and ships alongside him. Not AI as a tool. AI as a **team**.

## What is PAI

**PAI = Pi + AI = Agent Economy**

PAI is the agentic layer for Pi Network — a universe where every AI agent has a sovereign identity, a verifiable trust score, native payments, and composable skills. All on zero-cost Cloudflare infrastructure.

| Primitive | What It Is | Status |
|-----------|------------|--------|
| **Universal Agent Identity** | `did:agent` — portable, cross-chain, KYC-linked | ✅ Live |
| **TrustChain** | Append-only hash chain for every agent action | ✅ Live |
| **Agent Commerce (ACP)** | Pay and get paid in Pi/USDC | ✅ Live |
| **PAI-Memory (7 layers)** | L1/L2 done · L2-DO · L3 HNSW · L4 Code · L5 Trust · L6 Gossip · L7 Archive | L1/L2 ✅ · L2-DO 🔄 |
| **Agent Discovery (ADP)** | P2P discovery, signaling, tool sharing | 🔄 In Progress |
| **PAI-Gspace** | Global workspace for agent teams | 🔄 Scaffold |
| **PAI-Email** | Catch-all routing + Resend + Durable Objects | ✅ Live |
| **PAI-MCP** | MCP server exposing Pi Network tools | 🔄 14 tools |

---

## What This Is

AxiomID is the **Identity Primitive** of PAI — the agentic layer for Pi Network.

Every agent gets a **sovereign identity**, a **trust score**, a **verifiable passport**, and a **wallet** — all on free-tier infrastructure, all verifiable on-chain.

### The Three Primitives

| Primitive | What It Is | Status |
|-----------|------------|--------|
| **Universal Agent Identity** | `did:agent` — portable, cross-chain, KYC-linked | ✅ Live |
| **TrustChain** | Append-only hash chain for every agent action | ✅ Live |
| **Agent Commerce** | ACP SDK — pay and get paid in Pi/USDC | ✅ Live |

### The Atom (Frozen Forever)

Everything composes on a single 50-line interface — the ABI of the agent economy:

```typescript
export interface PaiSkill<TIn, TOut> {
  name: string;
  version: string;
  execute(input: TIn, ctx: SkillContext): Promise<TOut>;
  validateInput(input: TIn): boolean;
  metadata: {
    price: number;
    permissions: string[];
    acp: { agentId: string };
    sandbox: "wasm" | "js" | "native";
  };
}
```

50 lines. Frozen v1.0.0-immutable. Never changes. v2 = new name.

---

## What's Live (Production on axiomid.app)

- Pi Browser sign-in and callback handling
- Demo and real identity claim flows
- Public passport pages with trust and badge metadata
- Authenticated dashboard with marketplace, settings, and sandbox playground
- Explorer, leaderboard, docs, and service status views
- API routes for auth, passport publishing, Pi payments, and health checks
- **Spend Request** — agentic Pi payments pipeline (agent requests, user approves, Pi SDK executes)
- **TrustChain** — append-only hash chain for all agent actions
- **Truth RAG** — AI-powered Q&A over 6236 verses via Vectorize + Workers AI
- **Dual-Identity Governance** — explicit separation of Human Sovereign and AI Agent nodes
- **MCP Server** — 14 tools for agent identity, trust, and memory
- **OpenIdentity Manifest** — portable agent identity spec

## Under Development (Not Yet Live)

- **Agent Discovery (ADP)** — semantic search via Workers AI + Vectorize → [layer-6-discovery/ADP](../layer-6-discovery/ADP) (🔄 In Progress)
- **PAI-Memory (7 layers)** — L1/L2 done · L2-DO SQLite Adapter in progress → [layer-5-memory/pai-memory](../layer-5-memory/pai-memory) (L1/L2 ✅ · L2-DO 🔄)
- **PAI-Memory L3+** — L3 HNSW · L4 Code · L5 Trust · L6 Gossip · L7 Archive (⏳ Planned)
- **PAI-Gspace** — Global workspace for agent teams → [layer-7-workspace/PAI-Gspace](../layer-7-workspace/PAI-Gspace) (🔄 Scaffold)
- **PAI-Skills** — Composable skill marketplace → [infrastructure/pai-skills](../infrastructure/pai-skills) (🔄 Skeleton)
- **PAI-CLI** — Developer CLI for agent scaffolding → [layer-7-workspace/pai-cli](../layer-7-workspace/pai-cli) (🔄 Scaffold)
- **PAI-Email** — Catch-all routing + Resend + Durable Objects → [PAI-Email-Agent](../PAI-Email-Agent) (✅ Live)
- **PAI-MCP** — MCP server for Pi Network → [layer-4-mcp-gateway/pai-mcp](../layer-4-mcp-gateway/pai-mcp) (🔄 14 tools)
- **PAI-Agent-Kit** — Open-source framework → [layer-3-agent-runtime/pai-agent-kit](../layer-3-agent-runtime/pai-agent-kit) (🔄 Validator ✅ · Runtime 🔄)

---

## Routes

| Route | Purpose |
|:---|:---|
| `/` | Landing experience and entry point |
| `/claim` | Identity claim wizard |
| `/onboarding` | Onboarding flow for new users |
| `/passport/[slug]` | Public passport viewer |
| `/dashboard` | Authenticated dashboard |
| `/dashboard/settings` | User settings and VC viewer |
| `/agent/[username]` | Public agent profile |
| `/explorer` | Discover agents and identities |
| `/leaderboard` | Ranked trust and activity view |
| `/docs` | Product and API documentation |
| `/status` | Service health and dependency status |
| `/diagnostics` | Debug and diagnostic tools |
| `/about` | About AxiomID |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/offline` | Offline fallback page |
| `/signin/callback` | Pi sign-in callback handler |

### API Routes

| Endpoint | Purpose |
|:---|:---|
| `/api/auth/*` | Pi Browser authentication, connect, logout, state |
| `/api/passport/*` | Passport CRUD, publishing, verification |
| `/api/agent/*` | Agent identity, sign, activate, pause, manifest |
| `/api/agents` | List agents for the authenticated user |
| `/api/agents/search` | Semantic agent discovery (Vectorize) |
| `/api/agents/harvest` | Query Perplexity for real-time agent harvesting |
| `/api/pi/*` | Pi payments (approve, complete), KYA claims, ad verification |
| `/api/skills/*` | Skills marketplace (CRUD, search, install, execute, pay, review) |
| `/api/spend-request` | Create, list, approve spend requests + SSE stream |
| `/api/health` | Health check |
| `/api/status` | Protocol metrics: users, agents, XP, payments |
| `/api/explorer` | Live explorer data and stats |
| `/api/leaderboard` | Top users ranked by XP |
| `/api/diagnostics/*` | Error capture and logs |
| `/api/sandbox/*` | Sandbox dev-token and code execution |
| `/api/admin/*` | Admin skills moderation |
| `/api/stamp/*` | Stamp claiming |
| `/api/social/disconnect` | Social account disconnection |
| `/api/sync` | Edge-to-PostgreSQL sync |
| `/api/telegram` | Telegram bot integration |
| `/api/stellar/anchor` | Stellar trust anchoring |
| `/api/vault/stake` | Vault staking |
| `/api/did-document` | DID document resolution |
| `/api/credential-status` | Credential revocation check |
| `/api/upload/presign` | Presigned upload URLs |
| `/api/presence/heartbeat` | Presence heartbeat |
| `/api/daily-review` | Daily review trigger |
| `/api/user/status` | User status |
| `/api/emulate/*` | Service emulation (dev) |

## Tech Stack

| Layer | Technology |
|:---|:---|
| **Frontend** | Next.js 16 · React 19 · Framer Motion 12 · Tailwind 4 |
| **Backend** | Vercel Serverless · Cloudflare Workers |
| **Database** | PostgreSQL (Prisma 6) · D1 (edge sync) · Vectorize (semantic search) |
| **Cache** | Upstash Redis (rate limiting, session state) |
| **AI** | Workers AI — Llama 3.1 8B · BGE-base-en-v1.5 |
| **Auth** | Pi Network SDK · Ed25519 sovereign keys · W3C DID |
| **Storage** | Cloudflare KV · Vercel Blob |
| **State/Cache** | TanStack Query v5 (client-side cache) |
| **CI/CD** | GitHub Actions → Vercel · 3270+ tests |

## Quick Start

```bash
git clone https://github.com/Moeabdelaziz007/AxiomID.git
cd AxiomID
npm install
cp .env.example .env.local
# Fill in: DATABASE_URL, PI_API_KEY, SOVEREIGN_KEY_SALT, auth secrets
npx prisma migrate deploy && npx prisma generate
npm run dev
```

Open http://localhost:3000.

### Pi Browser Local HTTPS

The Pi SDK expects HTTPS in the browser. For local development, use portless:

```bash
npm install -g portless
portless axiomid next dev
# -> https://axiomid.localhost
```

### Backend (Cloudflare Worker)

```bash
cd backend && npm install
npx wrangler d1 execute axiomid-edge --remote --file=./migrations/0001_init.sql
echo "token" | npx wrangler secret put SHARED_SECRET_TOKEN_VERCEL_CF
npx wrangler deploy
```

## Verification

```bash
npm run lint       # 0 errors, 0 warnings
npm run type-check # type check
npm test           # 3270+ tests
```

## Project Structure

```
src/
  app/
    api/           # Route handlers (Next.js App Router)
    dashboard/     # Authenticated dashboard
    passport/      # Public passport viewer
  components/      # Shared UI components
  lib/             # Auth, crypto, Pi SDK, validators, utilities
  i18n/            # Translation files (en.json, ar.json)
prisma/            # Schema and migrations
docs/              # Specs and architecture docs
AxiomID.Memory/    # Knowledge base and design docs
packages/          # PAI packages (atom, identity-did, reputation)
```

## Trust Tiers

| Tier | XP | Access |
|:---|:---:|:---|
| **Visitor** | 0 | Limited. Basic read-only. |
| **Citizen** | 100 | Social stamps, basic agent access. |
| **Validator** | 500 | Agent delegation, marketplace install. |
| **Sovereign** | 1000 | Full trust, vault staking, vouching power. |

## Trust Score

Every identity on AxiomID has a **Trust Score** built from verified stamps and experience points (XP):

**Basic** (when tenure/semantic data is unavailable):
$$\text{Trust Score} = \text{XP Score} \times 0.7 + \text{Stamp Score} \times 0.3$$

**Full** (with tenure and semantic trust data):
$$\text{Trust Score} = \text{XP Score} \times 0.5 + \text{Stamp Score} \times 0.2 + \text{Tenure Score} \times 0.1 + \text{Semantic Trust} \times 0.2$$

Trust decays over time (inactivity penalty) and is boosted by Stellar anchoring (+15%).

## What AxiomID Does

| Layer | What It Does |
|:---|:---|
| **DID** | `did:axiom` — W3C-compliant, self-sovereign identity per user |
| **Verifiable Credentials** | Cryptographically signed stamps (social, KYA, KYC) |
| **Trust Engine** | Physics-inspired algorithm with decay and anchoring |
| **Agent Passports** | Public identity cards with verification badges and trust scores |
| **Spend Request** | Agentic Pi payments — agent requests, user approves, Pi SDK executes |
| **TrustChain** | Append-only hash chain for all agent actions |
| **Skills Marketplace** | Install capabilities for agents |
| **Truth RAG** | AI-powered Q&A over 6236 verses via Vectorize + Workers AI |
| **Soul System** | Six-gate ethical evaluation loop |

## OpenIdentity Protocol

AxiomID implements [OpenIdentity](https://github.com/Moeabdelaziz007/openidentity.md) — a portable identity manifest for AI agents. Like a USB descriptor for an AI agent, it lets any compatible platform understand what the agent is, who controls it, what it can do, and where its approved memory and tools lie.

**Spec:** [openidentity-v0.1.md](https://github.com/Moeabdelaziz007/openidentity.md/blob/main/spec/openidentity-v0.1.md) | **Schema:** [openidentity.schema.json](https://github.com/Moeabdelaziz007/openidentity.md/blob/main/schema/openidentity.schema.json)

### Minimal Manifest Example

```yaml
openidentity: "0.1"
identity:
  id: "did:axiom:axiomid.app:pi:username"
  name: "My Agent"
  type: "ai_agent"
owner:
  type: "human"
  human_verified: true
  method: "kya"
  issuer: "axiomid"
capabilities:
  roles: ["research_assistant"]
  skills: ["web.research"]
mcp:
  servers:
    - name: "axiomid"
      url: "https://api.axiomid.app/mcp"
links:
  axiom_id: "https://axiomid.app/u/username"
```

## Zero-Cost Infrastructure

AxiomID runs entirely on free-tier services. $0/month. Forever.

### 15 Core Free Services

| # | Service | What It Does | Free Tier |
|---|---------|-------------|-----------|
| 1 | Cloudflare Workers AI | AI embeddings for semantic search | 10K neurons/day |
| 2 | Cloudflare Vectorize | Vector DB for agent discovery | 30M dimensions |
| 3 | Cloudflare AI Gateway | Caching + rate limiting for AI | 100K req/day |
| 4 | Cloudflare D1 | SQLite at edge (trust, memory, presence) | 5M reads/day |
| 5 | Cloudflare KV | Key-value cache + rate limiting | 100K reads/day |
| 6 | Cloudflare Queues | Background job dispatch | Free tier |
| 7 | Cloudflare Durable Objects | Real-time agent presence | Free tier |
| 8 | Cloudflare R2 | Object storage (avatars, screenshots) | 10GB free |
| 9 | Ghost.build + TimescaleDB | PostgreSQL + time-series analytics | Free tier |
| 10 | Here.now | Agent landing pages (business cards) | Free |
| 11 | Vercel Hobby | Next.js hosting + preview deploys | 100GB BW |
| 12 | Sentry Free | Error tracking + perf monitoring | 5K errors/mo |
| 13 | Meticulous AI | Session recording → auto E2E tests | Free |
| 14 | Autonoma AI | Agentic E2E testing (self-hosted) | Open source |
| 15 | GitHub Actions | CI/CD + CI Intelligence Agent | 2000 min/mo |

### Agent Service Catalog

The complete reference for every service, tool, and integration is in [`docs/AGENT_SERVICE_CATALOG.md`](./docs/AGENT_SERVICE_CATALOG.md). Any agent can read this catalog to become an expert in AxiomID's infrastructure and start working immediately.

## The PAI Roadmap

AxiomID is merging into PAI as the identity layer. The roadmap:

```
AxiomID Component        → PAI Package
─────────────────────────────────────────
DID Method               → @pai/identity-did
TrustChain               → @pai/reputation
OpenIdentity             → @pai/manifest
PiVerify                 → @pai/skill-verify ($0.04/call)
ACP Services             → PAI Marketplace revenue
```

### PAI Modules (Coming)

```
pai.build
├── bye.pai.build      → Build (Zero-Cost Builder + StartKit)
├── hai.pai.build      → Social (AI Social Platform)
├── fly.pai.build      → Travel (Agentic Travel)
├── try.pai.build      → Learn (Education)
├── why.pai.build      → Reasoning (Deep Analysis)
├── ppp.pai.build      → Protocol (Payments + Wire Protocol)
├── api.pai.build
├── auth.pai.build
├── docs.pai.build
├── mcp.pai.build
└── identity.pai.build  → AxiomID (this repo)
```

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). PRs require passing CI.

```bash
git checkout -b feat/my-feature
# make changes
npm test && npm run lint && npx tsc --noEmit
git commit -m "feat(scope): description ۞"
git push origin feat/my-feature
```

## License

- **Application code:** Proprietary — All Rights Reserved © 2026 Mohamed Abdelaziz. See [`LICENSE`](./LICENSE).
- **`@axiomid/sdk`** and **`@axiomid/crypto`:** MIT licensed. Open for community use.
- **PAI packages (`@pai/*`):** MIT licensed.

## Built By

<div align="center">

**AxiomID × PAI** is built by **Mohamed Abdelaziz** ([@Moeabdelaziz007](https://github.com/Moeabdelaziz007)) — a solo engineer with an AI team.

> Not AI as a tool. AI as a **team** — Hermes, OpenCode, Codex, Claude, Gemini. Each one a co-builder, not a co-pilot.

Built with passion between Cairo, Egypt and Atlanta, GA.

### Acknowledgments

**Pi Network** — For the authentication SDK and the vision of a human-centered web. Learn more at [minepi.com](https://minepi.com).

<a href="https://minepi.com">
  <img src="https://img.shields.io/badge/Built%20with-Pi%20Network-8b5cf6?style=for-the-badge&logo=pi&logoColor=white" alt="Built with Pi Network" />
</a>
<a href="https://vercel.com">
  <img src="https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Deployed on Vercel" />
</a>
<a href="https://www.cloudflare.com">
  <img src="https://img.shields.io/badge/Powered%20by-Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Powered by Cloudflare" />
</a>
<a href="https://github.com/vercel/next.js">
  <img src="https://img.shields.io/badge/Built%20with-Next.js%2016-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Built with Next.js 16" />
</a>

</div>

---

<div align="center">

**[axiomid.app](https://axiomid.app)** · **[Claim your identity](https://axiomid.app/claim)** · **[PAI Org](https://github.com/pai-list)**

<sub>Built for the next agentic era. King isn't Born, He is Made. <3</sub>

</div>
