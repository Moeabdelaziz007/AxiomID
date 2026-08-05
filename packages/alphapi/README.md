# @pai/alphapi

> **AlphaPi** — Reflection loop engine for self-improving agent skills.
>
> _AlphaZero × Reflexion × TrustChain_

AlphaPi is a 7-step reflection loop that improves agent skills (MCP tools, ACP offerings, code packages) through external signals (tests, CI, reviews) rather than self-judgment alone.

Built on 9 peer-reviewed papers + Anthropic's Global Workspace research. See [RESEARCH.md](./RESEARCH.md) for full citations.

---

## The 7-Step Loop

```
OBSERVE → REFLECT → GENERATE → EVALUATE → SELECT → RECORD → REPEAT
```

1. **OBSERVE** — Read current state (test results, CI status, trust score, PR comments)
2. **REFLECT** — "If asked about this skill's quality, what would I say?" (counterfactual)
3. **GENERATE** — Produce N alternative improvements
4. **EVALUATE** — Run tests for each alternative. Score = f(testPass, lint, typeCheck, trustDelta)
5. **SELECT** — Pick highest-scoring candidate (skip drifted ones)
6. **RECORD** — TrustChain.append(action, expected, actual, reward, reflection)
7. **REPEAT** — Next iteration informed by TrustChain history. Stop at plateau or goal.

---

## Quick Start

```typescript
import { AlphaPiLoop, DEFAULT_CONFIG } from "@pai/alphapi";

const loop = new AlphaPiLoop(
  {
    observer: myObserver,    // reads tests + CI + trust score
    reflector: myReflector,  // LLM call for counterfactual reflection
    generator: myGenerator,  // LLM call for candidate generation
    evaluator: myEvaluator,  // runs tests + lint + type-check
    recorder: myRecorder,    // appends to TrustChain
  },
  {
    ...DEFAULT_CONFIG,
    goal: "Improve test pass rate to 95%",
    target: "packages/atom",
    maxIterations: 10,
  },
);

const result = await loop.run();
console.log(`Improved: ${result.improved}, Total reward: ${result.totalReward}`);
```

---

## Reward Function

```
score = testPassRate × 0.50    // does it work?
      + lintClean × 0.20       // is it clean?
      + typeCheckClean × 0.15  // is it type-safe?
      + trustDelta × 0.15      // did trust improve?
```

**Why this composition:** Test pass rate dominates (50%) because the Self-Repair paper (arxiv:2306.09896) proved external signals matter more than self-judgment. Trust delta (15%) provides economic feedback from ACP/TrustChain.

---

## Drift Detection (from SAHOO, arxiv:2603.06333)

Before committing any improvement, AlphaPi checks:

- **Regression:** Did test pass rate drop below tolerance?
- **Type safety:** Did type errors spike?
- If drift detected → discard candidate, log to TrustChain, continue

---

## What AlphaPi is NOT

- ❌ Not a replacement for human review — humans still approve PRs
- ❌ Not autonomous deployment — AlphaPi proposes, humans dispose
- ❌ Not weight training — it improves *scaffolding* (prompts, code, tests)
- ❌ Not guaranteed to improve — reflection can hurt (arxiv:2405.06682); we measure and discard

---

## Version Roadmap

| Version | Capability | Research Basis |
|:--------|:-----------|:---------------|
| v0.1 | Single-path reflection loop | Reflexion + Anthropic counterfactual |
| v0.2 | TrustChain pattern extraction | Self-Improvements Survey |
| v0.3 | Value function from history | AlphaZero-like |
| v0.4 | Multi-LLM ensemble reflection | Self-Rewarding |
| v0.5 | Tree search (3 branches) | Tree Search for LM Agents |
| v0.6 | Drift monitoring + safety | SAHOO |
| v0.7 | Multi-agent debate | Debate with Self-Play |
| v1.0 | Full AlphaZero-style search | All papers |

---

## Package Structure

```
packages/alphapi/
├── src/
│   ├── types.ts       # All TypeScript interfaces
│   ├── reward.ts      # Reward function + drift detection
│   ├── loop.ts        # AlphaPiLoop engine (7-step loop)
│   └── index.ts       # Public API
├── test/
│   └── reward.test.ts # Unit tests for reward function
├── RESEARCH.md        # 9 arxiv papers + Anthropic paper synthesis
├── package.json
└── tsconfig.json
```

---

## License

MIT © Mohamed Abdelaziz
