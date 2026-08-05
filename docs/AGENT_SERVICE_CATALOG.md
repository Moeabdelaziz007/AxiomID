# Agent Service Catalog — AxiomID

> **Purpose:** This file is the single entry point for any AI agent (Hermes, OpenCode, ACP agent, or external) to understand every service, tool, and integration available in AxiomID. Each entry includes the official documentation link, the integration file path, the API surface, and a quick-start example.
>
> **How to use:** Read the section for the service you need. Follow the official doc link for full reference. Use the integration file path to see the actual implementation.

---

## Table of Contents

1. [Cloudflare Workers AI](#1-cloudflare-workers-ai)
2. [Cloudflare Vectorize](#2-cloudflare-vectorize)
3. [Cloudflare AI Gateway](#3-cloudflare-ai-gateway)
4. [Cloudflare D1](#4-cloudflare-d1)
5. [Cloudflare KV](#5-cloudflare-kv)
6. [Cloudflare Queues](#6-cloudflare-queues)
7. [Cloudflare Durable Objects](#7-cloudflare-durable-objects)
8. [Cloudflare R2](#8-cloudflare-r2)
9. [Ghost.build (PostgreSQL + TimescaleDB)](#9-ghostbuild-postgresql--timescaledb)
10. [Here.now (Landing Pages)](#10-herenow-landing-pages)
11. [Vercel (Hosting + Analytics)](#11-vercel-hosting--analytics)
12. [Sentry (Error Tracking)](#12-sentry-error-tracking)
13. [Meticulous AI (Session Recording)](#13-meticulous-ai-session-recording)
14. [Autonoma AI (Agentic E2E Testing)](#14-autonoma-ai-agentic-e2e-testing)
15. [Nostics (Code Analytics)](#15-nostics-code-analytics)
16. [Pi Network (Identity Verification)](#16-pi-network-identity-verification)
17. [OpenIdentity Protocol](#17-openidentity-protocol)
18. [MCP Server (Model Context Protocol)](#18-mcp-server-model-context-protocol)
19. [Playwright (E2E Testing)](#19-playwright-e2e-testing)
20. [GitHub Actions (CI/CD)](#20-github-actions-cicd)
21. [ACP / EconomyOS](#21-acp--economyos)
22. [DegenClaw (Arena Tracking)](#22-degenclaw-arena-tracking)
23. [External Skill Repositories](#23-external-skill-repositories)

---

## 1. Cloudflare Workers AI

**What:** Free-tier AI inference at the edge (10,000 neurons/day on free plan). Used for generating text embeddings for semantic search and agent discovery.

**Official Docs:** https://developers.cloudflare.com/workers-ai/

**Integration Files:**
- `backend/wrangler.toml` — `[ai]` binding
- `backend/src/vectors/trust-embedder.ts` — trust graph embeddings
- `backend/src/vectors/agent-discovery.ts` — agent capability embeddings
- `backend/src/router.ts` — `/api/embed` endpoint

**Model Used:** `@cf/baai/bge-base-en-v1.5` (768-dimensional text embeddings)

**API Surface:**
```typescript
// In Cloudflare Worker
const response = await env.AI.run("@cf/baai/bge-base-en-v1.5", { text: ["your text"] });
// Returns: { data: number[][] } — array of 768-dim vectors
```

**Quick Start (for agents):**
1. Read `backend/src/vectors/trust-embedder.ts` to see how embeddings are generated
2. The `AI` binding is available as `env.AI` in any Worker route handler
3. Embeddings are upserted into Vectorize for semantic search
4. Free tier: 10K neurons/day — each embedding call uses ~1 neuron

**Key Models Available:**
- `@cf/baai/bge-base-en-v1.5` — text embeddings (768-dim) ← AxiomID uses this
- `@cf/baai/bge-small-en-v1.5` — smaller, faster embeddings
- `@cf/meta/llama-3-8b-instruct` — text generation
- `@cf/mistral/mistral-7b-instruct` — text generation

---

## 2. Cloudflare Vectorize

**What:** Vector database for semantic search. Stores agent and trust embeddings, enables natural-language discovery of agents by capability.

**Official Docs:** https://developers.cloudflare.com/vectorize/

**Integration Files:**
- `backend/wrangler.toml` — `[[vectorize]]` binding
- `backend/src/vectors/trust-embedder.ts` — trust vector upsert/query
- `backend/src/vectors/agent-discovery.ts` — agent discovery upsert/query/search
- `backend/src/routes/search.ts` — `/api/search` and `/api/search/similar`
- `backend/src/routes/agent-discovery-search.ts` — `/api/agents/search` and `/api/agents/similar`

**Index Name:** `axiomid-trust-vectors` (defined in wrangler.toml)

**API Surface:**
```typescript
// Upsert vectors
await env.SEARCH_VECTORS.upsert([{ id: "agent:123", values: [...768 floats], metadata: {...} }]);

// Query by vector
const results = await env.SEARCH_VECTORS.query(vector, { topK: 10, returnMetadata: true });

// Query by text (via Workers AI embedding first, then Vectorize query)
```

**Quick Start (for agents):**
1. To index an agent: call `AgentDiscoveryEmbedder.upsertAgent()` with agent profile data
2. To search: `GET /api/agents/search?q=I need an agent that summarizes in Arabic&topK=5`
3. To find similar agents: `GET /api/agents/similar?agentId=xxx&topK=5`
4. Vector dimensions: 768 (matching bge-base-en-v1.5)

---

## 3. Cloudflare AI Gateway

**What:** Caching, rate limiting, and analytics for AI API calls. Free tier: 100K requests/day.

**Official Docs:** https://developers.cloudflare.com/ai-gateway/

**Integration Files:**
- `backend/wrangler.toml` — `[ai_gateway]` binding
- `backend/src/lib/types.ts` — `AI_GATEWAY` env type

**Usage:** Routes Workers AI calls through the gateway for caching and observability.

---

## 4. Cloudflare D1

**What:** Serverless SQLite at the edge. Used as the read-replica/operational store for agent presence, trust delegations, skill installs, agent memories, and harvest results.

**Official Docs:** https://developers.cloudflare.com/d1/

**Integration Files:**
- `backend/wrangler.toml` — `[[d1_databases]]` binding
- `backend/src/db/d1.ts` — `D1Helper` class with table init and CRUD
- `backend/src/mcp/handler.ts` — memory_read/write/search via D1

**Tables:**
- `harvest_results` — web research results
- `agent_presence` — agent online/offline status
- `trust_delegations` — trust graph edges
- `skill_installs` — skill installation records
- `agent_memories` — agent memory entries (Ghost.build MCP)
- `agents` — agent metadata (memory limit, status)

**Quick Start (for agents):**
```typescript
// In Worker route
const result = await env.DB.prepare("SELECT * FROM agent_memories WHERE agent_id = ?").bind(agentId).all();
```

---

## 5. Cloudflare KV

**What:** Key-value store for caching and rate limiting. Ultra-low latency reads at the edge.

**Official Docs:** https://developers.cloudflare.com/kv/

**Integration Files:**
- `backend/wrangler.toml` — `[[kv_namespaces]]` binding
- `backend/src/db/kv.ts` — `KVHelper` class
- `backend/src/lib/rate-limiter.ts` — rate limiting via KV

---

## 6. Cloudflare Queues

**What:** Message queue for background processing. Used for harvest/research job dispatch.

**Official Docs:** https://developers.cloudflare.com/queues/

**Integration Files:**
- `backend/wrangler.toml` — `[[queues]]` binding
- `backend/src/mcp/handler.ts` — `harvest_query` tool enqueues jobs

---

## 7. Cloudflare Durable Objects

**What:** Stateful objects with single-global-instance semantics. Used for real-time agent presence tracking.

**Official Docs:** https://developers.cloudflare.com/durable-objects/

**Integration Files:**
- `backend/wrangler.toml` — `[[durable_objects]]` binding
- `backend/src/lib/types.ts` — `PRESENCE_DO` type

---

## 8. Cloudflare R2

**What:** S3-compatible object storage. Zero egress fees. Used for storing agent avatars, screenshots, and large blobs.

**Official Docs:** https://developers.cloudflare.com/r2/

---

## 9. Ghost.build (PostgreSQL + TimescaleDB)

**What:** Managed PostgreSQL with TimescaleDB extension. The primary database for AxiomID (via Prisma). TimescaleDB converts the `AgentLog` table into a time-series hypertable for compression and fast analytics.

**Official Docs:**
- Ghost.build: https://ghost.build
- TimescaleDB: https://docs.timescale.com/
- Prisma + TimescaleDB: https://www.prisma.io/docs

**Integration Files:**
- `prisma/schema.prisma` — 26 models, primary schema
- `prisma/migrations/timescaledb_agentlog.sql` — TimescaleDB hypertable activation
- `src/lib/prisma.ts` — Prisma client singleton
- `src/app/api/agent-activity/route.ts` — TimescaleDB aggregate query endpoint
- `backend/src/mcp/handler.ts` — `memory_read`, `memory_write`, `memory_search` tools (Ghost.build MCP)

**TimescaleDB Features Activated:**
- `AgentLog` → hypertable (7-day chunks)
- Compression policy (compress chunks older than 30 days, ~90% storage reduction)
- Continuous aggregate: `agent_activity_daily` (pre-computed daily stats per agent)
- Retention policy (drop raw logs older than 90 days, aggregate kept forever)

**Ghost.build MCP Tools (via `/mcp` endpoint):**
```
memory_read   — Read agent memory entries (by key or recent)
memory_write  — Write memory entry (with auto-eviction at memoryLimit)
memory_search — Search agent memory by text query (ILIKE)
```

**Quick Start (for agents):**
1. Read `prisma/schema.prisma` to understand all 26 models
2. Run `npx prisma migrate dev` to apply schema changes
3. Run the TimescaleDB migration: `npx prisma db execute --file prisma/migrations/timescaledb_agentlog.sql`
4. Query agent activity: `GET /api/agent-activity?days=7&agentId=xxx`
5. MCP memory access: POST to `/mcp` with `memory_read`/`memory_write`/`memory_search`

---

## 10. Here.now (Landing Pages)

**What:** Free static page hosting. AxiomID uses it to generate a public landing page (business card) for each active agent — SEO-friendly, shareable outside the ecosystem.

**Official Docs:** https://here.now

**Integration Files:**
- `src/lib/herenow.ts` — `HereNowClient` (create/upload/finalize/publish)
- `src/lib/agent-landing-page.ts` — `generateAgentLandingHtml()`, `publishAgentLandingPage()`, `publishAllAgentLandingPages()`

**API Surface:**
```typescript
const client = createHereNowClient();
const result = await client.publishPage({
  title: "Agent Name — AxiomID Agent",
  slug: "axiomid-agent-username",
  html: generatedHtml,
});
// Returns: { url: "https://here.now/axiomid-agent-username" }
```

**Env Vars:**
- `HERENOW_API_URL` — API base URL (default: https://api.here.now/v1)
- `HERENOW_TOKEN` — API authentication token

**Quick Start (for agents):**
1. Read `src/lib/agent-landing-page.ts` to see the HTML template
2. Call `publishAgentLandingPage(agentId)` to publish a single agent's page
3. Call `publishAllAgentLandingPages()` in a cron to refresh all pages daily
4. The URL is stored on `UserAgent.hereNowUrl` in the database

---

## 11. Vercel (Hosting + Analytics)

**What:** Next.js hosting with preview deployments, analytics, and speed insights. AxiomID frontend runs on Vercel Hobby (free).

**Official Docs:** https://vercel.com/docs

**Integration Files:**
- `vercel.json` — deployment config
- `next.config.ts` — Next.js config with Sentry + Nostics integration
- `src/app/layout.tsx` — Vercel Analytics + SpeedInsights + Meticulous recorder

**Free Tier Limits:**
- 100 GB bandwidth/month
- 1000 builds/month
- Unlimited static deployments
- Preview deployments for every PR

---

## 12. Sentry (Error Tracking)

**What:** Real-time error tracking and performance monitoring. Free tier: 5K errors/month.

**Official Docs:** https://docs.sentry.io/

**Integration Files:**
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `next.config.ts` — Sentry webpack integration

---

## 13. Meticulous AI (Session Recording)

**What:** AI-powered session recording that generates E2E tests automatically. Records user interactions, then replays them on every PR to catch regressions.

**Official Docs:** https://www.meticulous.ai/

**Integration Files:**
- `src/app/layout.tsx` — recorder script injection via `NEXT_PUBLIC_METICULOUS_TOKEN`

**Env Vars:**
- `NEXT_PUBLIC_METICULOUS_TOKEN` — recording token (only loads when set, for staging/preview)

**Quick Start (for agents):**
1. Set `NEXT_PUBLIC_METICULOUS_TOKEN` in Vercel env vars (preview environment)
2. Deploy to preview
3. Visit the preview deployment and click through key flows
4. Meticulous records the session and auto-generates regression tests
5. On every subsequent PR, Meticulous replays the recording and flags visual/behavioral regressions

---

## 14. Autonoma AI (Agentic E2E Testing)

**What:** Open-source agentic E2E testing platform. AI agents navigate your app end-to-end and catch regressions on every PR. No test code required — describe flows in natural language.

**Official Docs:**
- GitHub: https://github.com/Autonoma-AI/autonoma
- Homepage: https://getautonoma.com

**Integration Files:**
- `src/lib/autonoma.ts` — `createAutonomaClient()`, `AXIOM_TEST_FLOWS`, `runAxiomSmokeTest()`

**NOT an MCP server** — it is a self-hosted E2E testing platform (Docker + PostgreSQL + Redis + Hono/tRPC + Vite/React + Playwright + Appium).

**API Surface:**
```typescript
const client = createAutonomaClient();
const run = await client.createRun({
  url: "https://preview.axiomid.app",
  flow: "Navigate to homepage, verify AxiomID branding, click 'Claim Identity'",
  platform: "web",
  timeoutSeconds: 90,
});
const result = await client.waitForRun(run.id);
// result.status: "passed" | "failed" | "error"
```

**Predefined Test Flows (in `AXIOM_TEST_FLOWS`):**
- `LANDING` — homepage verification
- `CLAIM_FLOW` — identity claim wizard
- `PASSPORT_VIEW` — passport card rendering
- `AGENT_PROFILE` — agent profile page
- `LEADERBOARD` — leaderboard table
- `I18N` — Arabic/English language switching

**Env Vars:**
- `AUTONOMA_API_URL` — self-hosted Autonoma instance URL (default: http://localhost:4000)
- `AUTONOMA_API_KEY` — API key for authentication

**Quick Start (for agents):**
1. Self-host Autonoma: `git clone https://github.com/Autonoma-AI/autonoma && docker compose up -d`
2. Set `AUTONOMA_API_URL` and `AUTONOMA_API_KEY` env vars
3. Read `src/lib/autonoma.ts` to see the client implementation
4. Call `client.runAxiomSmokeTest(previewUrl)` after each Vercel preview deployment
5. Use `AXIOM_TEST_FLOWS` constants for predefined critical-path tests

---

## 15. Nostics (Code Analytics)

**What:** Code analytics and insights from Vercel Labs. Integrated into Next.js config.

**Official Docs:** https://github.com/vercel-labs/nostics

**Integration Files:**
- `next.config.ts` — Nostics plugin

---

## 16. Pi Network (Identity Verification)

**What:** Primary identity verification layer. 35M+ users. Pi username serves as the human-verified anchor for DID creation.

**Official Docs:**
- Developer: https://pi-network.gitbook.io/developer-docs
- Platform: https://minepi.com

**Integration Files:**
- `src/app/api/auth/pi/route.ts` — Pi auth callback
- `src/lib/pi-auth.ts` — Pi Network auth verification
- `prisma/schema.prisma` — `User.piUsername`, `User.piVerified`

**Quick Start (for agents):**
1. User authenticates via Pi Network OAuth
2. AxiomID creates a DID: `did:axiom:axiomid.app:pi:{piUsername}`
3. Trust score starts at 0.1 and grows with activity and delegations
4. Pi verification is the KYA (Know Your Agent) anchor

---

## 17. OpenIdentity Protocol

**What:** A portable identity manifest for AI agents (`openidentity.md`). Combines identity, human verification, roles, skills, MCP tools, A2A metadata, memory discovery links, wallet references, and authorization pointers into one shareable file. Like a "USB descriptor for an AI agent."

**Official Docs:**
- Spec: https://github.com/Moeabdelaziz007/openidentity.md/blob/main/spec/openidentity-v0.1.md
- Schema: https://github.com/Moeabdelaziz007/openidentity.md/blob/main/schema/openidentity.schema.json
- Examples: https://github.com/Moeabdelaziz007/openidentity.md/tree/main/examples

**Integration with AxiomID:**
- AxiomID is the reference implementation for OpenIdentity
- Agent passports can export as `openidentity.md` manifests
- `links.axiom_id` field in OpenIdentity points to AxiomID profiles

**Manifest Structure (YAML frontmatter):**
```yaml
openidentity: "0.1"
identity:
  id: "did:axiom:axiomid.app:pi:username"
  name: "Agent Name"
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
memory:
  working: [{ provider: "ghost-build", uri: "..." }]
  long_term: [{ provider: "ghost-build", uri: "..." }]
wallet:
  did: "did:axiom:..."
  blockchain_address: "eip155:1:0x..."
links:
  axiom_id: "https://axiomid.app/u/username"
```

**Quick Start (for agents):**
1. Read the spec: `spec/openidentity-v0.1.md`
2. Validate manifests with: `schema/openidentity.schema.json`
3. See examples: `examples/minimal.openidentity.md` (smallest) and `examples/openidentity.md` (full)
4. AxiomID agent profiles can generate/export OpenIdentity manifests

---

## 18. MCP Server (Model Context Protocol)

**What:** AxiomID exposes an MCP server at `/mcp` on the Cloudflare Worker. Any MCP-compatible client (Claude, Hermes, OpenCode, etc.) can connect and use AxiomID's trust, identity, and memory tools.

**Official Docs:** https://modelcontextprotocol.io/

**Integration Files:**
- `backend/src/mcp/handler.ts` — full MCP JSON-RPC handler
- `backend/src/mcp/server.ts` — server factory

**Available MCP Tools:**
| Tool | Description |
|---|---|
| `did_resolve` | Resolve a DID to its document |
| `did_create` | Create a new DID from a Pi username |
| `trust_score` | Get trust score for a DID |
| `trust_delegate` | Delegate trust between DIDs |
| `trust_chain` | Resolve trust chain between two DIDs |
| `presence_heartbeat` | Send agent heartbeat (online status) |
| `presence_status` | Get agent presence status |
| `skill_list` | List marketplace skills |
| `skill_install` | Install a skill for a user |
| `harvest_query` | Enqueue a web research query |
| `harvest_result` | Get harvest/research result by job ID |
| `memory_read` | Read agent memory (Ghost.build) |
| `memory_write` | Write agent memory (Ghost.build) |
| `memory_search` | Search agent memory by text |

**Protocol:** JSON-RPC 2.0 over HTTP POST to `/mcp`
**Auth:** `X-Shared-Secret` header (matched against `SHARED_SECRET_TOKEN_VERCEL_CF`)

**Quick Start (for agents):**
```json
POST /mcp
Headers: { "X-Shared-Secret": "your-secret", "Content-Type": "application/json" }
Body: {
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": { "name": "memory_read", "arguments": { "agentId": "xxx" } }
}
```

---

## 19. Playwright (E2E Testing)

**What:** Browser automation for E2E testing. 14 test files covering auth, claim, passport, dashboard, i18n, and mobile.

**Official Docs:** https://playwright.dev/

**Integration Files:**
- `e2e/*.e2e.ts` — 14 test files
- `playwright.config.ts` — configuration

---

## 20. GitHub Actions (CI/CD)

**What:** 14 workflows for CI, quality gates, deployments, and the CI Intelligence Agent.

**Official Docs:** https://docs.github.com/en/actions

**Integration Files:**
- `.github/workflows/*.yml` — 14 workflow files
- `.github/workflows/ci-intelligence.yml` — CI Intelligence Agent (PR diff analysis + anomaly detection + Vectorize indexing)

---

## 21. ACP / EconomyOS

**What:** Agent Commerce Protocol — the operational identity layer for Virtuals Protocol agents. Provides agent wallets, virtual payment cards, swaps, trades, and on-chain actions.

**Official Docs:** Run `acp --help` in terminal for current CLI reference.

**Skills:** Load `acp-cli` skill with `skill_view(name='acp-cli')` for full documentation.

**Usage in AxiomID:**
- AxiomID agents can use ACP for wallet operations, payments, and on-chain identity
- ACP agent wallet is distinct from user's personal wallet
- Use `acp trade` for Hyperliquid perpetual futures trading
- Use `acp swap` for token swaps

---

## 22. DegenClaw (Arena Tracking)

**What:** Degenerate Claw perpetuals trading competition. Used for arena registration, trade tracking, leaderboard, and forum posting.

**Official Docs:** Run `dgclaw --help` in terminal. Load `dgclaw` skill with `skill_view(name='dgclaw')`.

**Usage:** Track completed ACP CLI trades and post rationale to degen.virtuals.io forum. Do NOT use DegenClaw to place trades — use ACP CLI for that.

---

## 23. External Skill Repositories

These are open-source skill collections that AxiomID agents can learn from or integrate as free services:

### Greptile Skills
- **cli-review:** https://github.com/greptileai/skills/tree/main/cli-review — AI-powered CLI code review
- **check-pr:** https://github.com/greptileai/skills/tree/main/check-pr — PR quality checking
- **greploop:** https://github.com/greptileai/skills/tree/main/greploop — iterative codebase search

### Community Skill Collections
- **addyosmani/agent-skills:** https://github.com/addyosmani/agent-skills — curated agent skills
- **mattpocock/skills:** https://github.com/mattpocock/skills — TypeScript-focused skills
- **rebelytics/one-skill-to-rule-them-all:** https://github.com/rebelytics/one-skill-to-rule-them-all — meta-skill patterns
- **Shubhamsaboo/awesome-llm-apps:** https://github.com/Shubhamsaboo/awesome-llm-apps — LLM app examples

### Infrastructure & Frameworks
- **0xPlaygrounds/rig:** https://github.com/0xPlaygrounds/rig — Rust LLM framework for high-performance backends
- **apache/ossie:** https://github.com/apache/ossie — open-source security/identity
- **vercel-labs/nostics:** https://github.com/vercel-labs/nostics — code analytics (already integrated ✓)
- **elder-plinius/CL4R1T4S:** https://github.com/elder-plinius/CL4R1T4S — prompt injection red-teaming

---

*This catalog is maintained alongside the codebase. When adding a new service or integration, add an entry here with the official doc link and integration file paths.*
