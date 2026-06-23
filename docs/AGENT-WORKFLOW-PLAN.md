# AxiomID Agent Workflow Optimization Plan

> Last updated: 2026-06-22
> Based on research of CodeRabbit, Devin, Gemini CLI, and multi-agent patterns.

---

## Executive Summary

| Tool | Role in AxiomID | Cost | Best For |
|:---|:---|:---|:---|
| **OpenCode** | Primary orchestrator + implementation | Subscription | Real-time coding, skill dispatch |
| **CodeRabbit** | Automated PR review | Free (OSS) / $24/user/mo | Diff-based review, security checks |
| **Gemini CLI** | Research + multimodal analysis | Free tier | Terminal agent, image analysis |
| **Devin** | Autonomous complex tasks | $20-500/mo | Long-running, well-scoped tasks |

---

## Phase 1: CodeRabbit Optimization (Immediate — Free)

### 1.1 Create `.coderabbit.yaml`

```yaml
reviews:
  profile: "chill"           # Start chill, move to assertive after 2 weeks
  auto_review:
    enabled: true
    drafts: false             # Skip draft PRs
  path_filters:
    - "!**/*.lock"
    - "!**/node_modules/**"
    - "!**/.next/**"
    - "!**/generated/**"
    - "!**/__snapshots__/**"
    - "!**/*.test.ts"
    - "!**/*.test.tsx"
  instructions: |
    Follow AxiomID engineering covenant (AGENTS.md).
    No `any` types. No eslint-disable. No setTimeout in API routes.
    All commits use Truth Chronicle format: type(scope): description ۞
  path_instructions:
    - path: "src/app/api/**"
      instructions: |
        Review for: auth checks (requireAuth), Zod validation,
        rate limiting, error response format, logger.error() in catch.
    - path: "backend/src/**"
      instructions: |
        Review for: timing-safe auth, D1 parameterized queries,
        KV cache TTL, CORS headers, error boundaries.
    - path: "src/lib/soul/**"
      instructions: |
        Review for: async/await correctness, 5000ms timeout,
        ethical evaluation completeness, Telegram notification errors.
    - path: "src/components/**"
      instructions: |
        Review for: "use client" directive, framer-motion patterns,
        responsive design, accessibility (aria labels).
```

### 1.2 Enable CodeRabbit CLI for Local Pre-Review

```bash
# Install
npm install -g @coderabbit/cli

# Add to pre-commit hook (via Husky)
npx husky add .husky/pre-commit "coderabbit review --plain --type uncommitted"
```

**Workflow**: Write code → `coderabbit review` locally → fix issues → commit clean → push → CodeRabbit reviews PR

### 1.3 Make CodeRabbit a Blocking Status Check

In GitHub repo Settings → Branches → Branch protection rules:
- Require CodeRabbit review approval before merge
- Dismiss stale reviews on new commits

---

## Phase 2: Gemini CLI Integration (Free)

### 2.1 Install & Configure

```bash
npm install -g @google/gemini-cli
gemini login  # Uses Google account, free tier: 60 req/min, 1000/day
```

### 2.2 Create `GEMINI.md` for Project Context

```markdown
# AxiomID Project Context

## Tech Stack
- Next.js 16, React 19, Prisma 6, Tailwind 4, Framer Motion 12
- Cloudflare Workers (backend), D1, Vectorize, Workers AI
- Pi Network SDK, Ed25519 sovereign keys, W3C DIDs

## Conventions
- Truth Chronicle commits: type(scope): description ۞
- No `any` types, no eslint-disable, no setTimeout in API routes
- Trust score: XP (70%) + stamps (30%), range 0-100
- Soul system: 5 gates (Awareness, Ethical, Virtue, Correction, Self-Review)

## Key Files
- src/lib/trust.ts — Trust score algorithm
- src/lib/soul/soul-loop.ts — Ethical evaluation loop
- backend/src/router.ts — Cloudflare Worker routes
- prisma/schema.prisma — Database schema
```

### 2.3 Use Gemini CLI For

| Task | Command | Why Gemini |
|:---|:---|:---|
| **Research** | `gemini "research best practices for X"` | Free, fast, multimodal |
| **Code review** | `gemini -f src/file.ts -p "review for security"` | Second opinion after CodeRabbit |
| **Image analysis** | `gemini --image screenshot.png -p "what's wrong"` | Visual debugging |
| **Documentation** | `gemini -f src/lib/trust.ts -p "write docs"` | Generates README/docs |
| **Test generation** | `gemini -f src/lib/soul.ts -p "write tests"` | Generates test cases |

### 2.4 Custom Commands (`.gemini/commands/`)

```toml
# .gemini/commands/security-review.toml
[command]
description = "Security-focused code review"
prompt = """
Review this code for:
1. Auth bypass vulnerabilities
2. SQL injection / XSS
3. Timing attacks on secrets
4. Missing rate limiting
5. Exposed sensitive data
Output: CRITICAL / HIGH / MEDIUM / LOW with file:line references
"""
```

