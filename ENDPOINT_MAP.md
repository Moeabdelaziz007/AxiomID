# AxiomID — Full Endpoint Map & E2E Status
> Verified: 20 July 2026 via live curl + grep + find
> Branch: fix/security-p0-p1-hardening (PR #397)

---

## API Endpoints (63 total, 7,044 lines of route code)

### ✅ Live & Healthy (HTTP 200) — 8 endpoints

| Endpoint | Method | Lines | Status |
|:---------|:-------|------:|:-------|
| `/api` | GET | 39 | ✅ 200 |
| `/api/health` | GET | 126 | ✅ 200 |
| `/api/status` | GET | 90 | ✅ 200 |
| `/api/leaderboard` | GET | 69 | ✅ 200 |
| `/api/explorer` | GET | 114 | ✅ 200 |
| `/api/did-document` | GET | 103 | ✅ 200 |
| `/api/skills` | GET, POST | 246 | ✅ 200 |
| `/api/skills/tags` | GET | 45 | ✅ 200 |

### 🔒 Auth Required (HTTP 401) — 14 endpoints

| Endpoint | Method | Lines | Status |
|:---------|:-------|------:|:-------|
| `/api/admin/skills` | GET | 37 | 🔒 401 |
| `/api/agent/manifest` | GET | 85 | 🔒 401 |
| `/api/agents` | GET | 41 | 🔒 401 |
| `/api/credential-status` | GET | 95 | 🔒 401 |
| `/api/daily-review` | GET | 24 | 🔒 401 |
| `/api/diagnostics/logs` | GET, DELETE | 44 | 🔒 401 |
| `/api/passport/[slug]/verify` | GET | 151 | 🔒 401 |
| `/api/spend-request/[id]` | PATCH, GET | 191 | 🔒 401 |
| `/api/spend-request` | POST, GET | 130 | 🔒 401 |
| `/api/spend-request/stream` | GET | 112 | 🔒 401 |
| `/api/stamp` | GET | 48 | 🔒 401 |
| `/api/sync` | POST, GET | 443 | 🔒 401 |
| `/api/user/status` | GET | 121 | 🔒 401 |
| `/api/vault/stake` | GET, POST | 133 | 🔒 401 |

### ⚠️ 404 Not Found — 8 endpoints (may need slug or auth)

| Endpoint | Method | Lines | Status |
|:---------|:-------|------:|:-------|
| `/api/emulate/[...path]` | GET, POST, PUT, PATCH, DELETE | 76 | ⚠️ 404 |
| `/api/passport/[slug]` | GET | 168 | ⚠️ 404 |
| `/api/sandbox/dev-token` | GET | 41 | ⚠️ 404 |
| `/api/skills/[slug]` | GET, PATCH, DELETE | 276 | ⚠️ 404 |
| `/api/skills/[slug]/review` | POST, GET | 101 | ⚠️ 404 |
| `/api/skills/[slug]/stats` | GET | 60 | ⚠️ 404 |
| `/api/skills/[slug]/tags` | GET, PUT | 158 | ⚠️ 404 |
| `/api/skills/[slug]/versions` | GET | 58 | ⚠️ 404 |

### ❌ Server Error (HTTP 500) — 1 endpoint

| Endpoint | Method | Lines | Status |
|:---------|:-------|------:|:-------|
| `/api/og/passportx` | GET | 364 | ❌ 500 |

### 📨 POST-Only (not checked live) — 32 endpoints

| Endpoint | Method | Lines |
|:---------|:-------|------:|
| `/api/admin/skills/[id]` | POST | 88 |
| `/api/agent` | POST | 71 |
| `/api/agent/activate` | POST | 69 |
| `/api/agent/identity` | POST | 91 |
| `/api/agent/identity/claim` | POST | 53 |
| `/api/agent/main` | POST | 76 |
| `/api/agent/pause` | POST | 53 |
| `/api/agent/public` | GET | 77 (400) |
| `/api/agent/sign` | POST | 67 |
| `/api/agents/harvest` | POST | 56 |
| `/api/auth/connect` | POST | 91 |
| `/api/auth/logout` | POST | 44 |
| `/api/auth/pi` | POST | 212 |
| `/api/auth/state` | POST | 63 |
| `/api/diagnostics/capture` | POST | 50 |
| `/api/passport/[slug]/publish` | POST | 146 |
| `/api/pi/ads/verify` | POST | 144 |
| `/api/pi/kya/claim` | POST | 73 |
| `/api/pi/kya/verify` | POST | 195 |
| `/api/pi/payment/approve` | POST | 132 |
| `/api/pi/payment/complete` | POST | 179 |
| `/api/presence/heartbeat` | POST | 59 |
| `/api/sandbox/execute` | POST | 111 |
| `/api/skills/[slug]/execute` | POST | 77 |
| `/api/skills/[slug]/install` | POST, DELETE | 237 |
| `/api/skills/[slug]/pay` | POST | 100 |
| `/api/skills/[slug]/purchase` | POST | 22 |
| `/api/social/disconnect` | POST | 109 |
| `/api/stamp/claim` | POST | 203 |
| `/api/stellar/anchor` | POST | 63 |
| `/api/telegram` | POST | 73 |
| `/api/upload/presign` | POST | 171 |

---

## Page Routes (30 total)

### ❌ All 30 pages return HTTP 500

| Page | Lines | Status |
|:-----|------:|:-------|
| `/` | 78 | ❌ 500 |
| `/about` | 92 | ❌ 500 |
| `/claim` | 505 | ❌ 500 |
| `/dashboard` | 260 | ❌ 500 |
| `/dashboard/marketplace` | 942 | ❌ 500 |
| `/dashboard/settings` | 666 | ❌ 500 |
| `/diagnostics` | 147 | ❌ 500 |
| `/docs` | 365 | ❌ 500 |
| `/docs/[slug]` | 75 | ❌ 500 |
| `/explorer` | 235 | ❌ 500 |
| `/leaderboard` | 290 | ❌ 500 |
| `/offline` | 73 | ❌ 500 |
| `/onboarding` | 344 | ❌ 500 |
| `/pai` | 195 | ❌ 500 |
| `/pai/[locale]` | 162 | ❌ 500 |
| `/pai/blg` | 112 | ❌ 500 |
| `/pai/induct` | 302 | ❌ 500 |
| `/pai/new` | 258 | ❌ 500 |
| `/pai/ppp` | 420 | ❌ 500 |
| `/pai/ppp/media` | 172 | ❌ 500 |
| `/pai/ppp/topology` | 522 | ❌ 500 |
| `/pai/try` | 422 | ❌ 500 |
| `/pai/universe` | 194 | ❌ 500 |
| `/passport/[slug]` | 85 | ❌ 500 |
| `/pricing` | 304 | ❌ 500 |
| `/privacy` | 21 | ❌ 500 |
| `/signin/callback` | 129 | ❌ 500 |
| `/status` | 286 | ❌ 500 |
| `/terms` | 21 | ❌ 500 |
| `/agent/[username]` | 191 | (no response) |

---

## Well-Known Endpoints (6 total)

| Endpoint | Status |
|:---------|:-------|
| `/.well-known/agent-card.json` | ❌ 500 |
| `/.well-known/did.json` | ❌ 500 |
| `/.well-known/jwks.json` | ❌ 500 |
| `/.well-known/oauth-authorization-server` | ❌ 500 |
| `/.well-known/oauth-protected-resource` | ❌ 500 |
| `/.well-known/openidentity` | ❌ 500 |

---

## Summary

| Category | Total | Live (200) | Auth (401) | 404 | 500 | POST-only |
|:---------|------:|----------:|----------:|----:|----:|----------:|
| API endpoints | 63 | 8 | 14 | 8 | 1 | 32 |
| Page routes | 30 | 0 | 0 | 0 | 30 | - |
| Well-known | 6 | 0 | 0 | 0 | 6 | - |
| **Total** | **99** | **8** | **14** | **8** | **37** | **32** |

## Root Cause Assessment

The HTTP 500 on all pages and well-known endpoints indicates a **Vercel server-side rendering crash**, NOT individual route bugs. The API routes that work (health, status, leaderboard, explorer, did-document, skills) are likely edge runtime or don't depend on the same SSR infrastructure.

**Likely causes (need investigation):**
1. Missing environment variables in production (DATABASE_URL, PI_API_KEY, etc.)
2. Prisma client not generated in production build
3. A shared import (layout, middleware, or context) crashes on server-side render
4. The CI syntax error (now fixed) may have caused a broken production build

**The CI fix in this PR (#397) should unblock CI. Once CI passes and a new production build deploys, the 500s may resolve.**
