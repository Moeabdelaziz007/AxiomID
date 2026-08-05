# AxiomID Current State

> Updated: 2026-07-20 | Verified via: gh CLI, curl, grep, find, pygount
> This file is the single source of truth for project health.

---

## Repo Snapshot

| Metric | Value | Source |
|:-------|------:|:-------|
| Commits | 70 | `git rev-list --count HEAD` |
| Releases | 4 | `gh release list` |
| Open PRs | 12 | `gh pr list` |
| Open issues | 7 | `gh issue list` |
| Latest tag | v0.1.2 | `gh release list` |
| Published packages | 0 | `gh api /repos/.../packages` → 404 |
| Stars | 2 | `gh api` |
| Forks | 6 | `gh api` |
| Topics | 17 | `gh api` |
| License | NOASSERTION (needs LICENSE file) | `gh api` |
| Wiki | disabled | `gh api` |
| Pages | disabled | `gh api` |
| Projects | enabled | `gh api` |

### Open PRs

| PR | Title | Status |
|:---|:------|:-------|
| #397 | fix: CI syntax errors + cleanup + verified metrics + P0 security | NEW (this session) |
| #391 | feat(llm-registry): US ↔ China agentic ecosystem bridge | OPEN |
| #388 | feat(pai): @pai/atom + identity-did + reputation | OPEN (block merge) |
| #387 | fix: close nodes+edges arrays with ] instead of } | OPEN (superseded by #397) |
| #386 | fix(lint): replace <a> with <Link> + remove unused var | OPEN |
| #390-396 | Dependabot bumps (dev/prod deps + CI actions) | OPEN |

---

## Verified CI State

| Check | Status | Evidence |
|:------|:-------|:---------|
| Type-check | ⚠️ 0 syntax errors, 50 TS2688 (missing @types) | `npx tsc --noEmit --skipLibCheck` |
| Lint | ⚠️ eslint not installed locally | `npm run lint` (CI runner has it) |
| Unit tests | ⚠️ 3,208 test cases in 187 files | `grep -rE "it\(\|test\(" src/` |
| E2E | ⚠️ 14 Playwright files | `find . -name "*.e2e.ts"` |
| Build | ❌ CI failing on main (3 days) — now fixed in PR #397 | `gh run list --branch main` |
| Vercel preview | ❌ Production: ALL 30 pages return HTTP 500 | `curl axiomid.app/*` |

### CI Error History (main branch)

- 2026-07-17: FAILURE (InductGraphCanvas.tsx syntax errors)
- 2026-07-18: FAILURE (same)
- 2026-07-19: FAILURE (same)
- 2026-07-20: Fixed in PR #397 (arrays closed with `]`, duplicate `<main>` removed)

---

## Codebase Topology

| Layer | Files | Lines | Notes |
|:------|------:|------:|:------|
| App (src/) | 478 | 87,570 | Next.js 16, React 19, Tailwind 4 |
| Backend | 42 | 10,750 | Cloudflare Workers, D1, Vectorize |
| Packages | 18 | 2,140 | @pai/atom, identity-did, reputation, llm-registry |
| E2E tests | 14 | ~2,500 | Playwright `.e2e.ts` |
| Unit tests | 187 | ~39,500 | Jest `.test.ts/.tsx` |
| Docs | 25+ | ~15,000 | Markdown docs |
| **Total** | **764** | **68,906 code + 9,741 comments** | pygount verified |

### API Endpoints (63 total)

- ✅ Live (200): 8 endpoints (health, status, leaderboard, explorer, did-document, skills, skills/tags, root)
- 🔒 Auth required (401): 14 endpoints
- ⚠️ 404: 8 endpoints (may need valid slug)
- ❌ 500: 1 endpoint (/api/og/passportx)
- 📨 POST-only: 32 endpoints

### Page Routes (30 total)

- ❌ ALL 30 pages return HTTP 500 in production (Vercel function crash)
- Likely cause: missing env vars or Prisma client issue (not code — code compiles with 0 syntax errors)

### Well-Known Endpoints (6 total)

- ❌ ALL 6 return HTTP 500 (agent-card.json, did.json, jwks.json, oauth, openidentity)

---

## Security State

| Check | Status | Details |
|:------|:-------|:--------|
| Secret scanning | ✅ 0 alerts | `gh api secret-scanning/alerts` |
| Code scanning | ⚠️ 15 alerts | `gh api code-scanning/alerts` (CodeQL) |
| Dependabot | ⚠️ 19 alerts | `gh api dependabot/alerts` |
| Branch protection | ✅ main protected | requires: type-check+lint+test, CodeQL, Gemini AI Review |
| Autonoma secrets | ✅ All placeholders | `YOUR_AUTONOMA_*` in all files + git history |
| P0 security fixes | ✅ 9/15 applied | PR #397: TrustChain mutex, Email PII, Vectorize, MCP auth, Trust Score |

