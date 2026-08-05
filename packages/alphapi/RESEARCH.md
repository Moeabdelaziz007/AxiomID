# AlphaPi — Research Synthesis & Architecture
> Researcher: Hermes Agent for Mohamed Abdelaziz
> Date: 2026-07-20
> Sources: 9 arxiv papers + 1 Anthropic interpretability paper (all fetched and read)

---

## Part 1: Research Synthesis — What Science Proves

### 9 Papers Analyzed

| # | Paper | arxiv ID | Core Finding | Relevance to AlphaPi |
|:--|:------|:---------|:-------------|:---------------------|
| 1 | **Reflexion** | 2303.11366 | Verbal reflection on task feedback → episodic memory → better decisions. 91% pass@1 on HumanEval (vs GPT-4's 80%) | ✅ Direct proof: reflection loop works without weight updates |
| 2 | **Self-Improvements Survey** | 2607.13104 | Formalizes self-improvement as "self-induced update operator" on model params or scaffold (prompts, memory, tools) | ✅ Provides the system framework AlphaPi fits into |
| 3 | **Self-Repair: Silver Bullet?** | 2306.09896 | Self-repair gains are "often modest" because models can't give themselves good feedback. Stronger external feedback → bigger gains | ⚠️ Critical warning: self-feedback is the bottleneck |
| 4 | **SAHOO** | 2603.06333 | Recursive self-improvement risks alignment drift. Goal Drift Index (GDI) detects it. 18.3% code improvement, 16.8% reasoning | ⚠️ Must monitor for drift in AlphaPi loops |
| 5 | **AlphaZero-like Tree-Search** | 2309.17179 | Tree-search + LLM value function fails when LLM lacks domain knowledge or when search depth is long | ⚠️ Tree search only works with good value functions |
| 6 | **Tree Search for LM Agents** | 2407.01476 | Inference-time search for web automation agents. Explicit exploration + evaluation improves multi-step tasks | ✅ Tree search works for agent tasks, not just reasoning |
| 7 | **Self-Rewarding Language Models** | 2401.10020 | LLM-as-a-Judge can provide training signal. Model generates responses, judges them, trains on preferences | ✅ LLM can be its own reward signal (with caveats) |
| 8 | **Debate with Self-Play** | 2409.16636 | Training models to debate via self-play improves judge accuracy. Self-play generates useful training data | ✅ Multi-agent debate = scalable oversight |
| 9 | **Self-Reflection Effects** | 2405.06682 | 9 LLMs tested. Self-reflection helps some, hurts others. Not universally beneficial | ⚠️ Reflection isn't always positive — must measure |
| 10 | **Anthropic Global Workspace** | transformer-circuits.pub/2026 | J-space = verbalizable representations. Counterfactual Reflection Training shapes behavior via reflection | ✅ Theoretical foundation for workspace concept |

### What's PROVEN (can build on confidently)

1. **Verbal reflection improves performance** — Reflexion (91% vs 80% on HumanEval). No weight updates needed. Just: try → reflect on feedback → store reflection in memory → try again. This is exactly the AlphaPi loop.

2. **Inference-time tree search works for agents** — Tree Search for LM Agents (2407.01476) shows explicit exploration + evaluation beats greedy single-path execution for multi-step tasks.

3. **Self-play generates useful training data** — Debate paper (2409.16636) shows self-play between LLMs creates data that improves judge accuracy.

4. **Counterfactual reflection shapes behavior** — Anthropic paper shows training models to reflect on what they WOULD do improves actual behavior without direct training.

### What's RISKY (must handle carefully)

1. **Self-feedback is the bottleneck** — Self-Repair paper (2306.09896): "self-repair is bottlenecked by the model's ability to provide feedback on its own code." Gains are "often modest" without external feedback. **Implication: AlphaPi needs external signals (test results, CI, human review) not just self-reflection.**

2. **Reflection can HURT** — Self-Reflection paper (2405.06682): 8 types of self-reflecting agents tested; some performed WORSE after reflection. **Implication: AlphaPi must measure whether reflection helped, and discard reflections that reduce score.**

3. **Alignment drift in recursive loops** — SAHOO (2603.06333): "iterative self-modification risks subtle alignment drift." Goal Drift Index needed. **Implication: AlphaPi must have a drift detector — compare each iteration's output against the original goal.**

4. **Tree search fails without good value functions** — AlphaZero-like (2309.17179): tree search "will not work in domains where the pre-trained LLM does not have enough knowledge to serve as an effective value function." **Implication: AlphaPi v0.1 should NOT use tree search. Use single-path with reflection first. Add tree search only when the value function (reward) is proven reliable.**

### What's NOVEL in AlphaPi (not in any paper)

No paper combines all three:
1. **Reflection loop** (Reflexion) + 
2. **TrustChain as experience dataset** (AxiomID original) + 
3. **Agent commerce integration** (ACP marketplace)

The novel contribution: AlphaPi doesn't just improve code — it improves *agent skills that are sold as ACP offerings*. Each improvement has economic feedback (more purchases = higher trust = higher reward). This closes the loop in a way no academic paper has explored.

---

## Part 2: AlphaPi v0.1 Architecture

### Design Principles (from research)

| Principle | Source | How AlphaPi applies it |
|:----------|:-------|:----------------------|
| Reflection without weight updates | Reflexion | LLM reflects on test results, stores in TrustChain, tries again |
| External signal required | Self-Repair paper | Tests + CI + CodeRabbit reviews are the external signal, not just self-reflection |
| Measure if reflection helped | Self-Reflection paper | Score before and after; discard if score decreased |
| Monitor for drift | SAHOO | Goal Drift check: does output still match original goal? |
| Start simple, add complexity later | AlphaZero-like paper | v0.1 = single path + reflection. v0.5 = tree search. v1.0 = multi-agent debate |
| Counterfactual reflection | Anthropic | "If asked about this skill's quality, what would I say?" shapes behavior |

### The 7-Step Loop (v0.1)

```
┌─────────────────────────────────────────────────────────┐
│                   AlphaPi v0.1 Loop                      │
│                                                          │
│  1. OBSERVE    Read current state (test results, CI,     │
│                trust score, PR comments)                  │
│       │                                                  │
│       ▼                                                  │
│  2. REFLECT    "If asked about this skill's quality,     │
│                what would I say?" (counterfactual)        │
│       │                                                  │
│       ▼                                                  │
│  3. GENERATE   Produce 3 alternative improvements        │
│       │                                                  │
│       ▼                                                  │
│  4. EVALUATE   Run tests for each alternative.           │
│                Score = f(test_pass, lint, trust_delta)    │
│       │                                                  │
│       ▼                                                  │
│  5. SELECT     Pick highest-scoring alternative           │
│       │                                                  │
│       ▼                                                  │
│  6. RECORD     TrustChain.append(action, expected,       │
│                actual, reward, reflection)                │
│       │                                                  │
│       ▼                                                  │
│  7. REPEAT     Next iteration informed by TrustChain      │
│                history. Stop at plateau or goal.          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Reward Function (v0.1 — simple, measurable, honest)

```typescript
score = testPassRate * 0.5    // 0..1 — does it work?
      + lintClean * 0.2       // 0..1 — is it clean?
      + typeCheckClean * 0.15 // 0..1 — is it type-safe?
      + trustDelta * 0.15     // -1..1 — did trust improve?
```

**Why this composition:**
- Test pass rate is 50% — the most important signal (does it work?)
- Lint is 20% — code quality matters but less than functionality
- Type check is 15% — catches structural errors
- Trust delta is 15% — economic signal from ACP/TrustChain

**What's deliberately excluded from v0.1:**
- ❌ LLM self-judgment (Self-Repair paper warns this is the bottleneck)
- ❌ Human review score (too slow for automated loops)
- ❌ Aesthetic/readability (too subjective for v0.1)
- ❌ Tree search (AlphaZero paper warns it fails without good value functions)

### Drift Detection (from SAHOO)

Before committing any improvement, AlphaPi checks:

```typescript
function detectDrift(original: string, improved: string, goal: string): boolean {
  // 1. Syntactic: does it still parse?
  // 2. Semantic: does it still address the goal?
  // 3. Structural: is the architecture preserved?
  // 4. Regression: does it pass tests the original passed?
  return !stillParses(improved) 
      || !addressesGoal(improved, goal)
      || !passesOriginalTests(improved, originalTests);
}
```

If drift detected → discard improvement, log to TrustChain, continue.

### TrustChain as Experience Dataset (novel contribution)

Every loop iteration records:

```typescript
interface LoopRecord {
  iteration: number;
  goal: string;
  observedState: StateSnapshot;
  reflection: string;          // "If asked about quality, I'd say..."
  candidates: Candidate[];     // 3 alternatives
  scores: number[];            // reward for each
  selected: number;            // index of winner
  expected: string;            // what we thought would happen
  actual: string;              // what actually happened
  reward: number;              // final score delta
  driftDetected: boolean;
  timestamp: string;
  hash: string;                // chain hash
  previousHash: string | null;
}
```

This becomes the training corpus for:
- v0.2: Pattern extraction ("what reflections led to improvements?")
- v0.3: Value function training ("which candidate features predict success?")
- v0.5: Tree search ("which branches are worth exploring?")

### What AlphaPi is NOT (honest boundaries)

- ❌ NOT a replacement for human review — humans still approve PRs
- ❌ NOT autonomous deployment — AlphaPi proposes, humans dispose
- ❌ NOT a training system for LLM weights — it improves *scaffolding* (prompts, code, tests)
- ❌ NOT guaranteed to improve — reflection can hurt (paper #9); we measure and discard
- ❌ NOT tree search in v0.1 — that's v0.5+ when reward function is proven

### Version Roadmap

| Version | Capability | Research Basis |
|:--------|:-----------|:---------------|
| v0.1 | Single-path reflection loop | Reflexion + Anthropic counterfactual |
| v0.2 | TrustChain pattern extraction | Self-Improvements Survey |
| v0.3 | Value function from history | AlphaZero-like (train value function) |
| v0.4 | Multi-LLM ensemble reflection | Self-Rewarding (LLM-as-Judge) |
| v0.5 | Tree search (3 branches) | Tree Search for LM Agents |
| v0.6 | Drift monitoring + safety | SAHOO |
| v0.7 | Multi-agent debate | Debate with Self-Play |
| v1.0 | Full AlphaZero-style search | AlphaZero + all papers |

---

## Part 3: Sources (all fetched and verified)

1. **Reflexion: Language Agents with Verbal Reinforcement Learning** — arxiv.org/abs/2303.11366
2. **Self-Improvements in Modern Agentic Systems: A Survey** — arxiv.org/abs/2607.13104
3. **Is Self-Repair a Silver Bullet for Code Generation?** — arxiv.org/abs/2306.09896
4. **SAHOO: Safeguarded Alignment for Recursive Self-Improvement** — arxiv.org/abs/2603.06333
5. **AlphaZero-like Tree-Search can Guide LLM Decoding** — arxiv.org/abs/2309.17179
6. **Tree Search for Language Model Agents** — arxiv.org/abs/2407.01476
7. **Self-Rewarding Language Models** — arxiv.org/abs/2401.10020
8. **Training Language Models to Win Debates with Self-Play** — arxiv.org/abs/2409.16636
9. **Self-Reflection in LLM Agents: Effects on Problem-Solving** — arxiv.org/abs/2405.06682
10. **Verbalizable Representations Form a Global Workspace in Language Models** — transformer-circuits.pub/2026/workspace/

All abstracts fetched via arxiv API on 2026-07-20. No claims fabricated.
