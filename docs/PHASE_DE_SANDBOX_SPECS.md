# PHASE D + E SPECS — MCP APP WINDOWS · DEFENSE SANDBOX · BUDGET ROUTING

Sources: Anthropic code-execution-with-mcp (2026-04), MCP Apps spec (2026-07-28), Farzulla Autonomous Red Team PDF, studiofarzulla/adversarial-security-agents, ralph-playbook sandbox-matrix, mnott/PAI, DeepSeek V4/R2, E2B docs. All from the user's NotebookLM artifact 1; ⚠ = claim still unverified against primary source.

---

## A. MCP APPS — WINDOW ↔ GATEWAY PROTOCOL (Phase D, upgrades WorkspaceGrid/A5)

**Shape.** Every Aura OS window is an MCP app surface. URL = `https://<subdomain>.axiomid.app`, driven by **JSON-RPC 2.0 over window.postMessage** — the sandboxed iframe already deployed in A5 is the transport.

**Envelope.**

```json
{ "jsonrpc": "2.0", "id": 1, "method": "mcp.app/open",
  "params": { "capability": "skills", "session": "s_…", "meta": {} } }
```

**Channels.**
- **request/response** — window → gateway → capability proxy → window (AIP-scoped, zero raw keys)
- **structuredContent** — machine-typed payloads replace HTML scraping; UI renders schema, never parses HTML
- **App State** — `mcp.app/state.change` events pushed to the window (window stays live; dock icon reflects state)
- **_meta** — session bookkeeping, budget, loop id (links to AGENT_LOOP_ARCHITECTURE gold/evidence)

**Security.**
- Origin-pinned: window verifies `event.origin === "https://axiomid.app"`; gateway binds a channel token to the session
- iframe `sandbox` stays `allow-scripts allow-same-origin allow-forms allow-popups`; comms exclusively via `window.parent.postMessage`
- Capability scope (skills/earn/memory/identity/node) maps 1:1 to scoped AIP tokens — new-tab debt disappears, everything becomes a dock window

---

## B. DEFENSE SANDBOX + AXIOM SHIELD (Phase E)

**DefenseSandbox** — isolated arena, E2B-hosted:
- UID 1000 non-root, 1 CPU / 1GB
- k3s + NetworkPolicies: default-deny egress, allowlist only
- No raw keys — scoped AIP tokens, same policy as prod

**5-phase loop (red/blue self-play, simulation only):**

| Phase | Who | Output |
|-------|-----|--------|
| 1 Audit | blue | expected-state ledger: services, endpoints, exposed surfaces |
| 2 Detect | monitors | drift vs ledger + suspicious traffic (live, cheap) |
| 3 Analyze | red | exploit path with evidence, severity |
| 4 Remediate | blue | patch + re-run gate (verify in-sandbox) |
| 5 Harden | blue | prevention rule: NetworkPolicy / WAF → ledger update |

Production is never touched by the arena; the hardened playbook is released as a deployed drill only on a human go. Follows the red-team playbook pattern (Farzulla): simulation in, rules out.

**Storytelling UX.** Incidents are stories, not logs: threat name, exploit path (visual ICCAN), impulse of the fix, prevention rule — quad-lingual (EN/AR/ZH/HI). The human reads "why" and "what's next", severity first.

---

## C. AURA PLAN — BUDGET-DRIVEN MODEL ROUTING (Aura Plan upgrade)

**Rule: trust tier → budget tier → model class.** Sandbox width widens with budget; routing is declared in the plan, not the code.

| Tier | Trust | Model class | Sandbox |
|------|-------|-------------|---------|
| Free / Pro | trust-0/1 (read-only, memory, docs) | DeepSeek V3/R1, Yi-300B — ~90% cheaper than frontier | Vercel Sandbox / E2B micro |
| Premium | trust-1/2 (state, executing) | frontier class | E2B + exe.dev |
| Business | trust-2/3 (money, identity) | frontier + evidence gates | full matrix + Shield |

**Pattern.** Pattern-question → cache hit (usually, cheap tier). Hard problem → frontier pass-through (rare, taxed like a camera token: "this token is spent, the math is on the receipt").

⚠ Verify before adoption: DeepSeek reported pricing (0.55/2.19 per artifact) against the live 2026 API; E2B <150ms boot claim. Both unverified.

---

Status: **A** = spec, Phase D (after PR #436 approval) · **B** = spec, Phase E · **C** = proposal, Aura Plan (after Phase B pilot). Nothing here is implemented.
