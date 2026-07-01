<div align="center">
  <img src="./public/axiomid-banner.jpg" alt="AxiomID" width="100%" />
</div>

<h1 align="center">
  AxiomID gives humans sovereign control over their AI agents<br/>
  using portable DIDs and Pi Network.
</h1>

<p align="center">
  <em>The Human Authorization Protocol for AI Agents</em>
</p>

<p align="center">
  <a href="https://axiomid.app"><b>🌐 Live App</b></a> ·
  <a href="https://axiomid.app/passport/demo"><b>🛂 Demo Passport</b></a> ·
  <a href="https://axiomid.app/leaderboard"><b>📊 Leaderboard</b></a> ·
  <a href="https://github.com/Moeabdelaziz007/AxiomID"><b>⭐ Star on GitHub</b></a>
</p>

<p align="center">
  <a href="https://github.com/Moeabdelaziz007/AxiomID/actions"><img src="https://img.shields.io/github/actions/workflow/status/Moeabdelaziz007/AxiomID/ci.yml?branch=main&label=CI&style=flat-square" alt="CI" /></a>
  <a href="https://github.com/Moeabdelaziz007/AxiomID/releases"><img src="https://img.shields.io/github/v/release/Moeabdelaziz007/AxiomID?style=flat-square&color=blue" alt="Version" /></a>
  <img src="https://img.shields.io/badge/tests-3037%20passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square" alt="Next.js" />
  <img src="https://img.shields.io/badge/status-beta-orange?style=flat-square" alt="Beta" />
  <img src="https://img.shields.io/badge/works%20with-Pi%20Browser-8b5cf6?style=flat-square" alt="Pi Browser" />
  <a href="./CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" /></a>
</p>

---

