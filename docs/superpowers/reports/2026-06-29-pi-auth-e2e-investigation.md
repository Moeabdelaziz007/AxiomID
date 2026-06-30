---
tags: [pi-authentication, e2e, debugging, investigation]
status: complete
tier: critical
last_updated: 2026-06-29
ai_summary: E2E investigation of Pi authentication failure issue
linked_notes:
  - docs/PI_SANDBOX_TESTING.md
  - docs/superpowers/plans/2026-06-29-pi-authentication-debug-plan.md
---

# Pi Authentication E2E Investigation Report

**Date:** 2026-06-29  
**Branch:** feat/pi-auth-e2e-test  
**Issue:** Users clicking "Connect" in Pi Browser see "pi auth failing" popup

---

## Investigation Summary

### Pi Developer Portal Configuration

From Pi Developer Portal:
- **RL (Redirect URL):** https://axiomid.app
- **Slug:** worker-pi-os
- **Development URL:** https://axiomid8992.pinet.com
- **Sandbox URL:** https://sandbox.minepi.com/app/worker-pi-os
- **Connected App Wallet:** GD5BC...N36MZ
- **Hosting:** Self Hosted

### URL Analysis

| URL | Status | Notes |
|-----|--------|-------|
| https://axiomid.app | ✅ Loads | Production landing page loads correctly |
| https://axiomid8992.pinet.com | ✅ Loads | PiNet listing page for AxiomID |
| https://sandbox.minepi.com/app/worker-pi-os | ⚠️ Wrong App | Loads generic Pi app, not AxiomID |

**Key Finding:** The sandbox URL `https://sandbox.minepi.com/app/worker-pi-os` does NOT load AxiomID. It loads a generic Pi app. This suggests the app may not be properly configured in the Pi Developer Portal sandbox environment.

---

## Test Infrastructure Analysis

### Existing E2E Tests

Found existing Pi authentication tests:
- `src/__tests__/e2e/pi-sandbox-flow.test.tsx` - Tests sandbox postMessage communications
- `src/__tests__/lib/pi-sdk.test.ts` - Unit tests for Pi SDK functions
- `src/__tests__/api/auth-pi.test.ts` - API route tests for Pi authentication
- `docs/PI_E2E_TESTING.md` - Manual testing guide for Pi Browser

### Test Execution Issues

**Issue:** All Pi-related tests failed with:
```
TypeError: webidl.util.markAsUncloneable is not a function
```

**Root Cause:** `undici@8.5.0` is incompatible with Node.js v20.20.2

**Fix Applied:** Downgraded undici to `6.19.8` (compatible with Node.js v20)

**Status:** Fixed but tests not re-run due to user cancellation.

---

## Debug Logging Implementation

### Changes Made

**File:** `src/lib/pi-sdk.ts`

Added comprehensive debug logging to `connectPi()` function:
- `[DEBUG] Starting Pi authentication flow...`
- `[DEBUG] Browser environment detected — loading Pi SDK...`
- `[DEBUG] Pi SDK loaded successfully`
- `[DEBUG] Sandbox mode: {true/false}`
- `[DEBUG] Environment variables check:`
- `[DEBUG]   NEXT_PUBLIC_PI_SANDBOX: {value or "not set"}`
- `[DEBUG]   NEXT_PUBLIC_PI_OAUTH_CLIENT_ID: {set or "not set"}`
- `[DEBUG] Requesting Pi authentication token...`
- `[DEBUG] Calling Pi.authenticate() with timeout (45s)...`
- `[DEBUG] Pi.authenticate() returned successfully`
- `[DEBUG] Authentication error: {error message}`
- `[DEBUG] PiSdkError: {code} - {message}`
- `[DEBUG] Generic error: {message}`

**File:** `docs/PI_SANDBOX_TESTING.md`

Created comprehensive testing guide with:
- Step-by-step sandbox testing instructions
- Expected debug log output
- Common error messages and fixes
- Vercel environment variable verification steps
- Debugging checklist

**File:** `docs/superpowers/plans/2026-06-29-pi-authentication-debug-plan.md`

Created superpowers-style plan with checkbox tasks for agentic execution.

