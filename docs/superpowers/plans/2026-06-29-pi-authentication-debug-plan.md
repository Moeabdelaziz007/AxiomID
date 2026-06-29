# Fix Pi Authentication Failure — Debug Logging & Diagnosis

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Diagnose and fix the "pi auth failing" popup issue when users click Connect in Pi Browser.

**Architecture:** Two-phase approach — Phase 1 adds comprehensive debug logging to identify the exact failure point, Phase 2 applies the appropriate fix based on diagnostic output.

**Tech Stack:** Pi SDK v2.0, Next.js, Vercel, Pi Browser, Content Security Policy (CSP)

**Global Constraints:**
- All CI checks must pass before merge (type-check + lint + test)
- Always use PRs — never commit directly to `main`
- Commit message format: `type(scope): description ۞`
- Only fix what the plan says; no scope creep
- Prefer the simplest fix that works; avoid new dependencies or abstractions

---

### Task 1: Add Enhanced Debug Logging (COMPLETED)

**The Problem:** Users clicking "Connect" see a popup saying "pi auth failing" with no diagnostic information. The exact failure point is unknown.

**The Fix:** Add comprehensive debug logging to `src/lib/pi-sdk.ts` `connectPi()` function to log:
- Authentication flow start
- Browser environment detection
- SDK initialization status
- Sandbox mode status
- Environment variable presence (without exposing values)
- Authentication request with timeout
- Authentication response details
- Error codes and messages

**Files:**
- Modify: `src/lib/pi-sdk.ts` — Add debug logs to `connectPi()` function
- Create: `docs/PI_SANDBOX_TESTING.md` — Testing guide for sandbox mode

**Interfaces:**
- Consumes: Pi SDK, environment variables
- Produces: Console logs prefixed with `[DEBUG]` for easy filtering

- [x] **Step 1: Add debug logging to connectPi() function**

Added logs at key points:
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

- [x] **Step 2: Create sandbox testing guide**

Created `docs/PI_SANDBOX_TESTING.md` with:
- Step-by-step sandbox testing instructions
- Expected debug log output
- Common error messages and fixes
- Vercel environment variable verification steps
- Debugging checklist

- [x] **Step 3: Verify CSP configuration**

Verified `vercel.json` CSP includes all required Pi domains:
- `https://sdk.minepi.com` ✓
- `https://sandbox.minepi.com` ✓
- `https://app-cdn.minepi.com` ✓
- `https://accounts.pinet.com` ✓
- `https://*.minepi.com` ✓
- `https://*.pinet.com` ✓

**Status: CSP is correctly configured. Not the issue.**

- [x] **Step 4: Verify .env.example**

Confirmed all required Pi environment variables are documented:
- `NEXT_PUBLIC_PI_SANDBOX`
- `PI_API_KEY`
- `NEXT_PUBLIC_PI_OAUTH_CLIENT_ID`
- `PI_TOKEN_ENCRYPTION_KEY`
- `OAUTH_STATE_SECRET`

- [x] **Step 5: Commit changes**

```bash
git add src/lib/pi-sdk.ts docs/PI_SANDBOX_TESTING.md
git commit -m "fix(pi-auth): add enhanced debug logging and sandbox testing guide ۞"
```

---

### Task 2: Test Locally in Sandbox Mode

**The Problem:** Need to verify if authentication works in sandbox mode before diagnosing production issues.

**The Fix:** Follow the testing guide to test authentication locally in Chrome/Safari (not Pi Browser) with sandbox mode enabled.

**Files:**
- Create/Modify: `.env.local` — Set `NEXT_PUBLIC_PI_SANDBOX=true`

**Interfaces:**
- Consumes: Local dev server, sandbox dev token
- Produces: Console output showing authentication success/failure

- [ ] **Step 1: Enable sandbox mode locally**

Create or update `.env.local`:
```bash
NEXT_PUBLIC_PI_SANDBOX=true
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEV_URL=http://localhost:3000
```

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

- [ ] **Step 3: Test in Chrome/Safari**

Open `http://localhost:3000` in Chrome or Safari (NOT Pi Browser):
1. Navigate to Connect/Login page
2. Click "Connect" button
3. Open Developer Tools (F12 → Console tab)
4. Check for debug logs

**Expected logs if successful:**
```
[DEBUG] Starting Pi authentication flow...
[DEBUG] Browser environment detected — loading Pi SDK...
Loading Pi SDK script...
Initializing Pi SDK v2.0...
Pi SDK initialized successfully.
[DEBUG] Pi SDK loaded successfully
[DEBUG] Sandbox mode: true
[DEBUG] Environment variables check:
[DEBUG]   NEXT_PUBLIC_PI_SANDBOX: true
[DEBUG]   NEXT_PUBLIC_PI_OAUTH_CLIENT_ID: not set
[DEBUG] Requesting Pi authentication token...
[DEBUG] Calling Pi.authenticate() with timeout (45s)...
[DEBUG] Pi.authenticate() returned successfully
[DEBUG] User data received: {...}
[DEBUG] Access token received (length: 123)
Authenticated: username
```

- [ ] **Step 4: Analyze results**

**If sandbox works:**
- Issue is Pi Browser production-specific
- Proceed to Task 3 (check Vercel env vars)

**If sandbox fails:**
- Check exact error message in console
- Look for 401/403 errors in Network tab
- Verify Pi SDK script loaded correctly
- Check if CSP is blocking the SDK

---

### Task 3: Verify Vercel Environment Variables

