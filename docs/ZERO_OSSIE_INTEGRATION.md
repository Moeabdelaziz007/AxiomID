# ZeroLang + Apache OSSIE × AxiomID — Expert Integration Map

> Not "use Zero to write scripts." Not "export a KPI schema."  
> This is how **graph-first programs** and **vendor-neutral semantic models** become the **substrate of agent identity, authorization, and trust**.

---

## 1. What these systems actually are

### Zerolang (zerolang.ai / vercel-labs)
An **agent-first programming language** where:
- The **graph is the program** (not source text as source of truth)
- Humans state **outcomes**; agents submit **checked graph patches**
- Compiler validates **shape, types, stale-state, graph hashes** before mutation
- Readable `.0` projections exist for human review only

Core loop:

```
Human outcome → Agent graph patch → Compiler check → Hash-guarded commit → Projection for review
```

### Apache Ossie (formerly Open Semantic Interchange / OSI)
An **industry semantic model interchange** standard:
- JSON/YAML semantic models as a **single source of truth** for metrics, entities, relationships
- Vendor-neutral bridge across BI, analytics, and AI tools
- Converters (dbt, GoodData, Polaris, Salesforce, …)
- Schema validation tooling

Core problem Ossie solves:

```
Same KPI, different definitions across tools → AI agents hallucinate business truth
```

---

## 2. Why AxiomID is the right host (not a regular consumer)

AxiomID already has the primitives these systems need:

| AxiomID primitive | Role | Zero analog | Ossie analog |
|---|---|---|---|
| `did:axiom` | Stable agent/human subject | Graph module identity | Semantic entity ID |
| TrustChain (append-only) | Tamper-evident action log | Graph hash history | Semantic model version lineage |
| Agent Passport / subdomain | Public projection of identity | `.0` projection | Published semantic view |
| SpendRequest + Human Authorization | Capability-gated mutation | Checked patch with expect-hash | Metric/entity write with governance |
| Skills / AgentCard (A2A) | What an agent can do | Graph symbols + effects | Semantic capabilities catalog |
| Pi Wallet verification | Human root of trust | Human-in-the-loop gate | Authority / owner of semantic domain |

**Thesis:** AxiomID should not "call Zero" or "import Ossie as a library."  
It should become the **identity + authorization plane** that makes graph patches and semantic models **attributable, portable, and enforceable**.

---

## 3. Expert-level Zero uses in AxiomID (non-obvious)

### 3.1 TrustChain as a **semantic program graph** (not just an event log)

Today TrustChain is append-only actions. Zero-style upgrade:

- Represent each agent policy as a **graph module**:
  - Nodes: capabilities, scopes, spend limits, KYC gates, tool permissions
  - Edges: `requires`, `implies`, `revokes`, `delegates`
  - Hash: `graph:<sha>` stored on-chain / in TrustChain tip
- Every policy change = **checked patch** with:
  - `expect-graph-hash` (stale-state protection)
  - type checks (e.g. cannot grant `spend` without `kyc:VERIFIED`)
  - effect annotations (`network`, `payment`, `identity-write`)

**Why this is expert-level:**  
Most agent platforms store free-text policies or JSON blobs. Zero's model makes policy mutation **compiler-checked**, so agents cannot "edit their own soul" into illegal states.

**Code anchors:**
- `src/lib/trust-chain*` / TrustChain models in Prisma
- SpendRequest approval path
- Agent activate/pause/create APIs

### 3.2 Agent skills as **graph symbols**, not markdown lists

Map each skill to a graph symbol with:
- Type signature (inputs/outputs)
- Effects (`reads-identity`, `writes-payment`, `external-http`)
- Required human authorization level
- Graph hash of the skill implementation metadata

AgentCard (A2A) becomes a **projection** of the skill graph, not a hand-written JSON.

**Win:** Other agents discover capabilities without trusting prose; they trust **typed, hashed symbols**.

### 3.3 Subdomain passport (`amrikyy.axiomid.app`) as a **Zero projection surface**

