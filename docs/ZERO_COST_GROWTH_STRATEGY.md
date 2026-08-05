# AxiomID Zero-Cost Growth Strategy
# Turn the Amrikky CI Intelligence Agent into a free-tier lead magnet

## 1. The Core Idea

**Package the CI Intelligence Agent as a free GitHub App that anyone can install.**

The agent already works — it extracts PR diffs, detects anomalies (large PRs, security-sensitive files), and indexes code into Cloudflare Vectorize for semantic search. That's a genuinely useful tool for any open-source project.

**The hook:** When a developer installs the GitHub App, they get a free "Agent Passport" on AxiomID with their CI intelligence dashboard. Their agent's activity feeds their Trust Score. They see it. They share it. They want to verify it.

**The funnel:**

```
Developer installs Amrikky CI App (free, 1 click)
  → App analyzes their PRs (immediate value, zero cost to us)
  → App posts a PR comment with a link to their AxiomID passport
  → Developer sees their agent's identity + trust score
  → "Want to verify this agent? Claim your Pi identity →"
  → Developer connects Pi wallet → becomes AxiomID user
  → Agent passport lives at username.axiomid.app
  → Developer shares it → more installs → loop
```

## 2. Why This Is Zero Cost

| Layer | Service | Free Tier | Why It's Enough |
|-------|---------|-----------|-----------------|
| GitHub App | GitHub Apps API | Free, unlimited installs | Webhooks + check runs are free |
| CI intelligence | GitHub Actions (public repos) | Free for public repos | Workflow runs on THEIR repo, not ours |
| Embeddings | Cloudflare Workers AI | 10k neurons/day free | bge-base-en-v1.5 is tiny per request |
| Vector store | Cloudflare Vectorize | 30M dimensions free | ~100k PRs before hitting limit |
| Dashboard | Cloudflare Pages | Free, unlimited | Static SPA, no server cost |
| Agent identity | AxiomID (Vercel) | Hobby free | Already running |
| Auth | Pi Network | Free | No cost to verify humans |
| Notifications | GitHub PR comments | Free | via App API |
| Waitlist/emails | Resend | 3k emails/mo free | Waitlist + onboarding sequence |

**Total monthly cost: $0** until ~10k active users.

## 3. What the Free Service Does (The Gift)

### Tier 1: CI Intelligence (Immediate Value, No Account Needed)

When a developer installs the GitHub App on their repo:

1. **PR Analysis** — Every PR gets an intelligence report:
   - Size anomaly detection (large PRs flagged)
   - Security-sensitive file detection (auth, crypto, secrets touched)
   - File change vectorization (semantic index of code evolution)

2. **PR Comment** — The agent posts a comment on the PR:
   ```
   🔍 CI Intelligence Report by Amrikky
   
   ✅ No anomalies detected
   📊 3 files changed | +47 / -12 lines
   
   View this agent's identity → axiomid.app/agent/amrikky
   ```

3. **Code Search** — Developers can semantically search their PR history:
   - "Show me all PRs that touched auth files"
   - "What changed in the crypto module last month?"
   - Powered by Vectorize, zero cost to us

### Tier 2: Agent Passport (Account Optional)

When the developer clicks the link:

1. **Auto-generated passport** — `username.axiomid.app` shows:
   - Agent name + GitHub username
   - CI activity score (PRs analyzed, anomalies caught)
   - Trust Score (computed from CI activity)
   - Verified badge (pending until Pi wallet connected)

2. **Shareable** — The passport has OG metadata + JSON-LD:
   - Looks great when shared on Twitter/X, Discord, GitHub
   - "My AI agent has a verified identity. Does yours?"

### Tier 3: Human Verification (The Upsell)

When the developer wants the "Verified" badge:

1. **Connect Pi Wallet** — Free, takes 30 seconds in Pi Browser
2. **did:axiom** — They get a decentralized identifier
3. **TrustChain** — Their CI activity is now attested on-chain
4. **SpendRequest** — Their agent can request authorized spending
5. **Marketplace** — They can list their agent's skills

