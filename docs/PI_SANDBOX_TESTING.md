# Pi Authentication Sandbox Testing Guide

This guide helps you test Pi authentication locally in sandbox mode before deploying to production.

## Prerequisites

- Node.js and npm installed
- AxiomID repository cloned locally

## Step 1: Enable Sandbox Mode Locally

Create or update your `.env.local` file:

```bash
# Set sandbox mode to true for local development
NEXT_PUBLIC_PI_SANDBOX=true

# Optional: Set a custom sandbox dev token (defaults to "sandbox-dev-token-abc-123")
# NEXT_PUBLIC_SANDBOX_DEV_TOKEN=your-custom-token

# Set your local site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEV_URL=http://localhost:3000
```

## Step 2: Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Step 3: Test in Regular Browser (Chrome/Safari)

**Important:** For sandbox testing, use Chrome or Safari - NOT Pi Browser.

1. Open `http://localhost:3000` in Chrome or Safari
2. Navigate to the Connect/Login page
3. Click the "Connect" button
4. Check the browser console (F12 → Console tab) for debug logs

### Expected Debug Logs

You should see logs like:
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
```

### If Sandbox Works

If authentication succeeds in sandbox mode:
- The issue is likely Pi Browser production-specific
- Check Vercel environment variables for production
- Verify app is registered in Pi Developer Portal

### If Sandbox Fails

If authentication fails even in sandbox mode:
- Check the exact error message in console
- Look for 401/403 errors in Network tab
- Verify Pi SDK script loaded correctly
- Check if CSP is blocking the SDK

## Step 4: Test in Pi Browser (Production Mode)

After sandbox testing works, test in Pi Browser:

1. Deploy to Vercel (or use your production URL)
2. Open the app in Pi Browser
3. Open Developer Tools (F12)
4. Click "Connect" button
5. Check Console and Network tabs

### Common Pi Browser Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Pi API returned 401: Unauthorized` | Invalid/expired token | Check `PI_API_KEY` in Vercel |
| `Pi API returned 403: Forbidden` | API key missing or invalid | Add `PI_API_KEY` in Vercel dashboard |
| `Authentication failed - no user data received` | SDK initialization issue | Check CSP configuration |
| `Authentication failed - no token received` | OAuth flow issue | Verify `NEXT_PUBLIC_PI_OAUTH_CLIENT_ID` |

## Step 5: Verify Vercel Environment Variables

Go to Vercel dashboard → AxiomID → Settings → Environment Variables

Ensure these are set for **Production**:

```
PI_API_KEY=your-api-key-from-pi-developer-portal
NEXT_PUBLIC_PI_OAUTH_CLIENT_ID=your-oauth-client-id
NEXT_PUBLIC_PI_SANDBOX=false
PI_TOKEN_ENCRYPTION_KEY=your-32-byte-hex-key
OAUTH_STATE_SECRET=your-32-byte-hex-key
```

### How to Get These Values

1. **PI_API_KEY**: https://developer.minepi.com → Your App → API Key
2. **NEXT_PUBLIC_PI_OAUTH_CLIENT_ID**: https://developer.minepi.com → Your App → OAuth Client ID
3. **PI_TOKEN_ENCRYPTION_KEY**: Generate with `openssl rand -hex 32`
4. **OAUTH_STATE_SECRET**: Generate with `openssl rand -hex 32`

## Step 6: Check CSP Configuration

The CSP in `vercel.json` must include these domains:

- `https://sdk.minepi.com` - Pi SDK script
- `https://sandbox.minepi.com` - Sandbox environment
- `https://app-cdn.minepi.com` - App CDN (Pi Day 2026+)
- `https://accounts.pinet.com` - Pi Sign-in (Pi Day 2026+)
- `https://*.minepi.com` - Wildcard for subdomains
- `https://*.pinet.com` - Wildcard for Pi Network domains

Current CSP is correctly configured. If you modify it, ensure these domains remain.

## Step 7: Verify App Registration

1. Go to https://developer.minepi.com
2. Check your app is registered
3. Verify OAuth Client ID matches Vercel
4. Check if app is approved for Mainnet

## Debugging Checklist

- [ ] Sandbox mode works in Chrome/Safari locally
- [ ] All required environment variables set in Vercel
- [ ] CSP includes all Pi domains
- [ ] App is registered in Pi Developer Portal
- [ ] OAuth Client ID matches between Pi Portal and Vercel
- [ ] App is approved for Mainnet (if testing production)
- [ ] No 401/403 errors in Network tab
- [ ] Console shows successful authentication flow

## Next Steps After Fix

Once authentication works:
1. Remove debug logs (optional, for production)
2. Test payment flow
3. Test ad display (if applicable)
4. Deploy to production

## Additional Resources

- Pi Network Developer Docs: https://developers.minepi.com/docs
- Pi SDK Reference: https://developers.minepi.com/docs/pi-sdk
- CSP Guide: https://developers.minepi.com/docs/security/content-security-policy