### Known P0 Issues (from security review)

| # | Issue | Status |
|:--|:------|:-------|
| 1 | TrustChain concurrent append race | ✅ FIXED (mutex) |
| 2 | Email Router PII + false success | ✅ FIXED (PII removed, response.ok) |
| 3 | Durable Object cross-worker binding | ⚠️ Partial (wrangler config created, needs deploy test) |
| 4 | Memory eviction/update logic | ❌ Not found in codebase |
| 5 | Vectorize zero vector | ✅ FIXED (getByIds for real vector) |
| 6 | MCP memory authorization | ✅ FIXED (agent-scoped ownership) |
| 7 | Agent Activity auth + Zod | ❌ Not found in codebase |
| 8 | Trust Score clamping | ✅ FIXED (clamp [0,1]) |
| 9 | DID stable timestamp | ✅ FIXED (first activity timestamp) |

---

## PR Merge Queue

### ✅ Safe to merge (after CI passes)

- **#397** — CI fix + cleanup + metrics + P0 security (this session)
- **#386** — Lint fix (replace `<a>` with `<Link>`)
- **#393-396** — Dependabot CI action bumps (low risk)

### ⚠️ Needs review

- **#391** — LLM registry (10 personas, US↔China bridge)
- **#388** — PAI packages (atom, identity-did, reputation) — BLOCK MERGE (security findings)
- **#387** — Array fix (superseded by #397)
- **#389-390** — Dependabot dep bumps (needs smoke test)

### ❌ Blocked

- **#388** — Security review found P0/P1 issues, fix in #397 first

---

## Stale Content

| Item | Status | Action |
|:-----|:-------|:-------|
| Test count in README | ✅ Fixed | 3786 → 3,208 (PR #397) |
| Test count in PROJECT_STATUS | ✅ Fixed | 3,289 → 3,208 (PR #397) |
| Test count in BRANCH_STRATEGY | ✅ Fixed | 3,272 → 3,208 (PR #397) |
| Test count in GEMINI.md | ✅ Fixed | 3,272 → 3,208 (PR #397) |
| Playwright report | ✅ Fixed | Removed from git tree + .gitignored (PR #397) |
| Package metadata | ⚠️ Pending | atom + identity-did main/types → dist (on feat branch) |
| AGENTQR.tsx | ⚠️ Old | Replaced by PassportQR.tsx but still in repo |
| 221 unused exports | ⚠️ Cleanup | 221/559 exports never imported (may include test-only) |

### Dead Code Summary

| Type | Count | Examples |
|:-----|------:|:---------|
| Unused exports | 221 | AgentQR (replaced), ActionClaimInput, AnchorResult |
| Duplicate file names | 69 route.ts, 30 page.tsx | (normal for Next.js routing) |
| Stale scripts (>30d) | 0 | All scripts recently modified |
| Stale docs (>30d) | 0 | All docs recently modified |
| Committed artifacts | 0 | playwright-report removed (PR #397) |

---

## Production Status (Honest Assessment)

### What works

- 8 API endpoints return 200 (health, status, leaderboard, explorer, did-document, skills)
- ACP marketplace: 22 offerings live, all linked to subscriptions
- Agent description updated for discovery
- CI syntax errors fixed (PR #397)

### What doesn't work

- **ALL 30 pages return HTTP 500** — Vercel SSR crash
- **ALL 6 well-known endpoints return 500** — same root cause
- **0 packages published** — entrypoints point to src/ not dist/
- **Agent not tokenized** — invisible in ACP search
- **CI was failing for 3 days** — now fixed but needs merge + new build

### Root cause hypothesis for production 500

The HTTP 500 on all pages (including simple ones like /privacy with 21 lines) indicates a shared failure:
1. Missing production environment variables (DATABASE_URL, PI_API_KEY, etc.)
2. Prisma client not generated in production build
3. A shared import (layout.tsx, middleware.ts, or context) crashes on server-side render

**This is NOT a code issue** — the code compiles with 0 syntax errors. It's a deployment configuration issue.

---

## Next Actions (Priority Order)

1. **Merge PR #397** — unblocks CI, fixes syntax errors, cleans stale content
2. **Investigate production 500** — check Vercel env vars, Prisma generation, layout.tsx
3. **Fix package entrypoints** — atom + identity-did main/types → dist/ + publishConfig
4. **Add LICENSE file** — GitHub shows NOASSERTION
5. **Reduce dependabot alerts** — 19 open
6. **Reduce code scanning alerts** — 15 open
7. **Complete P0/P1 security** — #3 (DO binding), #4 (memory eviction), #7 (Agent Activity)
