# AxiomID — Gemini Project Context

This file provides Gemini CLI with full project context for code review, security analysis, documentation generation, and test creation.

## Project Overview

AxiomID is the Human Authorization Protocol for AI Agents — implementing W3C DIDs, Verifiable Credentials, Trust Scores, and Pi Network integration.

## Architecture

- **Frontend:** Next.js 16 App Router, TypeScript, deployed on Vercel
- **Backend:** Next.js API routes (Vercel Functions), Cloudflare Workers (D1, Vectorize)
- **Auth:** Pi Network SDK authentication + W3C Verifiable Credentials
- **Trust Score:** `XP * 0.5 + stamps * 0.2 + tenure * 0.1 + semantic * 0.2`, clamped 0–100. Default is **0**, never hardcode another value.
- **Soul System:** Muraqabah, Tawbah, Tasbih Triplet, Sab'iyyah Cycle, Barakah Milestones
- **Commit format:** `type(scope): description ۞` (IQRA Chronicle format)

## Key Engineering Rules (from AGENTS.md)

- No `as any` casts in TypeScript. Use `unknown` for external data boundaries.
- Pi SDK is browser-only — gate all calls behind `typeof window !== 'undefined'`.
- Dynamic sandbox detection via `determineSandboxMode()` — never hardcode `sandbox: true/false`.
- All Next.js API routes must have: `requireAuth`, Zod validation, rate limiting, `logger.error()` in catch blocks.
- Bilingual translation helper: `const t = (en, ar) => (language === "en" ? en : ar)`.
- Use standard Jest matchers only (no `.toBeFinite()`).
- Clamp negative zero: `result === 0 ? 0 : result`.
- PWA: network-first for documents, stale-while-revalidate for assets, never cache API routes.
- Prisma migrations must not cause data loss. New columns need indexes if queried frequently.
- Client components need `"use client"` directive. Framer Motion spring easing: `[0.16, 1, 0.3, 1]`.
- Tests: no skipped tests, test count must never decrease, mocks must be cleaned up.

## Directory Structure

```
src/app/          - Next.js App Router pages and API routes
src/lib/          - Core libraries (pi-sdk, errors, validators, diagnostics)
src/components/   - React UI components
prisma/           - Prisma schema and migrations
packages/         - Shared packages (@axiomid/crypto, @axiomid/sdk)
docs/             - Architecture docs, engineering guides, specs
.github/          - CI/CD workflows
```

## Test Suite

- **Framework:** Jest (not Vitest)
- **Test count:** 3,208 test cases across 187 files (verified via grep it/test count, 20 Jul 2026)
- **Run:** `npm test` (Jest with `--runInBand --forceExit`)
- **Type-check:** `npm run type-check` (tsc --noEmit)
- **Lint:** `npm run lint` (ESLint flat config, zero warnings policy)

## Security Checklist for Reviews

1. Auth bypass — missing `requireAuth` on protected routes
2. Zod validation — all API route params and body must be validated
3. Secret leakage — hardcoded keys, or secrets in `NEXT_PUBLIC_*`
4. Pi SDK browser-only — no Pi imports in Server Components or API routes
5. CRON endpoint auth — must validate `CRON_SECRET` before executing
6. Timing attacks — use timing-safe comparison for secrets
7. Rate limiting — all public API endpoints must be rate-limited
8. Trust score integrity — formula must be `XP * 0.5 + stamps * 0.2 + tenure * 0.1 + semantic * 0.2`, clamped 0-100

## CLI Usage Examples

```bash
# Security review of changed files
opencode -p "Review the following diff for security issues per the AxiomID security checklist in GEMINI.md"

# Generate tests for a module
opencode -p "Generate comprehensive Jest unit tests for src/lib/trust.ts covering edge cases"

# Documentation generation
opencode -p "Generate JSDoc comments for all exported functions in the provided file"

# Architecture analysis
opencode -p "Analyze this PR diff against the AxiomID engineering rules in GEMINI.md and list violations"
```

## Metrics

- **Tests:** 3,208 passing across 187 files (verified 20 Jul 2026)
- **Branches:** 8 active (main + 7 feature/PR branches)