- Identity graph (private/canonical) lives behind auth
- Public passport is the **readable projection** (like `.0` files)
- Hash of projection published in DID document / `.well-known`

Visitors and agents verify: *this page is a faithful projection of graph:abc…*

### 3.4 Agent coding loop for AxiomID itself (internal DX)

Use Zero **inside** AxiomID engineering for:
- Safe agent-driven refactors of identity/payment code
- Patches that cannot land unless TrustChain-related tests + type graph pass
- Pair with Autonoma previews: agent patches → Zero check → Autonoma preview → Braintrust eval

**Not for production Pi payments runtime** (experimental language).  
**Yes for** internal agent tooling, policy DSL, skill registry codegen.

### 3.5 Human Authorization Protocol as Zero's "human asks for outcome"

AxiomID's differentiator is **human authorization**. Zero's loop starts with a human outcome request.

Product mapping:

```
Human (Pi wallet): "Allow this agent to spend 5π for hosting"
  → Agent submits SpendRequest graph patch
  → Compiler/policy engine checks graph hash + KYC + limits
  → Human re-approves if hash drifted
  → TrustChain append + execution
```

This is **authorization as checked graph mutation**, not form posts.

### 3.6 Anti-patterns (do not do)
- Rewriting the whole Next.js app in Zero
- Using Zero as a general scripting language for cron jobs
- Trusting agent-written source text without graph checks
- Exposing Zero patch endpoints without Pi human root + rate limits

---

## 4. Expert-level Apache Ossie uses in AxiomID

### 4.1 Trust Score as a **portable semantic metric**

Define Trust Score, XP, tier thresholds, KYC states as Ossie semantic models:

```yaml
# conceptual — not final schema
semantic_model:
  name: axiomid_trust
  entities:
    - name: Agent
      keys: [did]
    - name: Human
      keys: [pi_uid, wallet]
  metrics:
    - name: trust_score
      type: measure
      definition: "weighted sum of verified actions over TrustChain window"
      grain: Agent
    - name: authorization_success_rate
      type: measure
      grain: Agent
```

Then:
- Dashboard, leaderboard, Braintrust evals, and external BI all consume **one definition**
- AI agents explaining "why trust dropped" ground on Ossie, not ad-hoc SQL

### 4.2 Cross-platform agent reputation interchange

When AxiomID agents operate across Virtuals, ACP, marketplaces, BI tools:
- Export agent reputation + skill performance as Ossie models
- Import partner metrics without reinventing definitions
- Avoid "trust score means three things in three dashboards"

### 4.3 Spend / marketplace economics as semantic domain

Marketplace listings, skill prices, payment complete rates, refund rates → Ossie domain model.

Converters path:
- Ossie ↔ internal Prisma metrics
- Ossie ↔ Braintrust experiment metrics
- Ossie ↔ future dbt / warehouse (if/when analytics stack grows)

### 4.4 Agent-facing "business truth" API

`GET /api/semantic/trust` returns Ossie-compliant model for:
- Agent planners (grounding)
- External auditors
- OpenIdentity / did:axiom service endpoints

This is how AxiomID becomes infrastructure for **other** AI systems, not only an app.

### 4.5 Compliance & Muraqabah (SOUL) angle

Ossie forces **explicit definitions**.  
That aligns with SOUL protocol: intention, record, single clear source of truth ("إمام مبين").

Semantic models should include:
- `intention` fields on actions
- `authority` (human did / agent did)
- `revocation` semantics

### 4.6 Anti-patterns
- Treating Ossie as "just another JSON schema for the frontend"
- Defining metrics only in React components / StatsBar hardcodes
- No versioning of semantic models (always pair with TrustChain / git SHA)

---

## 5. Combined architecture (the non-obvious synthesis)

