# Pi Browser E2E Testing Guide

Manual testing steps for AxiomID's Pi Browser integration.
Use this guide when testing on real devices in Pi Browser.

## Prerequisites

1. **Pi Browser** installed on mobile device (iOS/Android)
2. **Pi Developer Portal** access (https://developer.minepi.com)
3. Domain `axiomid.app` verified in Pi Developer Portal
4. `.env.local` configured with:
   ```
   NEXT_PUBLIC_PI_SANDBOX=false
   PI_API_KEY=<your-production-key>
   ```

## Test Cases

### 1. Pi SDK Initialization

**Steps:**

1. Open `https://axiomid.app` in Pi Browser
2. Open browser console (if available) or check Network tab
3. Verify `Pi.init()` is called with correct parameters

**Expected:**

- `Pi.init()` called with `version: "2.0"`
- No sandbox mode in production
- No console errors about Pi SDK

**Pass Criteria:** Pi SDK loads without errors, `window.Pi` is available

---

### 2. Pi KYC Verification (Real KYC Check)

**Steps:**

1. Navigate to claim page after Pi authentication
2. Click "Verify Pi Identity" (Step 2)
3. Server calls `POST /api/pi/kya/verify` with the user's Pi access token
4. Backend calls Pi API (`GET /v2/me`) to verify KYC status server-side
5. Verification result is returned with 3 items:
   - **KYC Verified** — Pi API confirms user has completed KYC
   - **Payment Proven** — User has completed at least one Pi payment
   - **On-Chain Proof** — User has a Stellar VC anchored on-chain

**Expected:**

- `POST /api/pi/kya/verify` endpoint is called (not a cosmetic checkbox)
- Server-side Pi API call validates the access token against `https://api.minepi.com/v2/me`
- Each verification item shows a real checkmark based on Pi API response
- Trust score is computed from completed Pi actions (weighted scoring, inactivity decay, Stellar anchor bonus)
- If KYC fails, error is shown and verification item stays unchecked

**Pass Criteria:** Real KYC check via Pi API, trust score computed from actions

---

### 3. Pi Payment (Marketplace Purchase)

**Steps:**

1. Navigate to Skills Marketplace
2. Select a paid skill (pricePi > 0)
3. Click "Add to My Agent" / purchase button
4. Approve the Pi payment in Pi Browser
5. Verify skill is installed

**Expected:**

- Pi payment popup shows correct amount and memo
- After approval, Pi SDK callbacks (approve → complete) finalize payment server-side
- Client calls `POST /api/skills/[slug]/install` after payment resolves
- Install route verifies a RELEASED PiPayment exists for this skill
- Skill appears in user's installed skills
- `installCount` increments on the skill

**Pass Criteria:** Payment completes, skill is installed, no errors

---

### 4. Pi Ads (Rewarded Ads)

**Steps:**

1. Navigate to dashboard
2. Look for "Earn XP" or ad-related UI
3. Click to show a rewarded ad
4. Watch the ad to completion
5. Verify XP is credited

**Expected:**

- `Pi.Ads.showAd("rewarded")` is called
- Ad plays to completion
- `adId` is sent to `/api/pi/ads/verify`
- Server verifies with Pi API (`GET /v2/ads_network/status/:adId`)
- XP is credited to user's account

**Pass Criteria:** Ad plays, XP increases, no double-claiming

---

### 5. Pi Native Features

**Steps:**

1. Navigate to passport page
2. Click "Share Passport"
3. Verify share dialog appears (if in Pi Browser)
4. Click "KYC Consent" if available

**Expected:**

- `Pi.nativeFeature.openShareDialog()` opens native share
- `Pi.nativeFeature.openConsentDialog()` opens consent dialog
- Fallback to `navigator.share()` if not in Pi Browser
- Fallback to clipboard if share APIs unavailable

**Pass Criteria:** Share works via at least one method

---

### 6. Production Sandbox Detection

**Steps:**

1. Open `https://axiomid.app` in Pi Browser
2. Verify sandbox mode is `false`
3. Open `https://axiomid.app` in regular browser
4. Verify sandbox detection works correctly

**Expected:**

- Production domain (`axiomid.app`) → sandbox = false
- `localhost` / `*.local` → sandbox = true
- `sandbox.minepi.com` iframe → sandbox = true
- `?sandbox=true` query param → sandbox = true

**Pass Criteria:** Sandbox mode matches environment

---

## Troubleshooting

### Pi SDK not loading

- Check `NEXT_PUBLIC_PI_SANDBOX` env var
- Verify domain is verified in Pi Developer Portal
- Check console for CORS errors

### Payment fails silently

- Check `PI_API_KEY` is set correctly
- Verify Pi API endpoint: `https://api.minepi.com/v2/payments/:id`
- Check server logs for `[SKILL-INSTALL]` or `[PI-PAYMENT]` errors

### Auth timeout

- Pi Browser mobile popups are slow
- `authenticateWithTimeout()` uses ≥45s timeout
- If timeout occurs, retry — Pi Browser may be under load

### Ad verification fails

- Check `PI_API_KEY` has ads permission
- Verify ad ID format: `Pi.Ads.showAd("rewarded")` returns `{ result, adId }`
- Check `/api/pi/ads/verify` logs for Pi API response

## Pi Developer Portal Checklist

When Pi Developer Portal is accessible:

- [ ] Domain `axiomid.app` verified
- [ ] App settings configured (sandbox = false for production)
- [ ] Payment callback URLs set:
  - Approval: `https://axiomid.app/api/pi/payment/approve`
  - Completion: `https://axiomid.app/api/pi/payment/complete`
- [ ] Ad network enabled (if using Pi Ads)
- [ ] SDK version set to 2.0

## Environment Variables

| Variable                  | Production Value | Notes                       |
| ------------------------- | ---------------- | --------------------------- |
| `NEXT_PUBLIC_PI_SANDBOX`  | `false`          | Never sandbox in production |
| `PI_API_KEY`              | `<secret>`       | From Pi Developer Portal    |
| `PI_TOKEN_ENCRYPTION_KEY` | `<secret>`       | For encrypting Pi tokens    |
| `SOVEREIGN_KEY_SALT`      | `<secret>`       | For key derivation          |
