# Task 2 — Trust Score Computation

**Status:** DONE
**Commit:** `7d8f0ce1` — `feat(trust): computeTrustScore — weighted sum with decay + anchor bonus ۞`

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/trust-score.ts` | `computeTrustScore()` — weighted action sum + inactivity decay + Stellar anchor bonus |
| `src/__tests__/lib/trust-score.test.ts` | 6 unit tests covering empty, full, anchor, decay, cap, and unknown-type cases |

## Test Results

- **trust-score.test.ts:** 6/6 passed
- **Full suite:** 126 suites, 2884 tests — all passing
- **Type-check (`tsc --noEmit`):** 0 errors

## Architecture

`computeTrustScore` coexists with the old `calculateTrustScore` in `trust.ts`:

| | `calculateTrustScore` (old) | `computeTrustScore` (new) |
|---|---|---|
| **Input** | XP + stamp count | Completed actions array + flags |
| **Scoring** | Weighted XP (70%) + stamps (30%) | Sum of action weights, normalized to 0–100 |
| **Decay** | None | Inactivity decay (−10% per 90 days, floor 0.8) |
| **Bonus** | None | Stellar anchor ×1.15 multiplier |
| **Cap** | `Math.min(100, ...)` | Mining streak capped at 5 months |
| **File** | `src/lib/trust.ts` | `src/lib/trust-score.ts` |
