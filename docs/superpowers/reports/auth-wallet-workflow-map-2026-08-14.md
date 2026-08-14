# AxiomID Auth & Wallet Workflow Map — Gap Report

> 2026-08-14 — research-only audit (no code changed). Three parallel explorers: auth flows, wallet flows, duplication/UI organization. All findings cross-referenced file:line.

## 1. Authentication surface — what actually exists

**Pi token auth (primary)**: `Pi.authenticate()` → `POST /api/auth/pi` (rate-limited 5/min, Zod, prod always verifies via `api.minepi.com/v2/me`, UID match enforced, Stellar `^G[A-Z2-7]{55}$`, user upsert + DID + encrypted token) → Bearer `pi_access_token` in localStorage → `requireAuth()` (JWKS verify + Pi UA-gated fallback + 5-min SHA-256 cache) → `GET /api/user/status`.

**OAuth redirect fallback**: `accounts.pinet.com/oauth/authorize` → `/signin/callback` → same `POST /api/auth/pi`.

**Google connect**: `/api/auth/google` — verifies ID token, **creates no user record** (used only in `/onboarding` step 1).

**Demo mode**: client-only fake user, non-persistent in prod.

**Middleware does NO auth** — CORS/host/rewrites only; every page incl. `/dashboard` serves unauthenticated; all gating is client-side.

## 2. Wallet & payment surface

- Connect: `use-wallet-auth.ts connectWallet` (sandbox dev-token / Pi SDK / OAuth fallback) + `restoreSession` on load (auto-`authenticate` in Pi Browser).
- Payments: `createPiPayment` (pi-sdk.ts:480) → `/api/pi/payment/approve` (IDOR-guarded, ESCROWED) → `/complete` (RELEASED + XP/tier/KYC upgrade, atomic tx). 4 client consumers: DonateWithPiCard (2 mounts!), PiPaymentTestCard, SpendRequestsPanel, marketplace install.
- Spend requests: create/list/approve/reject + SSE stream route (UI polls instead).
- Skill install: paid via Pi payment consumption (`amount >= pricePi`, `metadata.skillId`), x402 `/pay` route unused by UI.
- Plans checkout: Ghost provisioning only — no Pi billing (documented roadmap defer).

## 3. Top findings (severity-ranked)

### 🔴 Critical
1. **SpendRequestsPanel cannot authenticate — entire flow broken.** Every fetch (list/approve/reject) sends **no Authorization header** (SpendRequestsPanel.tsx:53,76-80,92-96,106-110,123-130); all spend-request routes require `requireAuth` → constant 401s.
2. **Logout is cosmetic; revocation is dead.** Header logout clears 2 localStorage keys only — never calls `/api/auth/logout` (server token stays valid, DB `piAccessToken` keeps living). The server-invalidating path `disconnectWallet()` has **zero UI callers**; `revokeToken()` is never invoked in any production path.
3. **Settings "Wallet Connection" disconnect always fails.** Settings sends `platform: connect_wallet/security_circle/complete_kyc` to `/api/social/disconnect` which accepts only `{twitter, discord, google}` → 400 every time.
4. **OAuth fallback likely broken in regular browsers.** `requireAuth`'s fallback after JWKS failure requires a Pi-Browser User-Agent (auth-middleware.ts:196-199) — regular-browser OAuth sessions hit `UNAUTHORIZED "Pi Browser required"` on every protected call.
5. **Hard KYC dead-end in two onboarding flows.** Claim step 2 and `/onboarding` step 3: non-VERIFIED user can never proceed (no retry guidance, no pending path); "Payment Proof" checklist item is decoratively unsatisfiable.

