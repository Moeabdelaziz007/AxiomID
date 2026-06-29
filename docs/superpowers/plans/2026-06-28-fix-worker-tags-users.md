# Fix 3 Critical Issues — Worker URL, Tags Seed, Users Honesty

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 3 validated claims: Cloudflare Backend subdomain resolution, empty skill tags on production, and no real users in leaderboard.

**Architecture:** Three independent fixes handled sequentially — each produces a testable, deployable result. Tasks 1 & 2 are code/config fixes. Task 3 is documentation honesty.

**Tech Stack:** Cloudflare Workers (wrangler), Next.js, Prisma, PostgreSQL, Vercel env vars

**Global Constraints:**
- All CI checks must pass before merge (type-check + lint + test)
- Always use PRs — never commit directly to `main`
- Commit message format: `type(scope): description ۞`
- Version consistency: all references match `v0.1.0`
- Only fix what the plan says; no scope creep
- Prefer the simplest fix that works; avoid new dependencies or abstractions

---

### Task 1: Fix Cloudflare Worker Subdomain Resolution

**The Problem:** The bare subdomain `axiomid-backend.workers.dev` does not resolve. The worker IS deployed and fully functional at `axiomid-backend.amrikyy.workers.dev`, but:
1. Any docs/config referencing `axiomid-backend.workers.dev` will fail
2. The `CLOUDFLARE_BACKEND_URL` env var in Vercel might point to the wrong URL
3. The worker needs a stable, documented URL

**The Fix:** Two-part approach:
- Part A: Verify/fix `CLOUDFLARE_BACKEND_URL` env var in Vercel to point to the correct worker URL
- Part B: Set up a custom domain route `backend.axiomid.app` on the worker for a clean, stable URL
- Part C: Update all local references to the correct URL

**Files:**
- Modify: `scripts/ingest_truth.ts` (already uses correct URL — verify)
- Modify: `ZERO_COST_ARCHITECTURE.md` (update any wrong URLs)
- Modify: `backend/wrangler.toml` (add custom domain route)
- Config: Vercel env var `CLOUDFLARE_BACKEND_URL` (set/verify)

**Interfaces:**
- Exposes: Worker at stable URL `https://backend.axiomid.app` (after custom domain configured)

- [ ] **Step 1: Check current Vercel env value**

Run:
```bash
npx vercel env pull --environment production
grep CLOUDFLARE_BACKEND_URL .env.production.local
```

If set to the wrong URL (`axiomid-backend.workers.dev`), proceed to Step 2.
If not set or set to the correct URL (`axiomid-backend.amrikyy.workers.dev`), skip to Step 3.

- [ ] **Step 2: Set correct env var in Vercel**

```bash
npx vercel env add CLOUDFLARE_BACKEND_URL production
# Value: https://axiomid-backend.amrikyy.workers.dev
```

- [ ] **Step 3: Add custom domain route to worker**

Open Cloudflare Dashboard → Workers & Pages → `axiomid-backend` → Triggers → Custom Domains → Add `backend.axiomid.app`

OR via wrangler:

Add to `backend/wrangler.toml`:
```toml
routes = [
  { pattern = "backend.axiomid.app", custom_domain = true }
]
```

Then deploy:
```bash
cd backend && npx wrangler deploy
```

Expected: `https://backend.axiomid.app/` returns `{"status":"ok","timestamp":...}`

- [ ] **Step 4: Update all documentation references**

Search for any remaining wrong URLs:
```bash
grep -rn "axiomid-backend.workers.dev" /Users/cryptojoker710/AxiomID/ --include="*.md" --include="*.ts" --include="*.tsx" --include="*.json"
```

If any found, update to the stable URL `https://backend.axiomid.app`.

- [ ] **Step 5: Verify everything works**

```bash
curl -s https://backend.axiomid.app/
# Expected: {"status":"ok","timestamp":...}

curl -s "https://backend.axiomid.app/api/truth/ask?q=test"
# Expected: RAG response with answers + verses
```

- [ ] **Step 6: Commit**

```bash
git add backend/wrangler.toml scripts/ingest_truth.ts ZERO_COST_ARCHITECTURE.md
git commit -m "fix(backend): add custom domain backend.axiomid.app, fix env var ۞"
```

---

### Task 2: Seed Default Tags on Production Database

**The Problem:** The `20260620_marketplace_tables` migration failed on production with a Prisma P3009 (hash mismatch after we modified the file). The migration's seed INSERT for 8 default tags at the bottom was never applied — `SELECT * FROM "SkillTag"` returns 0 rows.

**The Fix:** A Prisma migration that is safe and additive. Two approaches ordered by simplicity:

**Approach A (preferred — no migration fix needed):** Run the INSERT directly against production via a one-shot script that mirrors the migration's seed SQL. This avoids touching the broken migration.

**Approach B (if Approach A fails):** Fix the broken migration via `prisma migrate resolve` then re-deploy.

Approach A is preferred because:
- Doesn't involve resolving a broken migration (risk of data loss)
- Simple, idempotent, reversible
- Can be run via Vercel Cron or one-off script

**Files:**
- Create: `prisma/seed-tags.ts` — one-shot seed script
- Modify: `prisma/schema.prisma` — (verify SkillTag model exists)
- Config: Add `prisma:seed-tags` script to `package.json`

**Interfaces:**
- Consumes: Prisma `SkillTag` model (exists, verified)
- Produces: 8 rows in `SkillTag` table with idempotent insert

