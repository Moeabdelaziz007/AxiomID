# ROADMAP — PAI Universe (2026-08-06)

Ordered by layer dependency. Each issue assignable to an agent; `[Wn]` = WS phase.

## Phase A — Foundation (Layers 0–1)
- [ ] **A1** `pai-gateways` repo: move `workers/pai-7loop-router` + `workers/subdomain-redirect` → `pai-gateways`; add vercel.json, README, AGENTS.md. *(moves only — 1h)*
- [ ] **A2** `pai-mcp`: slice `backend/src/mcp` → `pai-mcp`; keep JSON-RPC /mcp contract; leave facade route on AxiomID backend. *(2h)*
- [ ] **A3** `axiomid-piverify`: slice `src/lib/pi-sdk.ts` + `/api/pi/kya/register` + `/api/pi/aip/signin`; approval layers + audit trails; `window.Pi` mock test suite. *(3h)*
- [ ] **A4** Repo hygiene: delete VitePress `openidentity` duplicate repo (never `openidentity.md`); add `pai-list/AGENTS.md`; subdomain table → pai-docs. *(30m)*

> **Identity architecture (ADR 011):** AxiomID is a **sovereign Identity Provider** — no external auth providers (Google/Apple/Microsoft). We replicate OIDC/OAuth 2.0 + offline TOTP (RFC 6238) patterns in-house; **"Sign in with AxiomID"** is the standard SSO for all surfaces. Pi Network remains root human verification (L1).

## Phase B — Protocols (Layers 3, 5)
- [ ] **B1** `pai-ppp` (new): spec + signed memory pack format (Ed25519, Pi tx anchoring), import/export, `agent-memory` as first producer. *(4h)*
- [ ] **B2** `pai-skills`: move `skills/` registry + `pai-atom` ABI inside; ADP discovery endpoint. *(2h)*

## Phase C — Runtime + Trust (Layers 4, 6)
- [ ] **C1** ARC in `pai-agent-kit`: consolidate `pai-drv` + `pai-agent-app-models`; post-execution policy gate via `iqra-policy-agent`. *(3h)*
- [ ] **C2** TrustChain: extract append-only signed ledger from AxiomID into `PAI-Protocol`; Pi tx anchoring; CrossRepo pointer in `packages/crypto`. *(3h)*

## Phase D — Consumers (Layer 7)
- [ ] **D1** WS2: `pai-subdomains` — capability one-pagers (earn/skills/memory/mcp/agdp) via hostname switch. *(2h)*
- [ ] **D2** WS3: `@pai/adk` v1 — `npx init` generates AOR scaffold (agentic.txt, llms.txt, constitution.json, runtime.json, memory/, workspace/, skills/). *(4h)*
- [ ] **D3** WS4: Execution Graph → Economic Graph → aGDP (deferred until real economy data). *(TBD)*
- [ ] **D4** WS5: root files per repo (`agentic.txt`, `CONSTITUTION.md`, `CAPABILITIES.json`; AxiomID has AGENTS.md + SECURITY.md). *(30m/repo)*

## Not in scope (deferred)
- aGDP (needs economy data from D3 first)
- Old landing component cleanup (tests reference them — separate PR)
- Claim-flow payment PR + PR 423 — **awaiting user Vercel test** (do not touch)

## Verify before claiming done
`topology.dot` renders; each moved slice passes its existing tests; no `@axiomid/sdk`-only-in-tests regressions.