### 🟠 High
6. **Three divergent onboarding experiences** — `/claim` (3-step), `/onboarding` (4-step + Google), dashboard `OnboardingModal` (3-step); different steps, gates, completion flags (`axiom_onboarding_completed` vs `axiomid_info_modal`); no single "onboarded" source of truth.
7. **Provider stack mounted twice** — `layout.tsx:191-207` AND `providers.tsx:17-29` both mount ThemeProvider/LanguageProvider/WalletProvider/MotionConfig.
8. **Two fixed mobile bottom navs overlap** on `/dashboard` (`page.tsx:219-232` 7-tab bar + `layout.tsx:55-72` 2-item bar, both `fixed bottom-0 z-50`).
9. **Skill execute bypasses payment/install gate** — any authed user executes any skill (execute/route.ts:13-77), inflating install/execution stats.
10. **x402 cross-skill check is a silent no-op** — `pay/route.ts:83` checks `meta.skillSlug`; clients write `meta.skillId` → guard never fires.
11. **`/api/pi/payment/incomplete` is dead** — SDK re-implements approve-then-complete inline (pi-sdk.ts:297-347); route never called; logic drifts.
12. **Duplicate payment cards** — DonateWithPiCard (2 mounts: HomeTab+WalletTab) vs PiPaymentTestCard: near-identical bento shell, button recipe, error toast, success state. Merge into one prop-driven `<PiPaymentCard>`.
13. **`xpEarned` returns new balance, not delta** (complete/route.ts:172 vs 122) — misleading API contract; ledger reason `'action_claim'` mislabels payments.
14. **Demo mode misdetected** — demo wallet is `pi:demo_alice` but `isDemoWalletAddress` checks `demo:` prefix (wallet-types.ts:46-48) → cleanup never fires; prod demo session dies on reload via error path.

### 🟡 Medium
15. **6 connect-wallet buttons, 5 class recipes** (dashboard page, HeaderActions, settings, onboarding, OnboardingModal, ConnectStep) — same action, mixed `t("connect")`/`t("connect_wallet")` keys.
16. **8 wallet-address truncation recipes** (6-12 head / 4-8 tail) across WalletTab, SettingsTab, ConnectStep, PassportCard, leaderboard, explorer, NetworkGraph — one `formatWalletAddress` util + `<WalletAddressBadge>`.
17. **Dead code**: routes `auth/connect`, `auth/state`, `pi/ads/verify`, `pi/aip/signin` (also broken: `SOVEREIGN_KEY_SALT` missing), `admin/skills*`, `agents*`, `daily-review`, `emulate`, `presence/heartbeat`, `stream`, `telegram`, `vault/stake`; components `AgentStatsCard`, `PiBrowserBadge`, `QuickLinksCard`, `StatsBar`, `LanguageSwitcher`, `pai/Header.tsx`, `pai/PAIHeader.tsx`, both barrels, `dashboard/sandbox/` shell; libs `oauth-state.ts`, `initiatePiSignIn`.
18. **3 language-switcher implementations** (LanguageToggle used; LanguageSwitcher 313-line + pai/Header local both dead).
19. **29 files use `(en, ar)` tuple t() bypassing i18n JSON** — makes Chinese impossible on those surfaces (landing/*, claim, onboarding, agent pages, ui/*).
20. **zh.json missing 68 keys** vs en (revenue + status vocabulary); en↔ar in sync (711 each).
21. **Revenue tab is static mock data** (hardcoded WALLET_ADDRESS, RevenueTab.tsx:54) behind auth — fabricated numbers shown to users.
22. **`axiomid_uid/axiomid_username/axiomid_access_token` dead localStorage keys** written only in callback; callback bypasses context state, hard-redirects, relies on reload.
23. **Mobile logout hidden** (`hidden sm:flex`, HeaderActions.tsx:65); 3-channel error UI for one failure (context ErrorBanner + Header local + walletLogs).
24. **Triple Pi-Browser detection** (wallet poll ×2 + PiBrowserGuard 500ms) can disagree transiently; `PiBrowserGuard` never actually blocks (renders children both branches).
25. **`/signup` not redirected** (only /login, /register); DeployStep promises "mint your passport NFT" — no mint exists; claim-ceremony store + `/api/agent/identity*` only exercised by tests.

## 4. Merge directions (Phase 2 candidates)

1. **Auth**: wire header logout → `disconnectWallet()` → `/api/auth/logout` (+ optional revocation); single Pi-browser detection hook; fix OAuth fallback UA gate (relax to verified-token only in sandbox, keep UA check for prod web?); unify 3 onboarding flows behind one flag; remove hard KYC dead-ends (add pending/retry states); delete `auth/connect`+`auth/state`; fix `SOVEREIGN_KEY_SALT` env.
2. **Wallet**: `Authorization` header into SpendRequestsPanel; align settings platform list with `DISCONNECTABLE`; merge payment cards → `PiPaymentCard`; `formatWalletAddress` util; fix `xpEarned` delta contract; gate execute route on install/paid; fix x402 skillSlug check.
3. **Housekeeping**: single provider mount; drop one mobile nav; delete dead components/routes; kill tuple-t() files → JSON i18n (or `t2(en,ar)` in context); backfill 68 zh keys; mark RevenueTab mock or wire live data; `PiBrowserGuard` enforcement decision.