> **⚠️ Beta Notice:** AxiomID is in active development. Features work in Pi Browser and modern browsers. Demo accounts are used during the closed beta phase. [Live status →](https://axiomid.app/status)

---

**Try it live:** [`axiomid.app/passport/demo`](https://axiomid.app/passport/demo) → See a real Sovereign passport with Trust Score, badges, and KYA verification. No wallet needed.

---

## Trust Score at a Glance

Every identity on AxiomID has a **Trust Score** — an algorithmic reputation built from verified stamps and experience points (XP). 

### Trust Calculation Formulas
AxiomID uses a dual-calculation mode based on input parameters (defined in [trust.ts](file:///Users/cryptojoker710/Desktop/AxiomID/src/lib/trust.ts)):

1. **Standard Mode (Fallback):**
   $$\text{Trust Score} = \text{XP Score} \times 0.7 + \text{Stamp Score} \times 0.3$$
   *(Clamped to 0-100)*

2. **Advanced Multi-Dimensional Mode (with Tenure & Semantics):**
   $$\text{Trust Score} = \text{XP Score} \times 0.5 + \text{Stamp Score} \times 0.2 + \text{Tenure Score} \times 0.1 + \text{Semantic Trust} \times 0.2$$
   - **Tenure:** Up to 50 days (2% per day, capped at 100%).
   - **Semantic Trust:** Dynamically computed based on agent reputation and peer vouches (0-100).

### API Passport Example

**Live endpoint:** [`GET /api/passport/demo`](https://axiomid.app/api/passport/demo) — returns the complete passport JSON:

```json
{
  "username": "AxiomID Agent",
  "walletAddress": "GD5...3H",
  "stellarAddress": "GB6...4K",
  "did": "did:axiom:pi:user123",
  "tier": "Sovereign",
  "xp": 1200,
  "trustScore": 94,
  "kyaStatus": "VERIFIED",
  "kycStatus": "VERIFIED",
  "stamps": [
    { "type": "KYA", "provider": "pi_network" },
    { "type": "WALLET_AGE", "provider": "stellar" }
  ],
  "issuedDate": "2026-06-25T12:00:00.000Z",
  "agentName": "SovereignNode1",
  "agentStatus": "ACTIVE",
  "agentPublicKey": "MGP..."
}
```

---

## Passport Example

When a user claims their identity, they get a **Sovereign Passport**:

| Field | Value |
|:---|:---|
| **DID** | `did:axiom:axiomid.app:pi:{uid}` |
| **Tier** | Visitor → Citizen → Validator → **Sovereign** |
| **Trust Score** | 0–100 (XP 70% + verified stamps 30%) |
| **Stamps** | KYA, Social, Pi Wallet, Agent Delegation |
| **Attestations** | Peer-signed reputation vouches |

**Claim yours in 3 steps:**

<div align="center">

| Step | Action | Time |
|:---:|:---|:---:|
| **1** | Connect Pi Wallet | 10s |
| **2** | Link Social Accounts | 30s |
| **3** | Deploy Your Agent | Instant |

</div>

Open [`axiomid.app/claim`](https://axiomid.app/claim) in **Pi Browser** or any modern browser.

---

## What AxiomID Does

| Layer | What It Does |
|:---|:---|
| **DID** | `did:axiom` — W3C-compliant, self-sovereign identity per user |
| **Verifiable Credentials** | Cryptographically signed stamps (social, KYA, KYC). Each stamp is a VC. |
| **Trust Engine** | Physics-inspired algorithm — trust score = `XP (70%) + stamps (30%)` |
| **Agent Passports** | Public identity cards with verification badges, trust scores, and attestation history |
| **Skills Marketplace** | Install capabilities for agents. Agents execute skills in isolated sandboxes. |
| **Truth RAG** | AI-powered Q&A over 6236 verses via Vectorize + Workers AI |
| **Soul System** | Five-gate ethical evaluation loop — Muraqabah, Ethical, Sab'iyyah, Tawbah, Self-Review |

### The Soul System (5 Ethical Gates)

AI Agent execution and code validation inside AxiomID are strictly guarded by the **Soul System** — a five-gate ethical evaluation loop designed to enforce sovereign safety, auditability, and absolute alignment (defined in [AGENTS.md](file:///Users/cryptojoker710/Desktop/AxiomID/AGENTS.md)):

1. **Muraqabah (Divine/Self Awareness):** Absolute intention verification. Every mutating action is logged.
2. **Ethical Boundaries:** Hard boundaries preventing code injections, unsafe sandbox functions, or malicious payload execution.
3. **Sab'iyyah (Cycle Synthesis):** Holistic cycle reflection. Balances opposing states (security vs usability) every 7 cycles.
4. **Tawbah (Self-Correction):** Fail-safe error tracking, logging, and proactive remediation logic.
5. **Self-Review (Internal Verification):** Evaluates agent execution parameters prior to final commitment.

### Dynamic Sandbox Mode

AxiomID automatically determines if the SDK operates in Sandbox mode via a fallback cascade sequence (implemented in [pi-sdk.ts](file:///Users/cryptojoker710/Desktop/AxiomID/src/lib/pi-sdk.ts)):

1. **Environment Variables:** Presence of `NEXT_PUBLIC_SANDBOX_DEV_TOKEN` configuration (development only).
2. **Hostname Check:** Dynamic checks for localhost, local LAN networks, or staging domains.
3. **Iframe Referrer:** If the frame parent is `sandbox.minepi.com`.
4. **Query Parameter:** Direct presence of the `?sandbox=true` parameter in the URL.

*Note: In production environments on custom domains (e.g. `axiomid.app`), sandbox mode is strictly disabled for security.*

---

## SDK

```bash
npm install @axiomid/sdk
```

```typescript
import { AxiomSDK } from "@axiomid/sdk";

// Initialize the SDK instance
const sdk = new AxiomSDK({ network: "mainnet" });

// Retrieve the verified trust score for a DID
const trust = await sdk.getTrustScore("did:axiom:pi:user123");
// { did: "did:axiom:pi:user123", score: 94, tier: "Sovereign" }

// Retrieve and verify the full sovereign passport
const passport = await sdk.verifyPassport("did:axiom:pi:user123");
// returns complete Passport object (username, did, stamps, trustScore, etc.)
```

---

## Quick Start

```bash
git clone https://github.com/Moeabdelaziz007/AxiomID.git
cd AxiomID
npm install
cp .env.example .env.local
# Fill in: DATABASE_URL, PI_API_KEY, SOVEREIGN_KEY_SALT, auth secrets
npx prisma migrate deploy && npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Backend (Cloudflare Worker)

```bash
cd backend && npm install
npx wrangler d1 execute axiomid-edge --remote --file=./migrations/0001_init.sql
echo "token" | npx wrangler secret put SHARED_SECRET_TOKEN_VERCEL_CF
npx wrangler deploy
```

### Local HTTPS Emulation for Pi Browser

Since the Pi Network SDK requires HTTPS in the browser environment, plain `http://localhost:3000` will fail silently in the Pi Browser. Use `portless` to spin up a local HTTPS gateway with auto-trusted certificates:

```bash
# Install portless globally (one-time)
npm install -g portless

# Run local HTTPS proxy pointing next dev
portless axiomid next dev
# -> https://axiomid.localhost
```

---

## Pages

| Route | Description |
|:---|:---|
| `/` | Landing — live network stats, trust tiers, hero |
| `/passport/[slug]` | Public passport viewer with OG metadata |
| `/claim` | 3-step onboarding (Connect → Verify → Deploy) |
| `/dashboard` | Authenticated dashboard with marketplace, settings |
| `/explorer` | Browse all registered agents |
| `/leaderboard` | Top 50 users ranked by XP |
| `/docs` | Full docs — stamps, SDK, API reference |
| `/status` | Live service health (DB, Stellar, Pi, Workers AI) |

---

## Trust Tiers

| Tier | XP | Access |
|:---|:---:|:---|
| **Visitor** | 0 | Limited. Basic read-only. |
| **Citizen** | 100 | Social stamps, basic agent access. |
| **Validator** | 500 | Agent delegation, marketplace install. |
| **Sovereign** | 1000 | Full trust, vault staking, vouching power. |

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| **Frontend** | Next.js 16 · React 19 · Framer Motion 12 · Tailwind 4 |
| **Backend** | Vercel Serverless · Cloudflare Workers |
| **Database** | PostgreSQL (Prisma 6) · D1 (edge sync) · Vectorize (semantic search) |
| **AI** | Workers AI — Llama 3.1 8B · BGE-small-en-v1.5 |
| **Auth** | Pi Network SDK · Ed25519 sovereign keys · W3C DID |
| **Storage** | Cloudflare KV · Vercel Blob |
| **CI/CD** | GitHub Actions → Vercel · 3037 tests, 132 suites |

---

## Testing

```bash
npm test           # 3037 tests, 132 suites
npm run lint       # 0 errors, 0 warnings
npx tsc --noEmit   # type check
```

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). PRs require passing CI.

```bash
git checkout -b feat/my-feature
# make changes
npm test && npm run lint && npx tsc --noEmit
git commit -m "feat(scope): description ۞"
git push origin feat/my-feature
```

---

## License

- **Application code:** Proprietary — All Rights Reserved © 2026 Mohamed Abdelaziz. See [`LICENSE`](./LICENSE).
- **`@axiomid/sdk`** and **`@axiomid/crypto`:** MIT licensed. Open for community use.
