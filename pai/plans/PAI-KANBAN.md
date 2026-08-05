# PAI — Global Workspace Kanban

> Global Workspace Theory (GWT) applied to PAI architecture
> Each card = a node/edge in the topology. Topological gaps = missing cards.

---

## 🟢 PHASE 1 — PLUG CRITICAL GAPS (This Week)

```
┌──────────────────────┬──────────────────────┬──────────────────────┐
│       T1             │       T2             │       T3             │
│ Populate pai-mcp     │ Populate pai-agent-  │ Deploy MCP worker    │
│ (gateway code from   │ kit (runtime from    │ to pai-mcp.amrikyy.  │
│ pai/kits/pai-mcp-    │ pai/kits/agentkit/)  │ workers.dev          │
│ gateway/)            │                      │                      │
│ Deps: CF_API_TOKEN   │ Deps: —              │ Deps: T1, CF_TOKEN   │
└──────────────────────┴──────────────────────┴──────────────────────┘
┌──────────────────────┬──────────────────────┬──────────────────────┐
│       T4             │       T5             │       T0             │
│ Create pai-list/.    │ Push profile README  │ Create classic PAT   │
│ github profile repo │ to Moeabdelaziz007   │ (blocks T4,T5,T8,T9) │
│ with org README      │ (profile repo)       │                      │
│ Deps: Classic PAT    │ Deps: Classic PAT    │ 🛑 BLOCKING          │
└──────────────────────┴──────────────────────┴──────────────────────┘
```

## 🟡 PHASE 2 — WORKSPACE INFRASTRUCTURE (This Month)

| ID | Task | Effort | Deps |
|:--:|------|:------:|:----:|
| T6 | Fix Vercel build → `axiomid.app` HTTP 200 | 2d | — |
| T7 | Register `pai.build` DNS in Cloudflare | 1h | Domain access |
| T8 | Create CF_API_TOKEN → .env + GitHub secrets | 30m | CF owner |
| T9 | Rotate 22 leaked secrets (see SECURITY_REMEDIATION.md) | 1d | Classic PAT |
| T10 | Set up Turnstile on `axiomid.app` | 1h | CF_API_TOKEN |
| T11 | Populate `pai-atom` (design system) | 4h | — |
| T12 | Populate `pai-cli` (CLI tool) | 3h | — |
| T13 | Populate `pai-skills` (skills registry) | 2h | — |
| T14 | Populate `pai-startkit` (starter template) | 2h | T2 |
| T15 | Populate `axiomid-piverify` (Pi worker) | 3h | CF_API_TOKEN |

## 🔵 PHASE 3 — GLOBAL WORKSPACE ENHANCEMENT

| ID | Task | Effort | Deps |
|:--:|------|:------:|:----:|
| T16 | Build PPP broadcast protocol (agent state sync via DO) | 1w | T2,T6 |
| T17 | Integrate BYE → HAI edge (entry → trust) | 3d | T6 |
| T18 | Build INDUCT → BUY edge (self-play → marketplace) | 4d | T6 |
| T19 | Global Workspace viz at `/ppp/topology` | 2d | T6,T11 |
| T20 | Connect TRY → ACP (sandbox ↔ marketplace) | 3d | T2,T6 |

## 🟣 PHASE 4 — OUTREACH

| ID | Task | Target | Priority |
|:--:|------|--------|:--------:|
| T21 | Email bhupendra05 (AION × AxiomID) | bhupendra05 | 🅰️ |
| T22 | Reply to Shang (AWS trial) | AWS Partner | 🅰️ |
| T23 | Follow + DM 0xVertex | 0xVertex | 🅰️ |
| T24 | Follow + DM chrisipanaque | chrisipanaque | 🅰️ |
| T25 | Follow + DM bytenmn | bytenmn | 🅱️ |
| T26 | Follow + DM Scottcjn | Scottcjn | 🅱️ |

---

## Global Workspace Principles (Anthropic Research Applied)

> *"A piece of information becomes consciously accessible when it gains entry to a small shared channel, the workspace, which is broadcast to other systems that can see it."*

| GWT Property | Implemented As | Status |
|:-------------|:---------------|:------:|
| **Globally accessible** | PPP protocol — every endpoint can read/write | 🟢 Topology defined |
| **Limited capacity** | Priority queue + relevance filter | 🟡 Designed, not built |
| **Broadcast** | Durable Objects state sync | 🟢 DO exists (PRESENCE_DO) |
| **Emergent** | Self-organizing agent connections | 🧬 Future (Phase 3) |
| **J-space (silent thinking)** | Agent internal state not broadcast but readable | 🧬 Future |
| **Influenceable** | PPP signals can steer agent behavior | 🧬 Future |

---

## Quick Reference — All 22 Tasks

```
Now → T21,T22,T23,T24 (outreach — takes 5 min each)
     → T0 (classic PAT — blocks everything else)

This week → T1,T2,T3 (populate empty repos — 5h total)
          → T4,T5 (push READMEs — 1h)
          
This month → T6 (Vercel fix — 2d) 
           → T7,T8,T9,T10 (infra — 2d)
           → T11,T12,T13,T14,T15 (populate rest — 14h)

Next month → T16,T17,T18,T19,T20 (workspace — 2.5w)
```
