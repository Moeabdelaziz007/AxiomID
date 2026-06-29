# Task 6: Wire Trust Score into Existing Routes

**Status:** Complete
**Date:** 2026-06-29

## Summary

Wired `computeTrustScore()` from `@/lib/trust-score` into two API routes so they return `computedTrustScore` in their responses.

## Changes Made

### 1. `src/app/api/user/status/route.ts`
- Added import: `import { computeTrustScore } from '@/lib/trust-score';`
- After fetching user with stamps, computes trust score from stamps + lastActive
- Added `computedTrustScore` field to the success response (between `nextLevelXP` and `agent`)

### 2. `src/app/api/stamp/claim/route.ts`
- Added import: `import { computeTrustScore } from '@/lib/trust-score';`
- After the transaction completes, fetches updated stamps via `prisma.stamp.findMany`
- Computes trust score from the full stamp list
- Added `computedTrustScore` field to the success response

### 3. Test Updates
- **`user-status.test.ts`**: Added `actions: []` and `stamps: []` to mock data (required by `computeTrustScore`). Added `expect(typeof data.computedTrustScore).toBe('number')` assertions.
- **`stamp-system.test.ts`**: Added `prisma.stamp.findMany` mock return for the claim test. Added `computedTrustScore` type assertion.
- **`social-claims.test.ts`**: Added `findMany` to prisma stamp mock. Added mock return values for the two integration tests.

## Test Results

```
Test Suites: 3 passed, 3 total (affected tests)
Tests:       10 passed, 10 total

Full suite: 128 passed, 1 failed (pre-existing claim-page.test.tsx UI text mismatch)
Tests:       2884 passed, 20 failed (all pre-existing)
```

## Files Modified
- `src/app/api/user/status/route.ts`
- `src/app/api/stamp/claim/route.ts`
- `src/__tests__/api/user-status.test.ts`
- `src/__tests__/api/stamp-system.test.ts`
- `src/__tests__/api/social-claims.test.ts`
