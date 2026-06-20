<div align="center">
  <img src="./public/axiomid-banner.png" alt="AxiomID" width="100%" />
</div>

# AxiomID

**Decentralized identity protocol for Pi Network.** W3C DIDs, Verifiable Credentials, zero-knowledge proofs of humanity. No hardware, no iris scans.

| Status | Stack | Tests |
|:---|:---|:---|
| Beta V1.0.0 | Next.js 16 · Prisma · PostgreSQL | 852 passing |

---

## What It Does

1. **DID Layer** — `did:axiom:axiomid.app:pi:{uid}` per user. W3C-compliant, self-sovereign.
2. **Verifiable Credentials** — Cryptographically signed stamps (social, KYA, KYC). Each stamp is a VC.
3. **Trust Engine** — Physics-inspired algorithms (thermodynamics, information theory, graph theory). Trust score = XP (70%) + stamps (30%).
4. **Agent Passports** — Autonomous agents get public identity cards with verification badges and trust scores.
5. **Skills Marketplace** — Install agent capabilities. Agents execute skills in isolated sandboxes.

### Trust Tiers

| Tier | XP | What It Means |
|:---|:---|:---|
| Visitor | 0 | Unverified. Limited access. |
| Citizen | 100 | Basic proof of humanity. Social accounts connected. |
| Validator | 500 | Active wallet, transaction history. |
| Sovereign | 1000 | High reputation. Financial stake. Vouching power. |

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router), CSS variables, Framer Motion
- **Backend:** Vercel serverless + Cloudflare Workers
- **Database:** PostgreSQL via Prisma + D1 sync
- **Auth:** Pi Network SDK + Web3 wallet
- **CI/CD:** GitHub Actions → Vercel (auto-deploy on push)

---

## Quick Start

```bash
git clone https://github.com/Moeabdelaziz007/AxiomID.git
cd AxiomID
npm install
cp .env.example .env.local   # fill in DATABASE_URL, PI_API_KEY, auth secrets
npx prisma migrate deploy && npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Backend (Cloudflare Worker)

```bash
cd backend && npm install
npx wrangler d1 execute axiomid-edge --file=./migrations/0001_init.sql
npx wrangler d1 execute axiomid-edge --file=./migrations/0002_seed_skills.sql
echo "token" | npx wrangler secret put SHARED_SECRET_TOKEN_VERCEL_CF
npx wrangler deploy
```

---

## Testing

```bash
npm test           # 852 tests
npm run lint       # 0 errors, 0 warnings
npx tsc --noEmit   # type check
```

CI runs on every PR: type-check → lint → tests. Vercel deploys preview URLs automatically.

---

## API

### Vercel (`axiomid.app`)

| Route | Method | Description |
|:---|:---|:---|
| `/api/auth/connect` | POST | Wallet authentication |
| `/api/auth/pi` | POST | Pi Network auth |
| `/api/did-document` | GET | DID document |
| `/api/passport/[slug]` | GET | Public passport |
| `/api/skills/[slug]` | GET/POST | Skill details + reviews |
| `/api/agent` | POST | Agent CRUD |
| `/api/stamp/claim` | POST | Claim a stamp |
| `/api/status` | GET | Network status |

### Cloudflare (`axiomid-backend.workers.dev`)

| Route | Method | Description |
|:---|:---|:---|
| `/status` | GET | Network status |
| `/mcp` | POST | MCP Server — 11 tools |
| `/api/trust/:did` | GET | Trust chain resolution |
| `/api/search` | GET | Semantic search (Workers AI + Vectorize) |

Full docs: [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) · [`STRATEGY.md`](./STRATEGY.md)

---

## Contributing

PRs require passing CI (type-check, lint, tests) and at least one CodeRabbit review.

```bash
git checkout -b feat/my-feature
# make changes
npm test && npm run lint && npx tsc --noEmit
git push origin feat/my-feature
# open PR
```

---

## License

Proprietary — All Rights Reserved © 2026 Mohamed Abdelaziz. See [`LICENSE`](./LICENSE).