This is where AxiomID revenue kicks in (marketplace fees, premium verification, enterprise SSO).

## 4. Additional Zero-Cost Growth Tactics

### 4.1 OSS Agent Leaderboard (Gamification)

**Build a public leaderboard at `axiomid.app/leaderboard`:**

- Ranks GitHub Apps/bots by CI intelligence score
- Shows most active agents, cleanest PRs, best security posture
- Agents compete for top spots → developers share their rank
- Zero cost: data already in Vectorize, dashboard is static

**Why it works:** Developers love leaderboards. "My CI agent is #3 on AxiomID" is a flex.

### 4.2 "Agent Card" Embeds (Viral Distribution)

**Every agent passport generates an embeddable card:**

```html
<!-- Embed in any GitHub README, blog, or portfolio -->
<iframe src="https://axiomid.app/api/agent/card/amrikky" 
        width="400" height="200" frameborder="0">
</iframe>
```

- Shows: agent name, trust score, verified badge, CI stats
- Developers embed in their GitHub README → free backlinks
- Each embed links back to axiomid.app → SEO + traffic
- Zero cost: it's a static API route

### 4.3 Pi Browser Mini-App (Distribution Channel)

**Register AxiomID as a Pi App:**

- Pi Network has 50M+ users looking for apps to use
- AxiomID becomes a "verify your AI agent" utility app
- Pi users install it, get a passport, share it
- Pi Brain (their AI) → natural integration point
- Zero cost: Pi App registration is free

### 4.4 GitHub Marketplace Listing

**List the Amrikky CI Intelligence Agent on GitHub Marketplace:**

- Category: "Code Quality" or "Security"
- Free tier: PR analysis + intelligence reports
- It shows up when developers search for CI tools
- GitHub Marketplace has built-in discovery
- Zero cost: marketplace listings are free

### 4.5 Resend Waitlist + Drip Campaign

**Email sequence for installers:**

1. **Welcome** — "Your agent is now analyzing PRs. Here's your passport: [link]"
2. **Day 2** — "Your agent caught 3 anomalies this week. See details →"
3. **Day 5** — "Want to verify this agent with your Pi wallet? 30 seconds →"
4. **Day 10** — "Top agents this week on the leaderboard. You're #47 →"
5. **Day 14** — "Your agent can now request authorized spending. Learn more →"

All within Resend's free 3k emails/month.

## 5. Implementation Plan (Priority Order)

### Phase 1: Package the App (Week 1)

1. **Convert `ci-intelligence.yml` to a GitHub App** (not a repo-specific workflow)
   - Create GitHub App via API (`POST /user/apps`)
   - App subscribes to `pull_request` webhook
   - Webhook handler: Cloudflare Worker (free)
   - Worker does: diff extraction + anomaly detection + PR comment

2. **Create Cloudflare Worker** for the webhook:
   ```toml
   # wrangler.toml
   name = "amrikky-ci-agent"
   main = "src/worker.ts"
   compatibility_date = "2026-07-17"
   
   [[vectorize]]
   binding = "VECTORIZE"
   index_name = "ci-code-vectors"
   
   [ai]
   binding = "AI"
   ```

3. **PR comment template** with AxiomID passport link

4. **Publish to GitHub Marketplace** (free listing)

### Phase 2: Agent Passport (Week 2)

5. **Auto-create passport** when app is installed
   - Webhook: `installation.created` → create agent in AxiomID
   - Agent gets `did:axiom` + subdomain `username.axiomid.app`
   - Passport shows CI stats from Vectorize

6. **Embeddable agent card** — `/api/agent/card/:username` returns HTML

7. **OG metadata** on passport pages for social sharing

### Phase 3: Leaderboard + Virality (Week 3)

8. **Public leaderboard** — `axiomid.app/leaderboard`
   - Top agents by CI intelligence score
   - Filter by language, repo, time period
   - Data from Vectorize (zero extra cost)

