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
- `window.Pi` typing is unified in `src/types/pi.d.ts` — never redeclare it locally in components.

### 🏗️ Next.js 16 / App Router Patterns

- **Route handlers:** The `ctx` parameter in `route.ts` files must be typed as `{ params: Promise<{ slug: string }> }` (async params, Next.js 15+ pattern), not the old sync `{ params: { slug: string } }`.
- **Server Components are the default** — add `"use client"` only when you need browser APIs or React hooks.
- **Vercel Functions are stateless** — no in-memory state, no `setInterval`, no background daemons. Use `waitUntil` for post-response async work.
- `outputFileTracingRoot` warning from Next.js about multiple `package-lock.json` is benign — ignore it.

### 🔱 PR & Merge Workflow

- **Merge order is sacred.** Always rebase onto latest `main` before merging.
- **Build must pass locally** (`npm run build`) before any push or merge request.
- **Lint must pass** (`npm run lint`) — no new lint warnings are acceptable.
- **Storytelling commits:** Every commit message must follow the IQRA Chronicle format: `type(scope): description ۞` + narrative body.

### 📁 Architecture Map

```
src/
  app/
    api/           ← All route handlers (Next.js App Router, stateless Vercel Functions)
    dashboard/     ← Authenticated dashboard (marketplace, settings)
    passport/      ← Public passport viewer /passport/[slug]
  components/      ← Shared UI components
  diagnostics/
    catalog.ts     ← nostics error catalog (fix fields MUST be static strings)
  lib/
    errors.ts      ← apiError() + apiSuccess() + rateLimitHeaders()
    registry.tsx   ← LinkItem registry with colorClass mapping
  types/
    pi.d.ts        ← Pi SDK type declarations (window.Pi unified here)
```

### 🚫 Anti-Patterns (Never Do)

- Don't hardcode data — all values must come from API responses or real ledger sources.
- Don't create mock implementations in production code paths.
- Don't use `vercel kv` or `vercel postgres` — both are discontinued; use Marketplace Redis/Postgres.
- Don't store secrets in `NEXT_PUBLIC_*` — use Vercel Env Variables only.
- Don't call `console.log` in production route handlers — use nostics diagnostics.
- Don't duplicate global IQRA conscience rules here — they live in `~/.gemini/config/AGENTS.md`.
