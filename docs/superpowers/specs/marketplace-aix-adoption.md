# Marketplace AIX Adoption — Phases 1-6 ۞

**Status:** Phases 1-2 complete (PR #184), Phases 3-6 in progress  
**Branch:** `feat/marketplace-aix-adoption`  
**PR:** #184 (Phases 1-2), follow-up PRs for 3-6

---

## Overview

Adopt architecture patterns from AIX-Format/aix-agent-skills into AxiomID's Agentic Marketplace. This is a **recode, not a copy** — patterns are adapted to AxiomID's Prisma/Next.js/Pi SDK stack.

### Why This Matters

Before this change, `manifestMd` (the skill's Genomic Payload) is a free-form `<textarea>` with no structure validation. A skill can be published with `manifestMd: "TODO: fill this in"` and the marketplace accepts it. This poisons discovery, wastes buyer trust, and makes the catalog unreliable.

### Scope (Phases 1-6)

| Phase | What | Effort | Status |
|-------|------|--------|--------|
| 1 | Skill template standard — canonical bilingual template, Zod validation | Small | ✅ Complete |
| 2 | CI quality gate — GitHub Action validates manifest completeness on PR | Small | ✅ Complete |
| 3 | SOUL Protocol alignment — every skill declares which principle it serves | Small | ✅ Complete |
| 4 | Performance tracking — `SkillExecution` model, success rate analytics | Medium | ✅ Complete |
| 5 | Chain flag — pipeline execution support | Medium | ✅ Complete |
| 6 | x402-inspired payment flow | Medium | ✅ Complete |

---

## Phase 1: Skill Template Standard ✅

### Template Structure

Every skill manifest MUST follow this structure:

```
## الغرض — Purpose
What does this skill do? (1-2 sentences)

## مبدأ التوافق — Principle Alignment
How this skill serves: Vigilance / Correction / Ledger / Triad / Septet / Compounding

## سير التشغيل — Operational Flow
1. Step one
2. Step two
3. Step three

## أنماط الفشل — Failure Modes
| Mode | Detection | Recovery |
|------|-----------|----------|

## الوسوم — Tags (optional)
tag1, tag2, tag3
```

### Validation Rules (`ManifestSchema`)

1. Must contain all 4 required sections (Purpose, Principle Alignment, Operational Flow, Failure Modes)
2. Section bodies must be non-empty
3. Rejects stub patterns: `TODO:`, `TBD`, `...`, `<fill in>`
4. Rejects single-paragraph placeholders followed by next heading
5. Accepts bilingual headers (English or Arabic + English)
6. Tags section is optional

### Files Changed

| File | Change |
|------|--------|
| `templates/skill-template.md` | **NEW** — canonical bilingual template |
| `src/lib/validators.ts` | **MODIFY** — add `ManifestSchema` Zod validator |
| `src/lib/errors.ts` | **MODIFY** — add `INCOMPLETE_MANIFEST` error code |
| `src/app/api/skills/route.ts` | **MODIFY** — validate `manifestMd` against `ManifestSchema` on POST |
| `src/app/api/skills/[slug]/route.ts` | **MODIFY** — validate `manifestMd` against `ManifestSchema` on PATCH |
| `src/components/dashboard/PublishSkillForm.tsx` | **MODIFY** — sectioned editor with validation hints |
| `src/diagnostics/catalog.ts` | **MODIFY** — add `AXIOMID_E050` diagnostic for incomplete manifests |

### API Contract

**POST /api/skills** — if `manifestMd` fails `ManifestSchema`:

```json
{
  "error": "Manifest is incomplete — missing required section: ## سير التشغيل — Operational Flow",
  "code": "INCOMPLETE_MANIFEST",
  "details": [
    {
      "section": "Operational Flow",
      "issue": "missing"
    }
  ]
}
```

**PATCH /api/skills/[slug]** — same validation applies when `manifestMd` is included in the update body.

---

## Phase 2: Skill Quality Gate ✅

### CI Workflow

```yaml
name: Skill Quality Gate
on: [pull_request]
jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx tsx scripts/validate-skill-manifest.ts --changed
```

### Validation Script

`scripts/validate-skill-manifest.ts` — runs in two modes:

| Mode | Scope | Exit Code |
|------|-------|-----------|
| `--changed` (CI default) | Only PR-changed skills | 1 if any fail |
| `--strict` (manual) | All skills in DB | 1 if any fail |

The script:
1. Reads `manifestMd` from each skill
2. Parses markdown sections
3. Validates against the same rules as `ManifestSchema`
4. Outputs a table of results
5. Returns non-zero exit on failure

### Files Changed

| File | Change |
|------|--------|
| `.github/workflows/skill-quality.yml` | **NEW** — CI workflow |
| `scripts/validate-skill-manifest.ts` | **NEW** — CLI validation script |

---

## Phase 3: SOUL Protocol Alignment 🔄

### Goal

Every skill declares which SOUL principle it serves. This is AxiomID's differentiator — no other marketplace has this.

### SOUL Principles Definition

```typescript
export const SOUL_PRINCIPLES = {
  MURAQABAH:  { en: "Vigilance",  ar: "اليقظة",   icon: "eye",     color: "#22c55e" },
  TAWBAH:     { en: "Correction",     ar: "التصحيح",      icon: "refresh", color: "#3b82f6" },
  TRUSTCHAIN: { en: "Ledger", ar: "السجل",      icon: "link",    color: "#6366f1" },
  TASBIH:     { en: "Triad",     ar: "الثلاثية",     icon: "repeat",  color: "#f59e0b" },
  SABIYYAH:   { en: "Septet",  ar: "السباعية",  icon: "layers",  color: "#ec4899" },
  BARAKAH:    { en: "Compounding",    ar: "التراكم",       icon: "sparkle", color: "#14b8a6" },
};
```

### Schema Changes

```prisma
enum SoulPrinciple {
  MURAQABAH
  TAWBAH
  TRUSTCHAIN
  TASBIH
  SABIYYAH
  BARAKAH
}

model Skill {
  // ...existing fields
  soulPrinciple SoulPrinciple?  // optional — skills can serve multiple
}
```

### Files to Create/Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | **MODIFY** — add `SoulPrinciple` enum + `soulPrinciple` field on Skill |
| `prisma/migrations/` | **NEW** — migration for enum + field |
| `src/lib/soul-principles.ts` | **NEW** — enum + metadata (icons, colors, names) |
| `src/components/marketplace/SoulBadge.tsx` | **NEW** — color-coded badge component |
| `src/lib/validators.ts` | **MODIFY** — add `SoulPrinciple` to Zod schemas |
| `src/app/api/skills/route.ts` | **MODIFY** — accept + validate `soulPrinciple` on POST |
| `src/app/api/skills/[slug]/route.ts` | **MODIFY** — accept + validate `soulPrinciple` on PATCH |
| `src/app/api/skills/route.ts` | **MODIFY** — add SOUL filter to GET /api/skills |
| `src/components/dashboard/PublishSkillForm.tsx` | **MODIFY** — add SOUL principle selector |
| `src/app/dashboard/marketplace/page.tsx` | **MODIFY** — show SoulBadge on cards, add SOUL filter |
| `src/__tests__/api/skills-list-create.test.ts` | **MODIFY** — add soulPrinciple to fixtures |

### API Contract

**POST /api/skills** — add `soulPrinciple` to body:

```json
{
  "slug": "agent-memory",
  "name": "Agent Memory",
  "manifestMd": "...",
  "soulPrinciple": "MURAQABAH"
}
```

**GET /api/skills?soulPrinciple=MURAQABAH** — filter by SOUL principle

**Response includes** `soulPrinciple` field on each skill

### UI Changes

1. **PublishSkillForm** — dropdown selector for SOUL principle (optional)
2. **SkillCard** — show SoulBadge with color-coded dot + principle name
3. **SkillDetail** — show full SOUL alignment with description
4. **Marketplace filters** — add SOUL principle filter alongside tier filter

---

## Phase 4: Performance Tracking 📋

### Goal

Track skill execution success/fail rates. Show analytics to authors and buyers.

### Schema Changes

```prisma
model SkillExecution {
  id        String   @id @default(cuid())
  skillId   String
  skill     Skill    @relation(fields: [skillId], references: [id])
  agentId   String
  agent     UserAgent @relation(fields: [agentId], references: [id])
  success   Boolean
  duration  Int?                 // ms
  error     String?              // Tawbah: root cause
  inputHash String?              // for dedup
  outputHash String?
  timestamp DateTime @default(now())

  @@index([skillId, success])
  @@index([skillId, timestamp])
}
```

### Files to Create/Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | **MODIFY** — add `SkillExecution` model |
| `prisma/migrations/` | **NEW** — migration |
| `src/app/api/skills/[slug]/execute/route.ts` | **NEW** — POST endpoint |
| `src/app/api/skills/[slug]/stats/route.ts` | **NEW** — GET endpoint |
| `src/lib/validators.ts` | **MODIFY** — add `RecordExecutionSchema` |
| `src/app/dashboard/marketplace/page.tsx` | **MODIFY** — show success rate gauge |
| `src/components/marketplace/SkillDetail.tsx` | **MODIFY** — execution history display |

### API Contract

**POST /api/skills/[slug]/execute** — record execution:

```json
{
  "agentId": "uuid",
  "success": true,
  "duration": 150,
  "inputHash": "abc123"
}
```

**GET /api/skills/[slug]/stats** — return analytics:

```json
{
  "totalExecutions": 150,
  "successRate": 0.94,
  "avgDuration": 150,
  "recentExecutions": [...]
}
```

---

## Phase 5: Chain Flag 📋

### Goal

Skills can compose into pipelines. Mark `chainable: true` skills as pipeline-compatible.

### Schema Changes

```prisma
model Skill {
  // ...existing fields
  chainable Boolean @default(false)
}

model SkillPipeline {
  id        String   @id @default(cuid())
  name      String
  steps     SkillPipelineStep[]
  agentId   String
  createdAt DateTime @default(now())
}

model SkillPipelineStep {
  id         String        @id @default(cuid())
  pipelineId String
  skillId    String
  order      Int           @default(0)
  inputMap   Json?         // { "in_key": "prev.out_key" }
  pipeline   SkillPipeline @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
  skill      Skill         @relation(fields: [skillId], references: [id])

  @@unique([pipelineId, order])
}
```

### Files to Create/Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | **MODIFY** — add models |
| `src/app/api/skills/pipelines/route.ts` | **NEW** — CRUD |
| `src/app/api/skills/pipelines/[id]/execute/route.ts` | **NEW** — execute pipeline |
| `src/app/dashboard/marketplace/page.tsx` | **MODIFY** — show chainable badge |

---

## Phase 6: x402-Inspired Payment Flow 📋

### Goal

Apply x402 pattern (402 → payment → resource) to Pi payment flow.

### Current Flow

```
POST /install → { error: "requires payment" }
→ user triggers Pi payment manually
→ POST /install with consumablePaymentId
```

### New Flow (x402-inspired)

```
POST /install → 402 + X-PAYMENT-REQUIRED: { price, method: "pi" }
→ SDK auto-calls Pi.createPayment()
→ SDK re-POSTs /install with X-PAYMENT header
→ 200 OK + installation record
```

### Files to Modify

| File | Change |
|------|--------|
| `src/app/api/skills/[slug]/install/route.ts` | **MODIFY** — return 402 + payment info |
| `src/lib/pi-sdk.ts` | **MODIFY** — handle 402 auto-retry |
| `src/app/dashboard/marketplace/page.tsx` | **MODIFY** — auto-prompt payment |

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Zod over custom parser** | Already used throughout codebase; consistent tooling |
| **Bilingual headers** | Matches AxiomID's Arabic/English mandate |
| **`INCOMPLETE_MANIFEST` error code** | Follows existing `ErrorCode` pattern; allows CI + API to share validation |
| **Server-side first, client-side second** | API validation is authoritative; form hints are UX |
| **`--changed` mode default in CI** | Grandfathers existing skills; prevents flag-day rewrites (same as AIX approach) |
| **Single branch per milestone** | Phases 1+2 in one branch for atomic review; 3+4 in follow-up branches |
| **Optional `soulPrinciple`** | Not all skills need SOUL alignment; don't block on it |
| **Execution tracking via aggregation** | No separate stats table; stats computed via SQL aggregation |

## Migration Strategy

Existing skills in the DB are **not automatically re-validated**. The `--changed` CI mode only checks PR-diffed skills. This means:

1. Pre-existing skills continue to work
2. Only new/updated skills need to follow the template
3. A future `--strict` run can identify legacy skills that need updating
4. Seed data (`src/data/skills.json`) will be updated to follow the template