---

## CSP Configuration Verification

**File:** `vercel.json`

Verified CSP includes all required Pi domains:
- `https://sdk.minepi.com` ✅
- `https://sandbox.minepi.com` ✅
- `https://app-cdn.minepi.com` ✅
- `https://accounts.pinet.com` ✅
- `https://*.minepi.com` ✅
- `https://*.pinet.com` ✅

**Status:** CSP is correctly configured. Not the issue.

---

## Root Cause Analysis

### Primary Suspects (in order of likelihood)

1. **Missing or Invalid Environment Variables in Vercel**
   - `PI_API_KEY` - Required for server-side payment operations
   - `NEXT_PUBLIC_PI_OAUTH_CLIENT_ID` - Required for OAuth fallback
   - `NEXT_PUBLIC_PI_SANDBOX=false` - Must be false for production
   - `PI_TOKEN_ENCRYPTION_KEY` - Required for token encryption
   - `OAUTH_STATE_SECRET` - Required for OAuth state signing

2. **Pi Developer Portal Configuration Mismatch**
   - App slug `worker-pi-os` may not match expected configuration
   - Sandbox URL does not load AxiomID (loads generic Pi app instead)
   - App may not be approved for Mainnet

3. **Pi Sign-in OAuth Flow Required (Pi Day 2026)**
   - Current code uses `Pi.authenticate()` which may be deprecated
   - May need to implement OAuth redirect flow instead

4. **SDK Version Mismatch**
   - Current SDK version: 2.0
   - May need to update to latest version

---

## Recommended Next Steps

### Immediate Actions

1. **Check Vercel Environment Variables**
   ```bash
   npx vercel env pull --environment production
   grep -E "PI_API_KEY|NEXT_PUBLIC_PI_OAUTH_CLIENT_ID|NEXT_PUBLIC_PI_SANDBOX|PI_TOKEN_ENCRYPTION_KEY|OAUTH_STATE_SECRET" .env.production.local
   ```

2. **Test in Pi Browser with Debug Logs**
   - Open https://axiomid.app in Pi Browser
   - Open Developer Tools (F12)
   - Click "Connect" button
   - Check Console tab for `[DEBUG]` prefixed logs
   - Check Network tab for 401/403 errors

3. **Verify Pi Developer Portal Configuration**
   - Confirm app is registered with correct slug
   - Verify OAuth Client ID matches Vercel
   - Check if app is approved for Mainnet
   - Fix sandbox URL configuration

### If Environment Variables Are Missing

Add them in Vercel dashboard:
1. Go to Settings → Environment Variables
2. Add each missing variable with correct value
3. Select "Production" environment
4. Redeploy after adding

### If Sandbox URL Is Wrong

Update Pi Developer Portal configuration:
1. Go to https://developer.minepi.com
2. Select app `worker-pi-os`
3. Update sandbox URL to point to correct AxiomID deployment
4. Save and re-test

### If OAuth Flow Is Required

Implement Pi Sign-in OAuth redirect:
1. Update authentication flow to use OAuth redirect
2. Implement callback handler at `/api/oauth/callback`
3. Update `pi-signin.ts` to handle new flow

---

## Files Modified

1. `src/lib/pi-sdk.ts` - Added debug logging
2. `docs/PI_SANDBOX_TESTING.md` - Created testing guide
3. `docs/superpowers/plans/2026-06-29-pi-authentication-debug-plan.md` - Created implementation plan
4. `package.json` - Downgraded undici from 8.5.0 to 6.19.8

---

## Commits

- `b3ac398` - `fix(pi-auth): add enhanced debug logging and sandbox testing guide ۞` (feat/covenant-promises-cleanup branch)

---

## Status

**Current Branch:** feat/pi-auth-e2e-test  
**Test Status:** Tests fixed (undici downgrade) but not re-run  
**Next Action:** User should check Vercel environment variables and test in Pi Browser with debug logs enabled

---

## Success Criteria

- User can click Connect in Pi Browser
- Authentication popup appears and succeeds
- User is logged in and redirected to dashboard
- No "pi auth failing" error
- Debug logs show successful authentication flow