**The Problem:** Most likely root cause is missing or invalid environment variables in Vercel production environment.

**The Fix:** Check Vercel dashboard for required Pi environment variables and add if missing.

**Files:**
- Config: Vercel dashboard → Settings → Environment Variables

**Interfaces:**
- Consumes: Vercel dashboard
- Produces: Environment variables set for production

- [ ] **Step 1: Check current Vercel env vars**

Go to Vercel dashboard → AxiomID → Settings → Environment Variables

Verify these are set for **Production**:
- `PI_API_KEY` (server-side)
- `NEXT_PUBLIC_PI_OAUTH_CLIENT_ID` (client-side)
- `NEXT_PUBLIC_PI_SANDBOX=false` (production)
- `PI_TOKEN_ENCRYPTION_KEY` (server-side)
- `OAUTH_STATE_SECRET` (server-side)

- [ ] **Step 2: Add missing env vars**

If any are missing, add them in Vercel dashboard:
1. Go to Settings → Environment Variables
2. Click "Add New"
3. Enter variable name and value
4. Select "Production" environment
5. Click "Save"

**How to get values:**
- `PI_API_KEY`: https://developer.minepi.com → Your App → API Key
- `NEXT_PUBLIC_PI_OAUTH_CLIENT_ID`: https://developer.minepi.com → Your App → OAuth Client ID
- `PI_TOKEN_ENCRYPTION_KEY`: Generate with `openssl rand -hex 32`
- `OAUTH_STATE_SECRET`: Generate with `openssl rand -hex 32`

- [ ] **Step 3: Redeploy after adding env vars**

After adding env vars, redeploy:
```bash
npx vercel deploy --prod
```

Or trigger a deployment from Vercel dashboard.

---

### Task 4: Test in Pi Browser Production

**The Problem:** Need to verify if authentication works in Pi Browser after environment variables are set.

**The Fix:** Open AxiomID in Pi Browser, click Connect, and check console for debug logs.

**Files:**
- No file changes — testing only

**Interfaces:**
- Consumes: Pi Browser, production URL
- Produces: Console output showing authentication success/failure

- [ ] **Step 1: Open AxiomID in Pi Browser**

Open your production URL (e.g., `https://axiomid.app`) in Pi Browser.

- [ ] **Step 2: Open Developer Tools**

Press F12 to open Developer Tools.

- [ ] **Step 3: Click Connect button**

Navigate to the Connect/Login page and click "Connect".

- [ ] **Step 4: Check Console tab**

Look for debug logs prefixed with `[DEBUG]`.

- [ ] **Step 5: Check Network tab**

Look for failed requests:
- 401 errors → Invalid token
- 403 errors → API key issue
- Other errors → Check specific error message

- [ ] **Step 6: Analyze results**

**Common errors and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Pi API returned 401: Unauthorized` | Invalid/expired token | Check `PI_API_KEY` in Vercel |
| `Pi API returned 403: Forbidden` | API key missing or invalid | Add `PI_API_KEY` in Vercel dashboard |
| `Authentication failed - no user data received` | SDK initialization issue | Check CSP configuration |
| `Authentication failed - no token received` | OAuth flow issue | Verify `NEXT_PUBLIC_PI_OAUTH_CLIENT_ID` |

---

### Task 5: Verify App Registration (If Needed)

**The Problem:** If authentication still fails after env vars are set, the app may not be properly registered in Pi Developer Portal.

**The Fix:** Verify app registration and OAuth Client ID match.

**Files:**
- No file changes — verification only

**Interfaces:**
- Consumes: Pi Developer Portal
- Produces: Confirmation of app registration status

- [ ] **Step 1: Go to Pi Developer Portal**

Open https://developer.minepi.com

- [ ] **Step 2: Check app registration**

Verify your app is registered:
- App name matches
- OAuth Client ID matches what's in Vercel
- App is approved for Mainnet (if testing production)

- [ ] **Step 3: Update if needed**

If OAuth Client ID doesn't match:
1. Update Vercel env var `NEXT_PUBLIC_PI_OAUTH_CLIENT_ID`
2. Redeploy

If app is not approved for Mainnet:
1. Submit for approval in Pi Developer Portal
2. Wait for approval before testing production

---

## Verification

Run the full verification checklist before marking complete:

```bash
# 1. Build & lint pass
npm run build && npm run lint

# 2. Tests pass
npm test -- --silent

# 3. Sandbox mode works locally
# (Manual test: follow Task 2)

# 4. Production works in Pi Browser
# (Manual test: follow Task 4)

# 5. No "pi auth failing" error in production
# (Manual verification in Pi Browser)
```

## Success Criteria

- User can click Connect in Pi Browser
- Authentication popup appears and succeeds
- User is logged in and redirected to dashboard
- No "pi auth failing" error
- Debug logs show successful authentication flow

## Most Likely Root Cause

Based on analysis:

**Primary Suspect:** Missing or invalid environment variables in Vercel production environment.

**Secondary Suspect:** Pi Sign-in OAuth flow required after Pi Day 2026 (if `Pi.authenticate()` is deprecated).

**Tertiary Suspect:** App not properly registered in Pi Developer Portal.

## Estimated Time

- Task 1 (Debug logging): COMPLETED
- Task 2 (Sandbox testing): 15 minutes
- Task 3 (Vercel env vars): 10 minutes
- Task 4 (Pi Browser testing): 15 minutes
- Task 5 (App registration): 10 minutes (if needed)
- **Total: 30-50 minutes** (depending on root cause)
