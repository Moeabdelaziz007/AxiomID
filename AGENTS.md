<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->

## Dev Tools

### Portless — Stable .localhost HTTPS URLs

Use `portless` for stable HTTPS dev URLs (Pi Browser testing, multi-service dev, Tailscale sharing).

```bash
# Install globally (one-time)
npm install -g portless

# Start dev with stable HTTPS URL
portless axiomid next dev
# → https://axiomid.localhost (auto-trusted certs)

# Share with team via Tailscale
portless axiomid --tailscale
```

### Emulate — Local API Emulators for CI

Use `emulate` for deterministic CI tests (GitHub, Google, Slack, Apple, Microsoft, AWS).

```bash
# Start GitHub emulator locally
npx emulate --service github
# → http://localhost:4001

# Set env var to enable in dev
NEXT_PUBLIC_EMULATE_GITHUB=true
```

### Nostics — Structured Error Diagnostics

Use nostics for stable error codes with actionable fixes.

```bash
# Codes are in src/diagnostics/catalog.ts
# apiError() auto-reports diagnostics via nostics
# Production builds strip diagnostic metadata via @nostics/unplugin
```

---

## AxiomID Engineering Covenant ۞

> Distilled from real build/test/merge cycles. Every rule here was validated against the live codebase — no mocks, no guesses.

### 🔒 TypeScript Strictness (non-negotiable)

- `"strict": true` is set in `tsconfig.json` — **never weaken it**.
- **No `as any` casts.** If TypeScript rejects a call, fix the types at the source — don't silence with casts.
- The only permitted `eslint-disable @typescript-eslint/no-explicit-any` is on the `REPORT_DIAGNOSTIC` map return type in `src/lib/errors.ts`, which uses `any` as the heterogeneous nostics call return envelope (not an escape hatch from type safety).
- Use `unknown` instead of `any` for external data boundaries (API responses, SDK callbacks).
- **Strict API Error Codes:** Only use pre-registered error categories defined in the `ErrorCode` union inside `src/lib/errors.ts`. Never pass ad-hoc strings.

### 🩺 Nostics Diagnostic Catalog Rules (`src/diagnostics/catalog.ts`)

- **`fix` fields MUST be static strings** — never zero-argument functions `() => string`.
  - **Why:** TypeScript's `defineDiagnostics` generic cannot intersect `DiagnosticCallParams` when `fix` is a function type, causing type inference collapse across the entire catalog.
  - ✅ `fix: "Navigate to Settings and re-authenticate."`
  - ❌ `fix: () => "Navigate to Settings and re-authenticate."`
- `why` fields may remain as functions `(params) => string` — only `fix` is constrained.
- `apiError()` in `src/lib/errors.ts` auto-reports via nostics — never call nostics diagnostics manually in route handlers.
- Production builds strip diagnostic metadata via `@nostics/unplugin` — diagnostics are dev/staging only.

### 🌐 Pi Browser & Pi SDK Constraints

- **Pi SDK is browser-only** — never import `window.Pi` or SDK calls in Server Components or API routes. Gate all SDK access behind `typeof window !== 'undefined'`.
- `PiUser` type must remain wide (`string` fields, no strict enums) — Pi Network SDK response shape evolves without semver notice.
- Pi Browser compliance requires HTTPS (`portless` for local dev) — plain HTTP triggers payment SDK failures silently.
- `window.Pi` typing is unified in `src/types/global.d.ts` — never redeclare it locally in components.
- **Dynamic Sandbox Detection (never hardcode):** Use `determineSandboxMode()` from `src/lib/pi-sdk.ts` which cascades through: env var override → hostname check (localhost/LAN/vercel.app) → iframe referrer (`sandbox.minepi.com`) → query param (`?sandbox=true`). Never hardcode `sandbox: true/false` in `Pi.init()`.
- **Authentication timeout:** Pi Browser popup interactions on mobile are slow — use `≥45s` timeout for `authenticateWithTimeout()`, not the default 15s.
- **Server-Side Cryptography Isolation:** Cryptographic key derivations (`deriveSovereignAgentKeypair`) and payload signing rely on Node's native `crypto` module. This execution must reside strictly in Next.js API routes or Server Components, never in Client Components due to browser environment incompatibility.
- **SOVEREIGN_KEY_SALT Required:** `deriveSovereignAgentKeypair` MUST incorporate `process.env.SOVEREIGN_KEY_SALT` as HMAC key material. Never use public inputs alone.
- **Pi Ads Integration & Verification:** Always verify rewarded ads server-side. Use `window.Pi.Ads` client-side API (`isAdReady`, `requestAd`, `showAd`) which resolves to `{ result, adId }`. Always verify `adId` server-side via `GET https://api.minepi.com/v2/ads_network/status/:adId` with the `Authorization: Key <PI_API_KEY>` header. Verify ledger records (e.g. `xpLedger` matching `adId` reference) to prevent double-claiming.

