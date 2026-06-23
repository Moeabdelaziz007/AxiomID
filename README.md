<div align="center">
  <img src="./public/axiomid-banner.png" alt="AxiomID" width="100%" />
</div>

<h3 align="center">The Human Authorization Protocol for AI Agents</h3>

<p align="center">
  W3C DIDs · Verifiable Credentials · Trust Scores · Skills Marketplace · Truth RAG<br/>
  <em>No hardware. No iris scans. Just cryptographic proof of humanity.</em>
</p>

<p align="center">
  <a href="https://axiomid.app">Website</a> ·
  <a href="https://axiomid.app/docs">Docs</a> ·
  <a href="https://axiomid.app/leaderboard">Leaderboard</a> ·
  <a href="https://github.com/Moeabdelaziz007/AxiomID/issues">Issues</a>
</p>

---

<p align="center">
  <img src="https://img.shields.io/badge/status-beta_v1.0-blue" alt="Status" />
  <img src="https://img.shields.io/badge/tests-1260%20passing-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen" alt="Coverage" />
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue" alt="React" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748" alt="Prisma" />
  <img src="https://img.shields.io/badge/Cloudflare-Workers-orange" alt="Workers" />
  <img src="https://img.shields.io/badge/license-proprietary-red" alt="License" />
</p>

---

## What It Does

AxiomID is a **decentralized identity layer** for AI agents on Pi Network. It answers one question: *can this agent be trusted?*

| Layer | What It Does |
|:---|:---|
| **DID** | `did:axiom:axiomid.app:pi:{uid}` — W3C-compliant, self-sovereign identity per user |
| **Verifiable Credentials** | Cryptographically signed stamps (social, KYA, KYC). Each stamp is a VC. |
| **Trust Engine** | Physics-inspired algorithms — trust score = `XP (70%) + stamps (30%)` |
| **Agent Passports** | Public identity cards with verification badges, trust scores, and attestation history |
| **Skills Marketplace** | Install capabilities for agents. Agents execute skills in isolated sandboxes. |
| **Truth RAG** | AI-powered Q&A — semantic search across verses via Vectorize + Workers AI |
| **Soul System** | Five-gate ethical evaluation loop — Awareness, Ethical, Virtue, Correction, Self-Review |

---

## Pages