- [ ] **Step 1: Create seed-tags script**

Create `prisma/seed-tags.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TAGS = [
  { id: 'tag_ai', name: 'AI & ML', slug: 'ai-ml', description: 'Artificial intelligence and machine learning skills', color: '#6366f1' },
  { id: 'tag_automation', name: 'Automation', slug: 'automation', description: 'Workflow automation and task scheduling', color: '#3b82f6' },
  { id: 'tag_productivity', name: 'Productivity', slug: 'productivity', description: 'Tools for personal and team productivity', color: '#22c55e' },
  { id: 'tag_data', name: 'Data & Analytics', slug: 'data-analytics', description: 'Data processing, visualization, and analytics', color: '#f59e0b' },
  { id: 'tag_communication', name: 'Communication', slug: 'communication', description: 'Messaging, notifications, and integrations', color: '#ec4899' },
  { id: 'tag_security', name: 'Security', slug: 'security', description: 'Security tools, encryption, and access control', color: '#ef4444' },
  { id: 'tag_web3', name: 'Web3 & Blockchain', slug: 'web3-blockchain', description: 'Decentralized apps, smart contracts, and crypto', color: '#8b5cf6' },
  { id: 'tag_devtools', name: 'Developer Tools', slug: 'devtools', description: 'IDE, CI/CD, debugging, and development utilities', color: '#64748b' },
];

async function main() {
  console.log('Seeding default skill tags...');
  for (const tag of TAGS) {
    await prisma.skillTag.upsert({
      where: { id: tag.id },
      create: tag,
      update: tag,
    });
    console.log(`  ✅ ${tag.name}`);
  }
  console.log(`Done. ${TAGS.length} tags seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

Add to `package.json`:
```json
"prisma:seed-tags": "npx tsx prisma/seed-tags.ts"
```

- [ ] **Step 2: Run seed against production**

Run the seed script:
```bash
npx vercel env pull --environment production
DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d= -f2-) npm run prisma:seed-tags
```

Expected output:
```
Seeding default skill tags...
  ✅ AI & ML
  ✅ Automation
  ✅ Productivity
  ✅ Data & Analytics
  ✅ Communication
  ✅ Security
  ✅ Web3 & Blockchain
  ✅ Developer Tools
Done. 8 tags seeded.
```

- [ ] **Step 3: Verify tags endpoint**

```bash
curl -s https://axiomid.app/api/skills/tags
```

Expected: `{"tags":[{"id":"tag_ai","name":"AI & ML",...},...]}` (8 tags, non-empty)

- [ ] **Step 4: Run locally to ensure it works in dev too**

```bash
npm run prisma:seed-tags
```

Expected: Same output — "8 tags seeded"

- [ ] **Step 5: Commit**

```bash
git add prisma/seed-tags.ts package.json
git commit -m "fix(db): seed default skill tags via upsert script ۞"
```

---

### Task 3: Acknowledge "No Real Users" Honestly

**The Problem:** The leaderboard shows 4 users — all with `piUsername: null`, 0 XP, `Visitor` tier, and two are `demo:` wallet addresses. There are zero real Pi Network users. This is not a code bug — the app is in pre-launch / closed beta.

**The Fix:** Update the README and documentation to honestly state the current state. We already changed the roadmap from "completed" to "active" — now apply the same honesty to the landing page copy and feature claims.

**Files:**
- Modify: `README.md` — Update feature descriptions to indicate "active development" / "in preview"
- Modify: `src/components/ui/RoadmapTimeline.tsx` — Already fixed (verify Phase 1/2 status)

**Interfaces:**
- Consumes: No code changes; only documentation/messaging
- Produces: Honest copy that doesn't claim features that aren't proven in production

- [ ] **Step 1: Audit README for overclaiming**

Read `README.md` lines 35-48 (the "What It Does" feature table). Identify features that claim production readiness:
- "Quran RAG — AI-powered Quranic Q&A..." — ✅ This actually works (verified)
- "Soul System — Five-gate ethical evaluation loop" — ❓ Verify if this is deployed
- "Skills Marketplace — Install capabilities for agents" — ✅ Works (but empty)
- "Agent Passports — Public identity cards..." — ✅ Verified working

- [ ] **Step 2: Update README to add honest context**

Add a "Status" badge or section near the top indicating the project is in **Beta / Preview**:

```markdown
> **⚠️ Beta Notice:** AxiomID is in active development. Features are functional but user-facing data reflects the closed beta phase. [Learn more →](/status)
```

- [ ] **Step 3: Verify leaderboard zero-state handles gracefully**

Check the leaderboard component at `src/app/leaderboard/page.tsx` — does it handle the case where all users are demo accounts? Does it show an empty state or "Be the first to join" message?

If not, add a zero-state banner:
```
If all users have 0 XP and piUsername = null, show:
"🚀 AxiomID is in beta — be the first pioneer to claim your passport."
```

- [ ] **Step 4: Commit**

```bash
git add README.md src/app/leaderboard/page.tsx
git commit -m "docs: add beta notice, honest about user base state ۞"
```

---

## Verification

Run the full verification checklist before marking complete:

```bash
# 1. Worker accessible via custom domain
curl -s https://backend.axiomid.app/ | grep "status.*ok"

# 2. Tags endpoint returns 8 tags
curl -s https://axiomid.app/api/skills/tags | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"tags\"])} tags')"

# 3. Build & lint pass
npm run build && npm run lint

# 4. Tests pass
npm test -- --silent
```