---

## Phase 3: Devin for Complex Tasks (Paid — $20/mo)

### 3.1 When to Use Devin

| Use Devin For | Don't Use Devin For |
|:---|:---|
| Multi-file refactoring | Quick bug fixes |
| Dependency upgrades | Creative UI work |
| Test backfilling | Ambiguous requirements |
| Large-scale migrations | Real-time collaboration |
| Weekend autonomous tasks | Tasks needing codebase context |

### 3.2 Devin + Linear Integration

1. Connect Devin to Linear (Settings → Integrations)
2. Label issues with `devin` tag
3. Devin auto-creates implementation plan
4. Review plan → approve → Devin executes autonomously
5. PR created automatically

### 3.3 Cost Control

- **Core plan** ($20/mo): Pay-per-ACU at $2.25 each
- **ACU = 1 task** (typical: 1-3 ACUs per task)
- **Budget cap**: Set $50/mo max, fail pipeline if exceeded
- **Best ROI**: Use for weekend batches of well-scoped tasks

---

## Phase 4: Multi-Agent Orchestration (Advanced)

### 4.1 Agent Role Architecture

```
┌─────────────────────────────────────────────────────┐
│                  ORCHESTRATOR                        │
│              (OpenCode main session)                 │
│  - Task decomposition                               │
│  - Subagent dispatch                                │
│  - Result synthesis                                 │
└──────────┬──────────┬──────────┬──────────┬────────┘
           │          │          │          │
    ┌──────▼──┐ ┌─────▼────┐ ┌──▼─────┐ ┌──▼──────┐
    │Security │ │Reviewer  │ │Tester  │ │GitOps   │
    │Specialist│ │Specialist│ │Runner  │ │Agent    │
    │(Opus)   │ │(Sonnet)  │ │(Haiku) │ │(Sonnet) │
    └─────────┘ └──────────┘ └────────┘ └─────────┘
```

### 4.2 Rules

1. **Implementer writes code, GitOps commits** — Never let the same agent that wrote code commit it
2. **Never self-review** — Different model/session for review
3. **Use worktrees for parallel agents** — Prevents merge conflicts
4. **Enforce step limits** — Max 50 steps per agent, $10 budget cap
5. **Measure acceptance rate** — Target >60% useful suggestions

### 4.3 Dispatching Pattern

```typescript
// Parallel dispatch (independent tasks)
task({ subagent_type: "general", description: "Security audit" })
task({ subagent_type: "general", description: "Test generation" })
task({ subagent_type: "general", description: "Documentation" })

// Sequential dispatch (dependent tasks)
// Task B waits for Task A output
```

---

## Phase 5: Metrics & Continuous Improvement

### 5.1 Track These Metrics

| Metric | Target | How to Measure |
|:---|:---|:---|
| `code.acceptance_rate` | >60% | AI suggestions accepted / total |
| `review.human_review_rate` | <20% | PRs needing human review |
| `system.rollback_rate` | <2% | Auto-rolled-back deploys |
| `task.completion_time` | Decreasing | Time from assignment to merge |
| `code.churn_rate` | <15% | Lines changed within 14 days |

### 5.2 Review Cadence

| Frequency | Action |
|:---|:---|
| Every PR | CodeRabbit auto-review |
| Weekly | Review CodeRabbit false positive rate |
| Bi-weekly | Tune `.coderabbit.yaml` path_instructions |
| Monthly | Evaluate agent ROI, adjust model mix |
| Quarterly | Full workflow retrospective |

---

## Quick Wins (Do This Week)

| # | Action | Time | Impact |
|---|--------|------|--------|
| 1 | Create `.coderabbit.yaml` | 15 min | 10x review quality |
| 2 | Create `GEMINI.md` | 10 min | Persistent AI context |
| 3 | Install CodeRabbit CLI | 5 min | Local pre-review |
| 4 | Create security-review.toml | 5 min | Consistent security checks |
| 5 | Enable blocking reviews | 5 min | No unreviewed merges |

---

## Cost Summary

| Tool | Monthly Cost | Value |
|:---|:---|:---|
| OpenCode | Subscription | Primary orchestrator |
| CodeRabbit | Free (OSS) | PR review automation |
| Gemini CLI | Free tier | Research + multimodal |
| Devin | $0-50/mo | Autonomous complex tasks |
| **Total** | **$0-50/mo** | **Full agent stack** |

---

## References

- CodeRabbit docs: https://docs.coderabbit.ai/guides/configuration-overview
- Gemini CLI: https://github.com/google-gemini/gemini-cli
- Devin: https://devin.ai
- Addy Osmani's Gemini tips: https://addyosmani.com/blog/gemini-cli
- CodeRabbit YAML template: https://docs.coderabbit.ai/reference/yaml-template