| Route | Description |
|:---|:---|
| [`/`](https://axiomid.app) | Landing — live network stats, trust tiers, hero |
| [`/passport/[slug]`](https://axiomid.app/passport/demo) | Public passport viewer with OG metadata |
| [`/claim`](https://axiomid.app/claim) | 3-step onboarding wizard (Connect → Verify → Deploy) |
| [`/dashboard`](https://axiomid.app/dashboard) | Authenticated dashboard with marketplace, settings |
| [`/explorer`](https://axiomid.app/explorer) | Browse all registered agents |
| [`/leaderboard`](https://axiomid.app/leaderboard) | Top 50 users ranked by XP |
| [`/docs`](https://axiomid.app/docs) | Full docs — stamps, SDK, API reference |
| [`/status`](https://axiomid.app/status) | Live service health (DB, Stellar, Pi, Workers AI) |
| [`/about`](https://axiomid.app/about) | Project story and team |
| [`/onboarding`](https://axiomid.app/onboarding) | Guided first-time setup |

---

## Trust Tiers

| Tier | XP | What It Means |
|:---|:---|:---|
| **Visitor** | 0 | Unverified. Limited access. |
| **Citizen** | 100 | Basic proof of humanity. Social accounts connected. |
| **Validator** | 500 | Active wallet, transaction history. |
| **Sovereign** | 1000 | High reputation. Financial stake. Vouching power. |

Trust is earned through actions, not purchases. The algorithm weighs contribution history, verification depth, and peer attestations.

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| **Frontend** | Next.js 16 (App Router) · React 19 · Framer Motion 12 · Tailwind 4 |
| **Backend** | Vercel Serverless · Cloudflare Workers (edge) |
| **Database** | PostgreSQL (Prisma 6) · D1 (edge sync) · Vectorize (semantic search) |
| **AI** | Workers AI — Llama 3.1 8B (intent analysis, RAG generation) · BGE-small-en-v1.5 (embeddings) |
| **Auth** | Pi Network SDK · Ed25519 sovereign keys · W3C DID documents |
| **Storage** | Cloudflare KV (cache) · Vercel Blob (uploads) |
| **CI/CD** | GitHub Actions → Vercel (auto-deploy on push) · 99 test suites, 1260 tests |

---

## Quick Start

```bash
# Clone
git clone https://github.com/Moeabdelaziz007/AxiomID.git
cd AxiomID

# Install
npm install

# Environment
cp .env.example .env.local
# Fill in: DATABASE_URL, PI_API_KEY, SOVEREIGN_KEY_SALT, auth secrets

# Database
npx prisma migrate deploy
npx prisma generate

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Backend (Cloudflare Worker)

```bash
cd backend && npm install

# D1 database
npx wrangler d1 execute axiomid-edge --remote --file=./migrations/0001_init.sql
npx wrangler d1 execute axiomid-edge --remote --file=./migrations/0002_seed_skills.sql

# Secrets
echo "token" | npx wrangler secret put SHARED_SECRET_TOKEN_VERCEL_CF

# Deploy
npx wrangler deploy
```

### Subdomain Passports

```bash
# Add *.axiomid.app wildcard in Cloudflare DNS
# Add wildcard domain in Vercel project settings
# Then: username.axiomid.app works automatically
```

See [`docs/SUBDOMAIN-SETUP.md`](./docs/SUBDOMAIN-SETUP.md) for DNS configuration.

---

## Testing

```bash
npm test           # 1260 tests, 99 suites
npm run lint       # 0 errors, 0 warnings
npx tsc --noEmit   # type check
```

CI runs on every PR: **type-check → lint → tests**. Zero tolerance for red CI. Vercel deploys preview URLs automatically.

---

## API

### Vercel (`axiomid.app`)

| Route | Method | Description |
|:---|:---|:---|
| `/api/auth/connect` | POST | Wallet authentication |
| `/api/auth/pi` | POST | Pi Network auth |
| `/api/did-document` | GET | DID document |
| `/api/passport/[slug]` | GET | Public passport |
| `/api/skills/[slug]` | GET/POST | Skill details + reviews |
| `/api/agent` | POST | Agent CRUD |
| `/api/stamp/claim` | POST | Claim a stamp |
| `/api/status` | GET | Network status |
| `/api/health` | GET | Service health checks |
| `/api/explorer` | GET | Agent explorer data |
| `/api/leaderboard` | GET | Top 50 by XP |
| `/api/daily-review` | POST | Soul loop daily review |

### Cloudflare (`axiomid-backend.workers.dev`)

| Route | Method | Description |
|:---|:---|:---|
| `/status` | GET | Network status |
| `/mcp` | POST | MCP Server — 11 tools |
| `/api/trust/:did` | GET | Trust chain resolution |
| `/api/search` | GET | Semantic search (Vectorize) |
| `/api/truth/ask` | GET | Truth RAG — ask a question |
| `/api/truth/daily-truth` | GET | Truth RAG — daily verse |

Full docs: [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) · [`STRATEGY.md`](./STRATEGY.md)

---

## Soul System

AxiomID agents run through a **five-gate ethical evaluation loop** before any action:

```
┌─────────────────────────────────────────────────────────┐
│                    SOUL LOOP                            │
│                                                         │
│  1. Awareness  ──── Self-awareness check                │
│  2. Ethical    ──── Intent analysis (Workers AI)         │
│  3. Virtue     ──── Seven-attribute virtue scoring       │
│  4. Correction ──── Correction gate                      │
│  5. Self-Review─── Groq-powered post-action reflection   │
│                                                         │
│  Milestones: 700 actions → Telegram notification        │
│              7000 actions → Sovereign milestone          │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture

```
src/
  app/
    api/              ← 24+ route handlers (stateless Vercel Functions)
    claim/            ← Onboarding wizard
    dashboard/        ← Authenticated dashboard
    passport/[slug]   ← Public passport viewer
    explorer/         ← Agent explorer
    leaderboard/      ← Trust rankings
    docs/             ← Documentation
    status/           ← Service health
  lib/
    soul/             ← Five-gate ethical loop
    trust.ts          ← Trust score algorithm
    daily-review.ts   ← Soul loop daily review
    herenow.ts        ← here.now API integration
    auth-middleware.ts ← Auth verification
    auth-tokens.ts    ← JWT/Pi token handling
    errors.ts         ← Structured error codes
    pi-sdk.ts         ← Pi SDK loader
  components/         ← Shared UI components
  diagnostics/        ← Nostics error catalog
backend/
  src/
    routes/           ← Cloudflare Worker handlers
    lib/              ← Auth, types, JWKS
truth-core/
  schema.sql          ← Truth D1 schema
scripts/
  ingest_truth.ts     ← Truth ingestion pipeline
```

---

## Contributing

PRs require passing CI (type-check, lint, tests) and at least one review.

```bash
git checkout -b feat/my-feature
# make changes
npm test && npm run lint && npx tsc --noEmit
git commit -m "feat(scope): description ۞"
git push origin feat/my-feature
# open PR → CI runs → merge when green
```

All commits follow the **Truth Chronicle** format: `type(scope): description ۞` with narrative body.

---

## License

Proprietary — All Rights Reserved © 2026 Mohamed Abdelaziz. See [`LICENSE`](./LICENSE).