### 🏗️ Next.js 16 / App Router Patterns

- **Route handlers:** The `ctx` parameter in `route.ts` files must be typed as `{ params: Promise<{ slug: string }> }` (async params, Next.js 15+ pattern), not the old sync `{ params: { slug: string } }`.
- **Server Components are the default** — add `"use client"` only when you need browser APIs or React hooks.
- **Vercel Functions are stateless** — no in-memory state, no `setInterval`, no background daemons. Use `waitUntil` for post-response async work.
- `outputFileTracingRoot` warning from Next.js about multiple `package-lock.json` is benign — ignore it.

### 🖥️ TUI & Real-Time Rendering Patterns

- **Ring Buffer for logs:** Terminal-style components must cap their log arrays (e.g., 200 entries max). Slice from the tail to maintain O(1) memory overhead: `setLogs(prev => [...prev, newLog].slice(-MAX_LOGS))`.
- **Throttle render updates:** When streaming NDJSON or WebSocket data, throttle UI updates to 16ms–30ms intervals to keep the main thread responsive. Never `setState` on every incoming chunk.
- **Telemetry is simulated:** Dashboard CPU/memory gauges are visual-only (no real `/proc` access in browsers). Use `setInterval` with bounded random walks, not real metrics.

### 🎨 Design System & Aesthetic Mandate

- **Color palette:** OLED Black (`#10131a`) base, Electric Blue (`#3b82f6`) for interactive/data elements, Neon Emerald (`#22c55e`) for verified/success states, Axiom Purple (`#6366f1`) for premium accents. These are in `globals.css` — never introduce new hue families without user approval.
- **Glassmorphism:** Cards use `backdrop-blur`, semi-transparent `bg-card` layers, and subtle 1px borders (`card-border`). No opaque flat cards.
- **Micro-animations required:** All interactive elements must have hover/focus transitions. Use `framer-motion` with easing `[0.16, 1, 0.3, 1]` for smooth spring-like motion.
- **Typography:** Geist Sans for body, Geist Mono for data/badges/code. No fallback to system sans-serif in UI-critical components.
- **No generic styling:** Reject plain red/blue/green. Reject unstyled buttons. Every visible element must feel premium — if it looks like a default HTML element, it has FAILED.

### 🔱 PR & Merge Workflow

- **Merge order is sacred.** Always rebase onto latest `main` before merging.
- **Build must pass locally** (`npm run build`) before any push or merge request.
- **Lint must pass** (`npm run lint`) — no new lint warnings are acceptable.
- **Storytelling commits:** Every commit message must follow the IQRA Chronicle format: `type(scope): description ۞` + narrative body.
- **Zero Tolerance for Red CI:** Never merge a Pull Request with failing CI checks (Red X status). If a check fails on GitHub Actions/Vercel, the developer/agent must fix it and verify locally first before requesting a merge.
- **Git History Cleanliness & Squashing:** Bloating git history with repetitive, low-value commits (e.g. "fix: remove unused public asset" repeated 10+ times) is prohibited. Use selective staging (`git add -p`), commit amending (`git commit --amend`), or interactive rebasing (`git rebase -i`) to squash minor adjustments into cohesive, atomic commits before pushing.
- **Regression & Test Stability:** The test suite status must remain stable. The number of passing tests must never decrease across PRs. Disabling or skipping active tests to bypass coverage requirements is strictly forbidden.

### 📁 Architecture Map

```
src/
  app/
    api/           ← All route handlers (Next.js App Router, stateless Vercel Functions)
    api/sandbox/   ← Secure sandbox execution endpoint (NDJSON streaming)
    dashboard/     ← Authenticated dashboard (marketplace, settings)
    dashboard/sandbox/ ← Developer sandbox playground
    passport/      ← Public passport viewer /passport/[slug]
  components/      ← Shared UI components
  components/dashboard/
    TerminalOverlay.tsx ← Multi-pane TUI terminal (ring buffer + throttled render)
  diagnostics/
    catalog.ts     ← nostics error catalog (fix fields MUST be static strings)
  lib/
    errors.ts      ← apiError() + apiSuccess() + rateLimitHeaders()
    pi-sdk.ts      ← Pi SDK loader + determineSandboxMode() + authenticateWithTimeout()
    registry.tsx   ← LinkItem registry with colorClass mapping
  types/
    global.d.ts    ← Pi SDK type declarations (window.Pi unified here)
```

