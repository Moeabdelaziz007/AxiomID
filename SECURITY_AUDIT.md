# Security Audit Report

**Date:** 2026-06-22
**Scope:** API routes (`src/app/api/`, `backend/src/`)

---

## 1. Math.random() — FIXED

### `backend/src/lib/utils.ts:10` — ID Generation (CRITICAL)

**Before:** `Math.random().toString(36).slice(2, 8)` — predictable IDs
**After:** `crypto.getRandomValues(new Uint8Array(4))` — CSPRNG

This was the **only** `Math.random()` in security-relevant code. Other occurrences:

| File | Line | Context | Risk |
|------|------|---------|------|
| `src/lib/math-physics.ts` | 97 | Exponential backoff jitter | LOW (not security) |
| `src/components/dashboard/TerminalOverlay.tsx` | 28-29 | Simulated CPU/memory gauges | NONE (visual only) |
| `backend/src/lib/math-physics.ts` | 183, 314-315, 755-756, 854, 884, 1334, 1568-1569, 1723, 1736, 1755 | Math algorithms (Box-Muller, simulated annealing, etc.) | LOW (non-security math) |

**Verdict:** Only `backend/src/lib/utils.ts:10` was security-relevant. **FIXED.**

---

## 2. Zod Validation — Status

| Route | Status | Notes |
|-------|--------|-------|
| `src/app/api/skills/[slug]/purchase/route.ts` | N/A | No request body parsed — uses URL params + auth only |
| `src/app/api/skills/[slug]/install/route.ts` | N/A | No request body parsed — uses URL params + auth only |
| `src/app/api/skills/[slug]/review/route.ts` | ALREADY VALIDATED | `SkillReviewCreateSchema` + `SlugParamSchema` |
| `src/app/api/agent/route.ts` | ALREADY VALIDATED | `CreateAgentSchema` |
| `src/app/api/agent/manifest/route.ts` | N/A | GET-only, no request body |
| `src/app/api/settings/route.ts` | DOES NOT EXIST | Route not found in codebase |

**No additional Zod schemas needed** — the routes that accept user input already validate it. The purchase/install routes only use URL params and authenticated user context.

---

## 3. Payment Gate Status — HIGH RISK

### `src/app/api/skills/[slug]/purchase/route.ts:37-48`

**Finding:** The purchase route creates a `PENDING` PiPayment record but **never verifies actual payment** before granting access.

```typescript
// TODO: Integrate with Pi Payment SDK (create payment intent and return ID)
const payment = await prisma.piPayment.create({
  data: {
    status: 'PENDING',  // ← Never transitions to COMPLETED via server
  },
});
```

**What's missing:**
- No server-side call to `POST https://api.minepi.com/v2/payments` to approve the payment
- No `paymentId` from Pi SDK passed in the request body
- No verification that the user actually paid before the skill is considered "purchased"
- The `install/route.ts` checks `skill.pricePi` but doesn't verify payment status before installation

**Impact:** Users can install paid skills without paying by directly calling `/install` after creating a pending payment record.

**Recommendation:** Add Pi Payment SDK approval flow:
1. Client calls Pi SDK `Pi.createPayment()` → gets `paymentId`
2. Client sends `paymentId` to `POST /api/skills/[slug]/purchase`
3. Server calls `POST https://api.minepi.com/v2/payments/{paymentId}/approve` with `X-Shared-Secret`
4. Only then mark payment as `APPROVED` and allow installation

---

## 4. Auth Coverage — AUDIT

### Routes WITH `requireAuth` (34 handlers) ✅

All user-data routes properly call `requireAuth()`:

- `api/skills/[slug]/purchase/route.ts` — POST ✅
- `api/skills/[slug]/install/route.ts` — POST, DELETE ✅
- `api/skills/[slug]/review/route.ts` — POST ✅
- `api/skills/[slug]/route.ts` — PATCH, DELETE ✅
- `api/skills/[slug]/tags/route.ts` — PUT ✅
- `api/skills/route.ts` — POST ✅
- `api/agent/route.ts` — POST ✅
- `api/agent/manifest/route.ts` — GET ✅
- `api/agent/sign/route.ts` — POST ✅
- `api/agent/main/route.ts` — POST ✅
- `api/agent/pause/route.ts` — POST ✅
- `api/agent/activate/route.ts` — POST ✅
- `api/admin/skills/route.ts` — POST ✅
- `api/admin/skills/[id]/route.ts` — POST ✅
- `api/sandbox/execute/route.ts` — POST ✅
- `api/passport/[slug]/publish/route.ts` — POST ✅
- `api/pi/ads/verify/route.ts` — POST ✅
- `api/pi/kya/claim/route.ts` — POST ✅
- `api/pi/payment/complete/route.ts` — POST ✅
- `api/pi/payment/approve/route.ts` — POST ✅
- `api/marketplace/order/create/route.ts` — POST ✅
- `api/marketplace/order/refund/route.ts` — POST ✅ (via `validateEscrowAction`)
- `api/marketplace/order/release/route.ts` — POST ✅ (via `validateEscrowAction`)
- `api/auth/logout/route.ts` — POST ✅
- `api/presence/heartbeat/route.ts` — POST ✅
- `api/agents/harvest/route.ts` — POST ✅
- `api/upload/presign/route.ts` — POST ✅
- `api/stamp/route.ts` — GET ✅
- `api/stamp/claim/route.ts` — POST ✅
- `api/user/status/route.ts` — GET ✅
- `api/sync/route.ts` — POST ✅
- `api/oauth2/revoke/route.ts` — POST ✅

### Routes WITHOUT `requireAuth` (by design) ✅

These are auth-flow endpoints that don't require prior authentication:

| Route | Reason |
|-------|--------|
| `api/auth/pi/route.ts` | Pi token exchange (is the auth mechanism itself) |
| `api/auth/state/route.ts` | OAuth state generation (pre-auth) |
| `api/auth/connect/route.ts` | Wallet connection (pre-auth, uses CSRF state) |
| `api/oauth2/token/route.ts` | Token exchange (is the auth mechanism itself) |
| `api/agent/identity/route.ts` | Identity assertion/claim flow |
| `api/agent/identity/claim/route.ts` | Claim status check |

**Verdict:** No missing auth. All user-data routes are protected.

---

## 5. Summary

| Issue | Severity | Status |
|-------|----------|--------|
| `Math.random()` in ID generation | CRITICAL | **FIXED** |
| Missing Zod validation | N/A | Already validated or N/A |
| Payment verification gap | HIGH | **OPEN** — TODO in purchase route |
| Missing auth | N/A | None found |

### Files Modified
- `backend/src/lib/utils.ts` — Replaced `Math.random()` with `crypto.getRandomValues()`

### Action Items
1. **[HIGH]** Implement Pi Payment SDK approval in `purchase/route.ts` before granting access
2. **[MEDIUM]** Consider adding a `paymentId` field to the purchase request body schema
3. **[LOW]** Add `src/app/api/settings/route.ts` if settings update endpoint is planned