```
                    ┌─────────────────────────┐
                    │   Human (Pi Wallet)     │
                    │   Authorizes outcomes   │
                    └───────────┬─────────────┘
                                │
                                ▼
┌──────────────┐     checked patches      ┌────────────────────┐
│  Zerolang-   │ ◄──────────────────────► │  AxiomID Policy    │
│  style Graph │   expect-graph-hash      │  Engine + Skills   │
│  (policy +   │                          │  (TrustChain tip)  │
│   skills)    │                          └─────────┬──────────┘
└──────────────┘                                    │
                                                    │ append-only
                                                    ▼
                                          ┌────────────────────┐
                                          │  TrustChain + DID  │
                                          │  did:axiom + SBT   │
                                          └─────────┬──────────┘
                                                    │
                         projections                │  semantic export
              ┌─────────────────────────────────────┼──────────────────┐
              ▼                                     ▼                  ▼
     Passport subdomain                    Ossie semantic models   Braintrust
     amrikyy.axiomid.app                   trust/spend/skills      evaluations
     AgentCard / A2A                       BI + partner agents     quality gates
```

**One sentence:**  
Zero disciplines **how agents change the world**; Ossie disciplines **what the numbers mean**; AxiomID binds both to **who is allowed** (human + agent identity).

---

## 6. Concrete insertion points in this codebase

| Priority | Location | Work |
|---|---|---|
| P0 | TrustChain / agent policy APIs | Graph-hash on policy revisions; reject stale patches |
| P0 | `src/lib` trust score computation | Extract metric definitions → Ossie YAML under `semantic/` |
| P1 | AgentCard / skills routes | Generate card from skill graph symbols |
| P1 | Passport + `.well-known` | Publish projection hash + semantic model URL |
| P1 | Braintrust integration | Log evals against Ossie metric names (not free strings) |
| P2 | Marketplace / spend | Ossie metrics for conversion, complete rate, abuse |
| P2 | Internal agent DX | Optional Zero-checked patch workflow in CI (experimental) |
| P3 | Converters | Ossie ↔ Prisma / warehouse when analytics matures |

Suggested new tree:

```
semantic/
  ossie/
    axiomid-trust.yaml
    axiomid-spend.yaml
    axiomid-skills.yaml
  graphs/
    agent-policy.schema.json   # Zero-inspired policy graph schema
    skill-symbol.schema.json
docs/
  ZERO_OSSIE_INTEGRATION.md    # this file
```

---

## 7. Product narrative (landing / docs copy seed)

- **For humans:** Authorize outcomes with your Pi wallet. Review projections, not raw agent dumps.
- **For agents:** Query identity graphs, submit checked capability patches, prove results on TrustChain.
- **For platforms:** Import AxiomID semantic models via Ossie — one definition of trust, spend, and skill performance.

This positions AxiomID next to OpenAI/Vercel-grade agent infra **without** claiming to be a general programming language or a BI tool.

---

## 8. Risks & honesty

| Risk | Mitigation |
|---|---|
| Zero is experimental (breaking changes) | Use as **design language + internal tooling**, not payment runtime |
| Ossie still incubating | Adopt schema early; version aggressively; don't block product on converters |
| Over-engineering policy graphs | Start with spend + KYC gates only |
| Agents gaming metrics | Ossie definitions + TrustChain attestation + Braintrust evals |

---

## 9. Recommended first 3 engineering moves

1. **Ossie-ify Trust Score** — move formula + grain into `semantic/ossie/axiomid-trust.yaml`; StatsBar + leaderboard + Braintrust read the same names.
2. **Policy graph hash on SpendRequest** — every approval stores `policyGraphHash`; execution fails if tip moved (Zero's stale-state idea).
3. **Passport projection hash** — `username.axiomid.app` embeds `graph:` / model version in meta + DID document.

---

## 10. References

- Zero: https://zerolang.ai — graph-first, agent-checked patches
- Apache Ossie: https://github.com/apache/ossie — semantic model interchange
- AxiomID SOUL: TrustChain, Muraqabah, intention-bearing actions
- OpenIdentity / did:axiom: portable agent identity

---

*Written for AxiomID builders who already ship identity — not for tourists installing a language runtime.*
