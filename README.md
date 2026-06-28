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
  <img src="https://img.shields.io/badge/tests-2855%20passing-brightgreen?style=flat-square" alt="Tests" />
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

Every identity on AxiomID has a **Trust Score** — an algorithmic reputation built from on-chain actions, not hype.

```json
{
  "did": "did:axiom:0x1234...a77x",
  "tier": "Sovereign",
  "trustScore": 94,
  "breakdown": {
    "xpWeight": 70,
    "stampWeight": 30
  },
  "stamps": ["KYA", "Twitter", "GitHub", "Pi Wallet"],
  "attestations": 12
}
```

**Live endpoint:** [`GET /api/passport/demo`](https://axiomid.app/api/passport/demo) — returns the full passport JSON.

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
| **Quran RAG** | AI-powered Q&A over 6236 Quranic verses via Vectorize + Workers AI |
| **Soul System** | Five-gate ethical evaluation loop — Muraqabah, Ethical, Sab'iyyah, Tawbah, Self-Review |

---

## SDK

```bash
npm install @axiomid/sdk
```

```typescript
import { getTrustScore, getPassport } from "@axiomid/sdk";

const trust = await getTrustScore("did:axiom:0x1234...a77x");
// { score: 94, tier: "Sovereign", breakdown: ... }

const passport = await getPassport("did:axiom:0x1234...a77x");
// { did, stamps, trustScore, attestations, ... }
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
| **CI/CD** | GitHub Actions → Vercel · 2855 tests, 122 suites |

---

## Testing

```bash
npm test           # 2855 tests, 122 suites
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
