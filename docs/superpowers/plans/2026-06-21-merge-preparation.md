# AxiomID Merge Preparation Plan

> Generated: 2026-06-21
> PRs: #76 (auth.md + marketplace), #77 (sync + ads + header/footer)

## Executive Summary

Both PRs are feature-rich but have **security blockers** that must be fixed before merge. PR #76 is closer to ready (mostly cleanup). PR #77 has critical auth gaps.

---

## PR #76: Critical Fixes Needed

### P0 — Security (Must Fix)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `src/lib/claim-ceremony.ts:25` | `Math.random()` for user codes — not CSPRNG | Replace with `crypto.randomInt()` |
| 2 | `src/lib/claim-ceremony.ts:14` | `claimStore` Map grows unbounded — memory leak | Add TTL-based cleanup (setInterval every 60s) |
| 3 | `src/lib/auth-tokens.ts:23` | Unsafe fallback secret `"dev-auth-token-secret-..."` | Throw in production if `AUTH_TOKEN_SECRET` missing |
| 4 | `src/lib/sovereign-keys.ts:12,62` | Unsafe fallback salt `"development_fallback_salt_..."` | Already throws in production — OK, but add warning log in dev |
| 5 | `src/app/api/oauth2/revoke/route.ts:6` | `revokedTokens` Set grows unbounded — memory leak | Replace with TTL Map or Upstash Redis |
| 6 | `src/app/api/oauth2/revoke/route.ts:16-35` | No auth check — anyone can revoke any token | Add `requireAuth` + verify token ownership |

### P1 — Code Quality (Should Fix)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 7 | `src/lib/claim-ceremony.ts:64` | `verifyClaimToken` mutates `record.status` — side effect | Remove mutation, let cleanup handle expiry |
| 8 | `src/lib/claim-ceremony.ts:77-88` | Duplicate expiry logic in `confirmClaimToken` | Call `verifyClaimToken` first |
| 9 | `src/lib/auth-tokens.ts:77` | Silent empty scopes default | Validate `scopes` is array, throw if missing |
| 10 | `src/app/api/agent/sign/route.ts:42` | Hardcoded `"axiom-root"` | Extract to named constant |

---

## PR #77: Critical Fixes Needed

### P0 — Security (Must Fix)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 11 | `backend/src/lib/auth.ts:8` | `/api/sync` in PUBLIC_ROUTES → `/api/sync/export` accessible without auth | Change to exact match `/api/sync` only |
| 12 | `backend/src/router.ts` | No `handleSyncExport` in current code (PR adds it) | Ensure export route requires auth |
| 13 | `src/app/api/sync/route.ts:52` | Sync POST requires auth but sync status GET has fallback | Remove cron bypass, use `CRON_SECRET` properly |

### P1 — Code Quality (Should Fix)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 14 | `backend/src/router.ts:63` | `console.error` in Worker | Use structured logging |
| 15 | Both PRs | Duplicate `.github/workflows/loops.yml` | Merge one, delete the other |
| 16 | Both PRs | `.superpowers/` files committed | Add to `.gitignore`, remove from tracked |

---

## Execution Order

### Phase 1: Fix PR #76 (auth.md)
1. Fix `claim-ceremony.ts`: crypto.randomInt, TTL cleanup, remove side effects
2. Fix `auth-tokens.ts`: remove unsafe fallback, validate scopes
3. Fix `revoke/route.ts`: add auth, TTL Map
4. Fix `sign/route.ts`: extract constant
5. Run full test suite
6. Commit + push

### Phase 2: Fix PR #77 (sync/ads)
1. Fix `backend/src/lib/auth.ts`: exact match for `/api/sync`
2. Fix sync export auth
3. Fix Worker logging
4. Run full test suite
5. Commit + push

### Phase 3: Consolidate
1. Pick one PR's loops.yml (PR #76's is more complete)
2. Delete duplicate
3. Clean .superpowers/ from git
4. Update .gitignore

### Phase 4: Final QA
1. Rebase both PRs onto latest main
2. Resolve conflicts
3. Run full build + lint + test
4. Create merge-ready state

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Memory leaks in serverless | HIGH | TTL cleanup for claimStore + revokedTokens |
| Unauthenticated sync export | HIGH | Exact path matching in auth |
| Unsafe dev secrets | MEDIUM | Already throws in production, add warnings |
| PR conflicts between #76 and #77 | MEDIUM | Rebase sequentially, merge #76 first |
