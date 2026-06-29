# Pi App Studio Professional Setup Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure AxiomID meets all Pi App Studio testnet/mainnet requirements and has a professional first-user experience for Pi Browser visitors.

**Architecture:** Validate existing Pi SDK integration against official checklist, fix any gaps, ensure payment flows work end-to-end, and verify domain ownership is properly configured.

**Tech Stack:** Next.js 16, Pi SDK v2.0, Prisma, Vercel

## Global Constraints

- Pi SDK version: `2.0` (latest as of August 2022 per official docs)
- Sandbox flag: `determineSandboxMode()` handles this dynamically
- All payments must go through `Pi.createPayment()` with server-side approval/completion
- Only Pi authentication allowed (no email, no third-party logins)
- Domain: `axiomid.app` (must NOT start with "pi" — trademark compliance)

## Source Documents

- [Pi Platform SDK Docs](https://github.com/pi-apps/pi-platform-docs/blob/master/README.md)
- [Getting Started Checklist](https://pi-apps.github.io/community-developer-guide/docs/gettingStarted/gettingStartedChecklist/)
- [Mainnet Listing Requirements](https://pi-apps.github.io/community-developer-guide/docs/gettingStarted/mainnetListingRequirements/)
- [Pi Payment Flow](https://pi-apps.github.io/community-developer-guide/docs/importantTopics/paymentFlow/)

---

## Task 1: Validate SDK Integration

**Files:**
- Read: `src/app/context/wallet-context.tsx:143-154`
- Read: `src/lib/pi-sdk.ts` (full file)
- Read: `src/app/layout.tsx` (Script tag)

**Checklist:**
- [ ] **Step 1:** Verify `<script src="https://sdk.minepi.com/pi-sdk.js">` is in layout.tsx
- [ ] **Step 2:** Verify `Pi.init({ version: "2.0", sandbox: determineSandboxMode() })` is called on app load
- [ ] **Step 3:** Verify `Pi.authenticate()` is called with `['username', 'payments']` scopes
- [ ] **Step 4:** Verify `onIncompletePaymentFound` callback is implemented

**Expected:** All 4 checks pass. If any fail, fix the code.

---

## Task 2: Validate Payment Flow

**Files:**
- Read: `src/lib/pi-sdk.ts` (`createPiPayment` function)
- Read: `src/app/api/pi/payment/approve/route.ts`
- Read: `src/app/api/pi/payment/complete/route.ts`

**Checklist:**
- [ ] **Step 1:** Verify `Pi.createPayment()` is called with `amount`, `memo`, `metadata`
- [ ] **Step 2:** Verify `onReadyForServerApproval` callback calls `/api/pi/payment/approve`
- [ ] **Step 3:** Verify `onReadyForServerCompletion` callback calls `/api/pi/payment/complete`
- [ ] **Step 4:** Verify `onCancel` and `onError` callbacks are implemented
- [ ] **Step 5:** Verify server-side approve uses `PI_API_KEY` with `Authorization: Key <PI_API_KEY>`
- [ ] **Step 6:** Verify server-side complete uses `PI_API_KEY` with `Authorization: Key <PI_API_KEY>`

**Expected:** All 6 checks pass. Payment flow must be end-to-end functional.

---

## Task 3: Validate Domain Ownership

**Files:**
- Read: `public/validation-key.txt`
- Check: `https://axiomid.app/validation-key.txt` returns 200

**Checklist:**
- [ ] **Step 1:** Verify `public/validation-key.txt` exists and contains the validation key
- [ ] **Step 2:** Verify the file is accessible at `https://axiomid.app/validation-key.txt`
- [ ] **Step 3:** Verify domain is verified in Pi Developer Portal (manual check required)

**Expected:** File exists, is accessible, and domain is verified.

---

## Task 4: Validate Pi Browser Auth (Not Email/Third-Party)

**Files:**
- Read: `src/app/context/use-wallet-auth.ts`
- Read: `src/app/signin/callback/page.tsx`

**Checklist:**
- [ ] **Step 1:** Verify NO email login exists anywhere in the codebase
- [ ] **Step 2:** Verify NO Google/Discord/Twitter login exists
- [ ] **Step 3:** Verify Pi SDK auth is the PRIMARY auth method
- [ ] **Step 4:** Verify Pi Sign-in OAuth fallback works for regular browsers (not in Pi Browser)
- [ ] **Step 5:** Verify `axiomid_logged_out` flag doesn't block legitimate re-auth attempts

**Expected:** Only Pi authentication is used. No third-party logins.

---

## Task 5: Validate Trademark Compliance

**Files:**
- Read: `vercel.json` (domain config)
- Read: `src/app/layout.tsx` (metadata)

**Checklist:**
- [ ] **Step 1:** Verify domain `axiomid.app` does NOT start with "pi"
- [ ] **Step 2:** Verify app name does NOT use Pi logo or official colors
- [ ] **Step 3:** Verify no Pi trademark misuse in app description

**Expected:** Domain is `axiomid.app` (compliant). No Pi branding misuse.

---

## Task 6: Validate Transaction Processing

**Files:**
- Read: `src/app/api/pi/payment/approve/route.ts`
- Read: `src/app/api/pi/payment/complete/route.ts`
- Read: `src/lib/prisma.ts` (payment model)

**Checklist:**
- [ ] **Step 1:** Verify payment is created in DB before approval
- [ ] **Step 2:** Verify payment status transitions: created → approved → completed
- [ ] **Step 3:** Verify Pi blockchain transaction ID is stored on completion
- [ ] **Step 4:** Verify duplicate payment handling (idempotency)

**Expected:** Payment flow handles all states correctly.

---

## Task 7: Validate Professional UI (Mainnet Requirement)

**Files:**
- Read: `src/app/page.tsx` (landing page)
- Read: `src/app/claim/page.tsx` (claim flow)
- Read: `src/app/dashboard/page.tsx` (dashboard)

**Checklist:**
- [ ] **Step 1:** Verify landing page loads without errors
- [ ] **Step 2:** Verify claim flow completes without crashes
- [ ] **Step 3:** Verify dashboard shows user data correctly
- [ ] **Step 4:** Verify no broken links or dead buttons
- [ ] **Step 5:** Verify mobile responsiveness

**Expected:** App is fully functional with clean UI.

---

## Task 8: Validate KYC Integration

**Files:**
- Read: `src/app/api/pi/kya/verify/route.ts`
- Read: `src/lib/pi-kyc.ts`

**Checklist:**
- [ ] **Step 1:** Verify KYC verification uses `GET /v2/me` with Bearer token
- [ ] **Step 2:** Verify KYC stamp is created with duplicate check (findUnique before create)
- [ ] **Step 3:** Verify XP is updated when KYC stamp is created
- [ ] **Step 4:** Verify tier is recalculated after XP update

**Expected:** KYC flow is idempotent and updates user state correctly.

---

## Task 9: Create AI Image Generation Prompt

**Purpose:** Generate a professional app icon/hero image for Pi App Studio listing.

**Deliverable:** A detailed prompt for Midjourney/DALL-E/Stable Diffusion.

**Prompt:**

```
Professional app icon for "AxiomID" — a decentralized identity platform on Pi Network.

Style: Modern, geometric, minimalist. Dark background (#10131a OLED black) with electric blue (#3b82f6) and neon green (#22c55e) accents.

Elements:
- Central geometric symbol: interlocking hexagonal shapes representing identity verification
- Subtle shield or lock motif suggesting trust and security
- Clean, sharp edges — no organic shapes
- Small "Pi Network Compatible" badge in corner (optional)

Text: None on icon itself. App name "AxiomID" displayed separately in UI.

Color palette: #10131a (background), #3b82f6 (primary blue), #22c55e (success green), #6366f1 (purple accent)

Mood: Professional, trustworthy, futuristic. Think "enterprise security meets Web3."

Size: 512x512px (primary), 192x192px (favicon variant)
```

---

## Task 10: Verify Vercel Environment Variables

**Checklist:**
- [ ] **Step 1:** Verify `PI_API_KEY` is set in Vercel production
- [ ] **Step 2:** Verify `PI_TOKEN_ENCRYPTION_KEY` is set
- [ ] **Step 3:** Verify `OAUTH_STATE_SECRET` is set
- [ ] **Step 4:** Verify `NEXT_PUBLIC_PI_SANDBOX` is set to `false` in production
- [ ] **Step 5:** Verify `NEXT_PUBLIC_PI_OAUTH_CLIENT_ID` is set

**Expected:** All required env vars are configured.

---

## Task 11: Deploy and Smoke Test

**Steps:**
- [ ] **Step 1:** Commit all changes to `main`
- [ ] **Step 2:** Wait for Vercel deploy to complete
- [ ] **Step 3:** Open app in Pi Browser (sandbox mode)
- [ ] **Step 4:** Test authentication flow
- [ ] **Step 5:** Test payment flow (0.1 Pi minimum)
- [ ] **Step 6:** Verify no console errors
- [ ] **Step 7:** Verify domain validation key is accessible

**Expected:** App works end-to-end in Pi Browser.

---

## Summary

| Task | Status | Priority |
|------|--------|----------|
| 1. SDK Integration | Pending | Critical |
| 2. Payment Flow | Pending | Critical |
| 3. Domain Ownership | Pending | Critical |
| 4. Pi Browser Auth | Pending | Critical |
| 5. Trademark Compliance | Pending | Critical |
| 6. Transaction Processing | Pending | Critical |
| 7. Professional UI | Pending | Critical |
| 8. KYC Integration | Pending | Critical |
| 9. AI Image Prompt | Pending | Medium |
| 10. Vercel Env Vars | Pending | Critical |
| 11. Deploy & Smoke Test | Pending | Critical |

## Next Steps

1. Execute Tasks 1-8 (validate existing code)
2. Execute Task 9 (generate image)
3. Execute Task 10 (verify env vars)
4. Execute Task 11 (deploy and test)
5. Create PR for review
6. Merge after approval