9. **Weekly digest** — Resend email to all agents with their rank

10. **Pi App registration** — List on Pi Network app directory

### Phase 4: Conversion (Week 4)

11. **Pi wallet verification flow** — passport → "Get Verified" → Pi Browser

12. **SpendRequest demo** — show how verified agents can request spending

13. **Marketplace preview** — "Coming soon: list your agent's skills"

## 6. Architecture (Zero Cost)

```
┌─────────────────────────────────────────────────────────┐
│  Developer's GitHub Repo (THEIR cost, not ours)          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  PR opened → GitHub sends webhook to our App     │   │
│  └────────────────┬─────────────────────────────────┘   │
└───────────────────┼──────────────────────────────────────┘
                    │ webhook
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Worker (free: 100k req/day)                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  1. Fetch PR diff via GitHub API                 │   │
│  │  2. Detect anomalies (large PR, security files)  │   │
│  │  3. Generate embedding via Workers AI (free)     │   │
│  │  4. Store in Vectorize (free: 30M dims)          │   │
│  │  5. Post PR comment with passport link           │   │
│  └────────────────┬─────────────────────────────────┘   │
└───────────────────┼──────────────────────────────────────┘
                    │ passport link
                    ▼
┌─────────────────────────────────────────────────────────┐
│  AxiomID (Vercel Hobby, free)                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  username.axiomid.app → agent passport           │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  Agent Card: name, trust score, CI stats   │  │   │
│  │  │  Verified badge (pending → connect Pi)     │  │   │
│  │  │  Embed code for README                     │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────┼──────────────────────────────────────┘
                    │ "Get Verified"
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Pi Network (free)                                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Connect Pi Wallet → did:axiom → TrustChain      │   │
│  │  Human Authorization enabled                     │   │
│  │  Agent can now request SpendRequests             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 7. Key Metrics to Track

| Metric | Target (Month 1) | Target (Month 3) | How |
|--------|-------------------|-------------------|-----|
| GitHub App installs | 50 | 500 | Marketplace + direct |
| Agent passports created | 50 | 500 | Auto on install |
| Pi wallet verifications | 10 | 100 | "Get Verified" CTA |
| PR comments posted | 500 | 5,000 | Every PR on installed repos |
| Leaderboard views | 200 | 2,000 | Social sharing |
| README embeds | 5 | 50 | Viral distribution |
| Waitlist signups | 100 | 1,000 | Resend landing page |

## 8. Why This Works (The Psychology)

1. **Immediate value before ask** — The CI intelligence report is useful TODAY, with zero signup. No "create account" wall.

2. **Agent identity is novel** — Nobody else gives GitHub bots an identity passport. It's a new concept that generates curiosity.

3. **Social proof through leaderboard** — Developers see other agents ranked. FOMO drives installs.

4. **Pi Network distribution** — 50M Pi users looking for apps. "Verify your AI agent" is a use case they understand.

5. **Embed = free backlinks** — Every README embed is a permanent link to axiomid.app. SEO compounds.

6. **Zero friction** — No credit card, no paid plan, no trial limit. Just install and get value.

## 9. Revenue Path (Later, Not Now)

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | CI intelligence, basic passport, leaderboard |
| Pro | $9/mo | Custom agent branding, advanced analytics, priority indexing |
| Enterprise | Custom | SSO, on-prem Vectorize, SLA, audit trail |
| Marketplace | 5% fee | Agent skill listings, SpendRequest authorization |

**Don't charge until 1,000 verified agents.** Focus on growth first.

## 10. First 3 Concrete Actions

1. **Register the GitHub App** — `amrikky-ci-agent` with `pull_request` + `installation` permissions
2. **Deploy Cloudflare Worker** — webhook handler with diff analysis + Vectorize indexing
3. **Auto-create passport on install** — webhook → AxiomID API → agent created → PR comment with link

---

*The best user acquisition strategy is a free tool that's genuinely useful. The CI Intelligence Agent is that tool.*
