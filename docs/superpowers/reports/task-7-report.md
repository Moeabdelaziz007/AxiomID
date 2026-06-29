# Task 7 Report — Claim Page Step 2: Real Verification

## Summary

Replaced the cosmetic Step 2 verification (fake progress bar + threshold-based items) with real Pi KYC verification via `POST /api/pi/kya/verify`. Added `DevModeBanner` for sandbox detection.

## Changes Made

### `src/app/claim/page.tsx`
- **Removed** `requestKycConsent` import (no longer used in Step 2)
- **Removed** `claimKya` from wallet context destructuring (unused)
- **Added** `DevModeBanner` import and render after `<Header />`
- **Replaced state**: `verificationProgress` (number) → `isVerifying` (boolean) + `verificationItems` ({ kyc, payment, stellar })
- **Replaced `handleVerify`**: Now calls `POST /api/pi/kya/verify` with access token, then optionally calls `POST /api/stellar/anchor`. Only sets `verified=true` when KYC check succeeds.
- **Replaced Step 2 JSX**: 3 real verification items with Shield/Wallet/Globe icons:
  - Pi KYC ( Shield) — lights up when KYC check returns OK
  - Payment Proof (Wallet) — lights up when `kycStatus === "VERIFIED"`
  - On-Chain Anchor (Globe) — lights up when Stellar anchoring succeeds (optional)
- **Button text**: "START KYA VERIFICATION" → "START VERIFICATION"

### `src/__tests__/app/claim-page.test.tsx`
- **Added** `DevModeBanner` mock
- **Added** `global.fetch` mock for `/api/pi/kya/verify`
- **Replaced** old `handleVerify` tests (consent-based) with real verification tests:
  - Shows 3 verification items (Pi KYC, Payment Proof, On-Chain Anchor)
  - Calls `POST /api/pi/kya/verify` when button clicked
  - Completes verification when API returns OK
  - Does NOT complete when API fails
  - Shows PENDING before, VERIFICATION COMPLETE after
- **Updated** `navigateToStep3` to use new button text and async flow

## Test Results

```
Claim Page Tests: 33 passed, 0 failed
Full Suite:       2904 passed, 0 failed
```

## Verification Flow

1. User clicks "START VERIFICATION"
2. `handleVerify` calls `POST /api/pi/kya/verify` with access token
3. If KYC OK → Pi KYC item lights up
4. If `kycStatus === "VERIFIED"` → Payment Proof item lights up
5. Stellar anchoring attempted (optional, non-blocking)
6. If Stellar OK → On-Chain Anchor item lights up
7. `setVerified(true)` — only if KYC check succeeded
8. "VERIFICATION COMPLETE" shown with trust score

## Commit

```
feat(claim): Step 2 real verification — Pi KYC + payment + Stellar ۞
```