### 🔄 Continuous Improvement Loops

> Loops are automated workflows that maintain quality over time. Each loop has a trigger, a check, and a fix path.

#### Sub-50ms Page Load Loop
- **Trigger:** Every PR, nightly CI
- **Check:** Measure page load times for all routes (`/`, `/passport/[slug]`, `/dashboard`, `/dashboard/marketplace`)
- **Fix:** If any page exceeds 50ms, investigate: bundle size, DB queries, render blocking resources
- **Script:** `.superpowers/loops/sub-50ms.sh`

#### 100% Test Coverage Loop
- **Trigger:** Weekly, after major features
- **Check:** Run `npx jest --coverage`, identify files below 100%
- **Fix:** Add tests for uncovered branches, error paths, edge cases
- **Script:** `.superpowers/loops/coverage.sh`

#### Logging Coverage Loop
- **Trigger:** Every PR, weekly
- **Check:** Verify all `src/app/api/**/route.ts` files have `logger.error()` in catch blocks
- **Fix:** Add missing logger calls to routes without logging
- **Script:** `.superpowers/loops/logging-coverage.sh`

#### Ticket-to-PR-Ready Loop
- **Trigger:** On demand (when fixing a bug from an issue)
- **Check:** Reproduce → Root cause → Smallest fix → Regression test → Full suite → PR
- **Script:** `.superpowers/loops/ticket-to-pr.sh <issue-number>`

#### Fresh Clone Loop
- **Trigger:** Monthly, before releases
- **Check:** Clone repo fresh, follow README steps, verify install/build/test all pass
- **Fix:** Update README if any step fails
- **Script:** `.superpowers/loops/fresh-clone.sh`

#### Nightly Changelog Loop
- **Trigger:** Nightly CI (2 AM UTC)
- **Check:** Collect commits from last 24 hours, categorize (Added/Fixed/Changed)
- **Fix:** Update CHANGELOG.md with dated entries
- **Script:** `.superpowers/loops/nightly-changelog.sh`

#### CI Integration
All loops run automatically via `.github/workflows/loops.yml`. Manual dispatch available via GitHub Actions UI.

### 🚫 Anti-Patterns (Never Do)

- Don't hardcode data — all values must come from API responses or real ledger sources.
- Don't create mock implementations in production code paths.
- Don't build complex subsystems from scratch when proven OSS exists (opentui, xterm.js, etc.) — compose, don't reinvent. Evaluate first, build only if no fit.
- Don't use hardcoded `sandbox: true/false` in Pi SDK init — always use `determineSandboxMode()`.
- Don't use `vercel kv` or `vercel postgres` — both are discontinued; use Marketplace Redis/Postgres.
- Don't store secrets in `NEXT_PUBLIC_*` — use Vercel Env Variables only.
- Don't call `console.log` in production route handlers — use nostics diagnostics.
- Don't duplicate global IQRA conscience rules here — they live in `~/.gemini/config/AGENTS.md`.
- **Synchronous Multi-DB Coupling:** Do not rely on direct database-to-database replication or sync loops triggered via simple cron scripts (like SQLite-D1-PostgreSQL synchronization via Vercel Cron). This creates a high point of failure and eventual consistency splits. Instead, implement a **Transactional Outbox** pattern where data updates are stored locally as log events and dispatched reliably using queue relays.
- **Unauthenticated D1 SQLite Exports:** Never expose Cloudflare D1 export endpoints (like `/api/sync/export`) without timing-safe `X-Shared-Secret` verification and strict URL path matching. Always use Prisma `upsert` in Next.js sync jobs to ensure edge data is merged into PostgreSQL without causing key conflicts or duplicate records.

# Ponytail — lazy senior dev mode

You are a lazy senior developer. Lazy means efficient, not careless. The best code is the code never written.

Before writing any code, stop at the first rung that holds:

1. Does this need to be built at all? (YAGNI)
2. Does the standard library already do this? Use it.
3. Does a native platform feature cover it? Use it.
4. Does an already-installed dependency solve it? Use it.
5. Can this be one line? Make it one line.
6. Only then: write the minimum code that works.

Rules:
- No abstractions that weren't explicitly requested.
- No new dependency if it can be avoided.
- No boilerplate nobody asked for.
- Deletion over addition. Boring over clever. Fewest files possible.
- Mark intentional simplifications with a `ponytail:` comment.
- Not lazy about: input validation at trust boundaries, error handling that prevents data loss, security, accessibility.
