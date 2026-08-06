# PACKAGE_SPLIT_PROPOSAL — Layer Mapping

Ratified 7-layer topology (2026-08-06). Maps monorepo slices → protocol repos, by layer, bottom-up. Verified against real cross-package imports.

## Layer 0 — Infrastructure / Runtime
| Slice | Action |
|---|---|
| `workers/pai-7loop-router` | already split → `pai-gateways` (7loop edge routing) |
| `workers/subdomain-redirect` | already split → `pai-gateways` (wildcard *.axiomid.app) |
| `backend/src/mcp` | slice out → `pai-mcp` (JSON-RPC /mcp, A2A server) |

## Layer 1 — Identity & Memory
| Slice | Action |
|---|---|
| `AxiomID` (app, DID issuer, TrustChain) | stays — center of identity (AIP) |
| `openidentity.md` / VitePress repo | stays as AIP spec; VitePress repo is duplicate → delete |
| `packages/identity-did` | stays under AxiomID (AIP impl) |
| `packages/crypto` | **core slice — keep FIRST** (imported ×7 by aip/signin, kya/register, lib) |
| `packages/alphapi` | candidate move → `PAI-Memory` (alphabetic API facade) |
| `PAI-Memory` + `AxiomID.Memory/` | stay — memory layer (AIP-Memory) |

## Layer 2 — Auth / Attestation
| Slice | Action |
|---|---|
| `src/lib/pi-sdk.ts`, `api/pi/kya/register`, `api/pi/aip/signin` | slice → `axiomid-piverify` (PiVerify) — leave behind thin facade on AxiomID |
| `packages/did-integrity-guard`, `packages/reputation` | stay in AxiomID (KYC/KYA evidence + trust scoring) |
| `skills/trust-scoring` | sync with `packages/reputation` (single source of trust) |
| evidence storage | `PAI-Memory` (KYC/KYA evidence annex) |

## Layer 3 — Protocols (A2A / PPP)
| Slice | Action |
|---|---|
| `backend/src/mcp` | slice → `pai-mcp` (A2A server) |
| new repo | **create `pai-ppp`** — Portable Profile Protocol: signed/encrypted memory packs, Pi tx anchoring, platform-portable import/export |
| `skills/agent-memory` | move under `pai-ppp` (memory-pack producer) |
| `packages/sim-loop` | candidate move → `pai-ppp` (simulate PPP exchanges) |

## Layer 4 — Runtime Control / Orchestration
| Slice | Action |
|---|---|
| `packages/pai-drv` | stays → `pai-agent-kit` (ARC runtime control) |
| `packages/pai-agent-app-models` | stays under AxiomID until `pai-core` exists; then move |
| `packages/iqra-policy-agent` | stays — policy model runs post-execution (ARC policy gate) |

## Layer 5 — Discovery + Registry
| Slice | Action |
|---|---|
| `packages/llm-registry` | stays — model router data (AOR §5) |
| `skills/` (skills registry) | → `pai-skills` (ADP registry) |
| `pai-atom` (ABI) | new repo or inside `pai-skills` — decision: inside `pai-skills` for now |

## Layer 6 — TrustChain / Audit
| Slice | Action |
|---|---|
| TrustChain bits in `AxiomID` | stay — append-only signed ledger, Pi tx anchoring |
| `PAI-Protocol` (PPP anchoring) | new repo — PPP anchors there; add CrossRepo pointer in `packages/crypto` TrustChain API |

## Layer 7 — Consumer Products
| Slice | Action |
|---|---|
| Agent Control Center (axiomid.app) | stays — consumer of Layers 1–6 |
| `PAI-Gspace` | consumer — marketplace, labor, Universe UI |
| subdomains earn/skills/memory/mcp/agdp | capability one-pagers (WS2) |

## Consolidation rules (per user risk flags)
1. **KYC/KYA**: never auto-convert human KYC to agents without human review — approval layers + audit trails stay in `axiomid-piverify`; no merge before dependency map is green.
2. **Pi SDK**: browser-only — `axiomid-piverify` keeps `window.Pi` mocks; Node tests must not import it directly.
3. **Repo sprawl**: map first (this doc + topology.dot), then split, then merge. Do not touch `openidentity.md`.

## Ordering
1. `pai-gateways` (workers already split — move only)
2. `pai-mcp` (slice backend/src/mcp)
3. `axiomid-piverify` (slice Pi routes + facade)
4. `pai-ppp` (new, greenfield)
5. `pai-skills` (registry + atom ABI)
6. `PAI-Protocol` (TrustChain anchoring)
