# AxiomID Pi Payment Map — Pi App Studio Step 10 Readiness Audit

> 2026-08-13 — research-only audit (no code changed). Answers: where Pi SDK init lives, where a payment button/UI belongs in Aura OS, where `/approve`/`/complete` endpoints live, and backend readiness for the Pi Server-Side API.

## 1. Pi SDK initialization (exists — nothing to add)

| Layer | Location | What it does |
|---|---|---|
| Script injection | `src/lib/pi-sdk.ts:35-84` | Dynamically loads `https://sdk.minepi.com/pi-sdk.js` (no static tag in layout; avoids clobbering native Pi in Pi Browser) |
| Init | `src/lib/pi-sdk.ts:190-240` (`ensurePiInitialized`) + `src/app/context/wallet-context.tsx:193-204` | `Pi.init({version:"2.0", sandbox})` — idempotent, auto-runs on app mount via `WalletProvider` |
| Mode | `pi-sdk.ts:97-188` | Sandbox cascade: `NEXT_PUBLIC_PI_NETWORK=testnet` → hostname → iframe override (`sandbox:false` inside sandbox.minepi.com iframe) |
| Auth | `pi-sdk.ts:273-443` | `Pi.authenticate(["username","payments","wallet_address"])` + auto-resolves incomplete payments |
| Payment creation | `pi-sdk.ts:480-544` | `window.Pi.createPayment()` with all 4 callbacks (`onReadyForServerApproval`/`Completion`, `onCancel`, `onError`) |

CSP (`vercel.json:28`) already allowlists `sdk.minepi.com` (script-src), `*.minepi.com` (connect-src), `accounts.pinet.com` (frame-src). Middleware CORS covers `app.minepi.com`/`sandbox.minepi.com`. Rate limits in `RATE_LIMITS.payment` (10/min per IP). Error taxonomy maps payment failures to HTTP 402 in `lib/errors.ts`.

## 2. Payment button/UI placement in Aura OS

| Surface | Fit for Step 10 | Notes |
|---|---|---|
| **Dashboard → Wallet tab** (recommended) | Best — authenticated, Pi-wallet-gated, existing precedent | `DonateWithPiCard.tsx` (`src/components/dashboard/`) is a working Pi payment today. Clone as a "Process a Transaction" card showing the txid result |
| `/plans` CheckoutButton | Requires new wiring | `CheckoutButton.tsx` calls `POST /api/plans/checkout` which collects **no payment** (Ghost provisioning only). To sell plans in Pi: swap to Pi payment → provision Ghost only after RELEASED |
| New desktop icon (app) | Overkill for Step 10 | DesktopIcons is server-rendered; needs client island + wallet gate on server page |

## 3. Server-side endpoints (exist — under `src/app/api/pi/payment/`)

```
approve/route.ts     POST — zod → rate-limit → requireAuth → IDOR (paymentData.user_uid === auth.user.piUid)
                           → Pi GET /v2/payments/{id} → POST /v2/payments/{id}/approve (Authorization: Key)
                           → persist ESCROWED (amount/memo/metadata from the GET, not the approve payload)
complete/route.ts    POST — validates paymentId+txid → POST /v2/payments/{id}/complete → RELEASED
                           + XP award + tier + KYC upgrade (atomic Prisma tx)
incomplete/route.ts  POST — auto-resolves stuck payments during auth
```

State machine: `PENDING → ESCROWED → RELEASED` (`prisma PiPayment`). Consumption gates: `skills/[slug]/install`, spend-request design.

## 4. Backend readiness for Pi Server-Side calls

| Check | Status |
|---|---|
| `/v2/payments` GET/approve/complete contract, `Authorization: Key` | ✅ approve/route.ts:66-94 |
| IDOR / ownership enforcement | ✅ `user_uid` vs authenticated `piUid` (approve:82) |
| Validation, rate limits, secret handling, error shape | ✅ zod + `RATE_LIMITS.payment` + `process.env` guard |
| Escrow + side effects (XP/tier/KYC/ledger/PostHog) | ✅ complete route |
| Tests | ✅ `src/__tests__/lib/pi-sdk.test.ts`, `docs/PI_SANDBOX_TESTING.md` e2e, payment tests under `src/__tests__/api/` |
| **`PI_API_KEY` in Production/Preview** | 🔴 Audit (2026-08-13) found it only in Development. **Correction (same day):** earlier env listing was truncated at 40 rows and missed a 46-day-old Production row; the founder then supplied the launch key and it was replaced in Production + added to Preview (main branch); new deployments carry it. The `500 "Payment system not configured"` earlier reported is an **inference from the missing environment, not an observed response** |
| Network mode | 🟡 Production env: `NEXT_PUBLIC_PI_NETWORK=testnet`, `NEXT_PUBLIC_PI_SANDBOX=true` — correct for sandbox testing; must flip to mainnet + a mainnet API key before real payments |
| i18n for new UI | 🟡 bundles are en/ar/zh (no HI); new keys go in `src/i18n/{en,ar,zh}.json` |
| Non-Pi-Browser UX | 🟡 `createPayment` requires Pi Browser; gate with existing `PiBrowserBanner` |

## Verdict

The payment pipeline (SDK init → button → createPayment → server approve/complete → escrow → side effects) is **fully built and exercised by 2 working UI surfaces** — the DonateWithPiCard on Home/Wallet tabs and the skills-install gate (`src/app/api/skills/[slug]/install/route.ts`) — plus the spend-request *design* (`docs/superpowers/specs/2026-07-07-axiomid-spend-request-design.md`) which is **not built**. Step 10 needs:

1. Founder action: add the Pi **sandbox API key** to Vercel Production + Preview (key from developer.minepi.com)
2. One new dashboard payment card reusing `createPiPayment` (clone `DonateWithPiCard`)
3. Sandbox test end-to-end in the Pi Browser

Go-live: flip `NEXT_PUBLIC_PI_NETWORK=mainnet` + deploy with a mainnet API key.
