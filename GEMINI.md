# AxiomID — Gemini Project Context

This file provides Gemini CLI with full project context for code review, security analysis, documentation generation, and test creation.

## Project Overview

AxiomID is the Human Authorization Protocol for AI Agents — implementing W3C DIDs, Verifiable Credentials, Trust Scores, and Pi Network integration.

## Architecture

- **Frontend:** Next.js 14 App Router, TypeScript, deployed on Vercel
- **Backend:** Cloudflare Workers (D1 SQLite, KV, R2), Hono framework
- **Auth:** W3C DIDs + Verifiable Credentials + NextAuth
- **Trust Score:** `XP * 0.7 + stamps * 0.3`, clamped 0–100. Default is **0**, never hardcode another value.
- **Soul System:** 5 gates — Muraqabah, Ethical, Sab'iyyah, Tawbah, Self-Review (Barakah gate was removed)
- **Commit format:** `type(scope): description ۞` (IQRA Chronicle format)

## Key Engineering Rules (from AGENTS.md)

- No `any` types in TypeScript. No `eslint-disable` comments.
- No `setTimeout` in API routes — use `waitUntil` for async background work.
- All Next.js API routes must have: `requireAuth`, Zod validation, rate limiting, `logger.error()` in catch blocks.
- All Cloudflare D1 queries must be parameterized — no string interpolation.
- `X-Shared-Secret` header required for Worker-to-Worker auth (timing-safe comparison).
- KV cache TTL must be explicit. CORS headers required on all Worker routes.
- AI calls (soul gates) must have a 5000ms timeout.
- Telegram notification errors must be caught and not crash the soul loop.
- Prisma migrations must not cause data loss. New columns need indexes if queried frequently.
- `src/app/api/daily-review/` CRON endpoints must return 503 if `CRON_SECRET` is not set.
- Client components need `"use client"` directive. Framer Motion spring easing: `[0.16, 1, 0.3, 1]`.
- Tests: no skipped tests, test count must never decrease, mocks must be cleaned up.

## Directory Structure

```
src/app/         - Next.js App Router pages and API routes
src/lib/soul/    - Soul system (5-gate ethical loop)
src/lib/trust.ts - Trust score calculation
src/components/  - React UI components
backend/src/     - Cloudflare Workers (Hono)
prisma/          - Prisma schema and migrations
packages/        - Shared packages / MCP server
docs/            - Architecture docs, specs, plans
.github/         - CI/CD workflows
```

## Security Checklist for Reviews

1. Auth bypass — missing `requireAuth` on protected routes
2. SQL injection — non-parameterized D1 queries
3. Secret leakage — hardcoded keys, or secrets in `NEXT_PUBLIC_*`
4. Trust score integrity — formula must be `XP*0.7 + stamps*0.3`, clamped 0-100
5. CRON endpoint auth — must validate `CRON_SECRET` before executing
6. Timing attacks — use timing-safe comparison for secrets
7. KV cache poisoning — validate data before caching
8. Rate limiting — all public API endpoints must be rate-limited

## Gemini CLI Usage Examples

```bash
# Security review of changed files
gemini -p "Review the following diff for security issues per the AxiomID security checklist in GEMINI.md"

# Generate tests for a module
gemini -p "Generate comprehensive Vitest unit tests for src/lib/trust.ts covering edge cases"

# Documentation generation
gemini -p "Generate JSDoc comments for all exported functions in the provided file"

# Architecture analysis
gemini -p "Analyze this PR diff against the AxiomID engineering rules in GEMINI.md and list violations"
```

## Active Issues (v0.1.2)

- MCP Bootstrap Agent Startup Flow
- VS Code / Cursor Extension for AxiomID
- MCP Server Tools + IDE Integration

## Metrics Targets

- Code acceptance rate: >60%
- Human review rate for PRs: <20%
- Auto-rolled-back deploys: <2%
