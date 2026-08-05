# AxiomID Branch Strategy

> Updated: 2026-07-10
> Baseline: main — 0 TS errors, 187 suites / 3,208 test cases passing (verified via grep it/test count, 20 Jul 2026)

## Current Branches

| Branch | Purpose | Status |
|:---|:---|:---:|
| `main` | Production-ready, auto-deployed to Vercel | Active |
| `feat/vanity-subdomain` (PR #299) | `*.axiomid.app` subdomain routing + Settings UI | Open |
| `feat/iqra-d3-mesh` (PR #300) | D3.js neural mesh, trust graph, MemoryTab | Open |
| `feat/marketplace-aix-adoption` (PR #301) | AIX adoption phases 3-6 (SOUL, x402) | Open |
| `feat/marketplace-enhancements` (PR #302) | Onboarding fix, strict TS cleanup | Open |
| `feat/did-json-well-known` (PR #303) | `/.well-known/did.json` route | Open |
| `fix/d3-mock-lint` (PR #304) | Test helpers refactor, delete dead tests | Open |
| `chore/codebase-cleanup` (current) | Dead code removal, doc updates, hygiene | In progress |

## Workflow

1. All feature branches created from `main`
2. Rebase onto `main` before merging
3. Merge after CI passes + review (no force-merges)
4. All branches kept for at least one release cycle

## Merge Order

#304 (hygiene, lowest risk) → #303 (DID, isolated) → #302 (marketplace fixes) → #299 (vanity subdomain) → #301 (AIX) → #300 (IQRA, largest blast radius)
