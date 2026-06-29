# Task 3 — Pi KYC Server-Side Verification

**Status:** DONE

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/pi-kyc.ts` | `verifyKycServerSide()` — calls `GET https://api.minepi.com/v2/me` with user's Pi access token, returns KYC status, wallet address, username |
| `src/__tests__/lib/pi-kyc.test.ts` | 5 unit tests covering: KYC confirmed, KYC denied, API failure, network timeout, missing env var |

## Test Results

```
PASS src/__tests__/lib/pi-kyc.test.ts
  verifyKycServerSide
    ✓ returns kyc_verified true when Pi API confirms KYC
    ✓ returns kyc_verified false when Pi API says not KYCed
    ✓ throws on Pi API failure
    ✓ throws on network timeout
    ✓ throws when PI_API_KEY is not set

Tests: 5 passed, 5 total
```

## Verification

- **Type-check:** `tsc --noEmit` — 0 errors
- **Lint:** eslint passed via lint-staged pre-commit hook — 0 warnings
- **Commit:** `8c0ae6b2` — `feat(kyc): verifyKycServerSide — real Pi API KYC check ۞`

## Implementation Notes

- Uses `AbortSignal.timeout(10000)` for 10s request timeout
- Checks `PI_API_KEY` env var at call time (throws if missing)
- Logs Pi API error responses via `logger.error` before throwing
- Response typed with `as` assertion to the known Pi API shape (not `as any`)
- `wallet` and `username` are optional in the Pi API response — handled with `?? null`
