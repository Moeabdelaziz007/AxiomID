---
description: Integrate AIX-Format/aix-agent-skills architecture into AxiomID marketplace
---

# Marketplace Enhancement: AIX-Format Integration Plan

## Problem

AxiomID's current marketplace implementation is basic:
- Simple Prisma-based skill storage
- Basic CRUD API with tier/pricing
- Minimal skill metadata
- No skill execution runtime
- No payment gateway integration
- No skill quality gates
- No performance tracking

The AIX-Format/aix-agent-skills repository offers a mature, production-ready marketplace architecture with 124 skills, 9-layer architecture, constitutional runtime, and extensive infrastructure.

## Root Cause Analysis

AxiomID marketplace was built as a minimal MVP without leveraging the existing AIX ecosystem's mature patterns. Key gaps:

1. **Architecture**: No layered skill organization (Sovereignty → Satellite)
2. **Execution**: No skill runtime or sandbox environment
3. **Quality**: No skill quality gates or validation
4. **Economy**: No payment protocol (x402) integration
5. **Performance**: No skill performance tracking
6. **Discovery**: No advanced search/filtering
7. **Community**: No skill discussions or support layer

## Solution

Strategically integrate AIX-Format/aix-agent-skills patterns into AxiomID while maintaining AxiomID's unique identity (Pi-based payments, bilingual support, TrustChain integration) and adhering to the **SOUL Protocol** (Muraqabah, Tawbah, TrustChain, Tasbih, Sab'iyyah, Self-Review).

### SOUL Protocol Integration

**Muraqabah (Divine Awareness)**:
- Every skill execution logged with intention: `TrustChain.append(action, timestamp, intention)`
- Private skill testing = public marketplace standards
- No hidden backdoors or temporary hacks in skill code

**Tawbah (Self-Correction)**:
- Skill quality gates enforce honest error reporting
- Failed skill executions trigger automatic confession, repair, and learning
- "I don't know" is an honorable answer in skill responses

**TrustChain**:
- Immutable append-only ledger for all skill installations and executions
- Hash chains prevent tampering with skill performance data
- Every skill action recorded: "وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ فِي إِمَامٍ مُّبِينٍ"

**Tasbih Triplet**:
- Skill execution retries: 3 cycles (not 2, not infinite)
- Exponential backoff: 1000ms × attempt number
- Pattern: attempt → fail → wait → retry → fail → wait → retry → fail → confess

**Sab'iyyah Wisdom**:
- Every 7 skill executions: synthesize performance patterns
- Every 7 published skills: review marketplace holistically
- Balance opposites: Free ↔ Paid, Simple ↔ Complex, Fast ↔ Thorough

**Self-Review Protocol**:
- Autonomously critique execution performance and log quality metrics
- Identify optimization opportunities and update the local memory bridge
- "وَقُلِ اعْمَلُوا فَسَيَرَى اللَّهُ عَمَلَكُمْ وَرَسُولُهُ وَالْمُؤْمِنُونَ" — continuous self-audit drives excellence

## Files

### New Files to Create
- `src/lib/skill-registry.ts` - Skill registry with tier validation (pattern: AIX skills-registry.ts)
- `src/lib/skill-quality-gate.ts` - Skill quality validation (pattern: AIX rules/skills.md)
- `src/lib/x402-payment-gateway.ts` - x402 payment protocol (pattern: AIX server/src/index.ts)
- `src/lib/performance-tracker.ts` - Skill performance tracking
- `src/lib/skill-executor.ts` - Skill execution runtime
- `src/lib/skill-sandbox.ts` - Skill isolation sandbox
- `src/lib/go-engine-client.ts` - Go engine client for high-performance compute
- `src/app/api/skills/[slug]/manifest/route.ts` - Skill manifest endpoint
- `src/app/api/skills/[slug]/install/route.ts` - Skill installation endpoint
- `src/app/api/skills/[slug]/rate/route.ts` - Skill rating endpoint
- `src/components/marketplace/SkillDetail.tsx` - Enhanced skill detail view
- `src/components/marketplace/SkillSearch.tsx` - Advanced search component
- `src/components/marketplace/SkillTierBadge.tsx` - Tier badge component
- `templates/skill-template.md` - Canonical skill template (pattern: AIX templates/skill-template.md)
- `rules/skills.md` - Skill quality gate rules (pattern: AIX rules/skills.md)
- `docs/MARKETPLACE_ARCHITECTURE.md` - Architecture documentation
- `docs/SKILL_AUTHORING_GUIDE.md` - Skill creation guide
- `docs/X402_PAYMENT_PROTOCOL.md` - Payment integration guide

### Files to Modify
- `src/app/api/skills/route.ts` - Add advanced filtering, search, tier enforcement
- `src/components/dashboard/PublishSkillForm.tsx` - Add quality validation, manifest editor
- `prisma/schema.prisma` - Add skill performance, rating, installation tracking
- `src/data/skills.json` - Replace with database-driven registry

## Interfaces

### Skill Registry Enhancement

**Pattern from AIX-Format skills-registry.ts**:
- Eager loading at module init (fail fast on malformed data)
- In-memory Map for O(1) lookup
- Boot-time validation: duplicate names, invalid prices, unsupported networks
- Tier-based default pricing
- Public projection (strips file paths)

```typescript
interface SkillRegistry {
  getSkill(slug: string): Promise<Skill | null>;
  listSkills(filters: SkillFilters): Promise<Skill[]>;
  validateSkill(skill: Skill): ValidationResult;
  getSkillPerformance(slug: string): PerformanceMetrics;
  priceFor(skill: Skill): string;
  isPaid(skill: Skill): boolean;
  toPublic(skill: Skill): PublicSkill;
}

interface SkillFilters {
  tier?: SkillTier;
  tags?: string[];
  priceRange?: [number, number];
  search?: string;
  sort?: 'popular' | 'newest' | 'rating' | 'price_asc' | 'price_desc';
}

// Tier defaults (AIX pattern)
const TIER_DEFAULT_PRICE_USDC: Record<SkillTier, string> = {
  BASIC_TOOL: '0',
  PRO: '0',
  ADVANCED_TOOL: '0',
  ADVANCED_INFRASTRUCTURE: '0',
  SOVEREIGN: '0',
};
```

### x402 Payment Gateway

**Pattern from AIX-Format server/src/index.ts**:
- Hono middleware for payment verification
- Dynamic price registration per route
- Free skills bypass payment middleware entirely
- Wallet validation at runtime (fail fast on misconfiguration)
- CORS permissive on read side, payment gate on write side

```typescript
interface X402PaymentGateway {
  requestPayment(skill: Skill): PaymentRequest;
  settlePayment(payment: PaymentPayload): Promise<SettlementResult>;
  verifyPayment(paymentId: string): Promise<boolean>;
  // AIX pattern: dynamic middleware per skill
  createPaymentMiddleware(skill: Skill): MiddlewareHandler;
}

// AIX pattern: wallet validation
function validateWallet(wallet: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(wallet);
}
```

### Skill Executor

**Pattern from AIX-Format go-engine**:
- Parallel processing with worker pools (goroutines)
- Batch analysis with configurable max workers
- Resonance calculation (LID, Shannon entropy, persistent homology)
- CLI mode for standalone execution
- HTTP server mode for API access

```typescript
interface SkillExecutor {
  execute(skill: Skill, context: ExecutionContext): Promise<ExecutionResult>;
  sandbox(skill: Skill): Promise<SandboxResult>;
  validateManifest(manifest: string): ValidationResult;
  // SOUL Protocol methods
  executeWithMuraqabah(skill: Skill, context: ExecutionContext, intention: string): Promise<ExecutionResult>;
  executeWithTasbih(skill: Skill, context: ExecutionContext): Promise<ExecutionResult>; // 3-retry pattern
  recordToTrustChain(action: string, intention: string): Promise<void>;
  // Go engine integration
  callGoEngine(endpoint: string, payload: GoEngineRequest): Promise<GoEngineResponse>;
}

// AIX pattern: Go engine client for high-performance compute
interface GoEngineClient {
  analyzeResonance(embedding: number[]): Promise<ResonanceResult>;
  calculateLID(embedding: number[], references: number[][], k: number): Promise<LIDResult>;
  calculateShannonHEL(text: string): Promise<ShannonResult>;
  calculatePersistentHomology(embedding: number[], threshold: number): Promise<HomologyResult>;
  processBatchParallel(surahs: SurahData[], config: BatchConfig): Promise<BatchResult>;
}
```

## Implementation Steps

### Phase 1: Foundation (Week 1)

- [ ] **Step 1: Database Schema Enhancement**
  - Add `SkillPerformance` model with success rate, execution count, last execution
  - Add `SkillRating` model with user ratings, comments
  - Add `SkillInstallation` model tracking user skill installs
  - Add `SkillTag` junction table for many-to-many tag relationships
  - Run Prisma migration

- [ ] **Step 2: Skill Registry Implementation**
  - Create `src/lib/skill-registry.ts` with tier validation (AIX pattern: eager loading, O(1) Map lookup)
  - Implement boot-time validation (duplicate names, invalid prices, unsupported networks)
  - Implement skill caching layer (Redis/Upstash)
  - Add skill search with full-text indexing
  - Add skill versioning support
  - Add public projection (strip file paths from API responses)

- [ ] **Step 3: Quality Gate Implementation**
  - Create `src/lib/skill-quality-gate.ts` (AIX pattern: validate_skill_quality.py)
  - Implement section validation (Purpose, Constitutional Alignment, Operational Flow, Failure Modes)
  - Add stub detection patterns: `TODO: Define ...`, `TBD`, `<fill in>`, `<placeholder>`
  - Support bilingual section headers (English + Arabic aliases)
  - Implement two modes: `changed` (CI default) and `strict` (cleanup PRs)
  - Add pre-commit hook for local validation (AIX pattern: hooks/repo/pre-commit)
  - Integrate into publish flow

### Phase 2: Payment & Economy (Week 2)

- [ ] **Step 4: x402 Payment Gateway**
  - Create `src/lib/x402-payment-gateway.ts` (AIX pattern: server/src/index.ts)
  - Implement payment request generation with dynamic middleware per skill
  - Add Pi Network支付 integration (AxiomID-specific, replaces Base network)
  - Add wallet validation at runtime (fail fast on misconfiguration)
  - Add payment verification callback
  - Create payment settlement webhook
  - Implement free skill bypass (no 402 for price=0)

- [ ] **Step 5: Enhanced API Endpoints**
  - Add `/api/skills/[slug]/manifest` with payment check
  - Add `/api/skills/[slug]/install` with payment verification
  - Add `/api/skills/[slug]/rate` for user ratings
  - Add `/api/skills/search` with advanced filtering
  - Add rate limiting per endpoint

### Phase 3: Execution Runtime (Week 3)

- [ ] **Step 6: Skill Sandbox**
  - Create `src/lib/skill-sandbox.ts`
  - Implement Web Worker isolation
  - Add resource limits (CPU, memory, time)
  - Add network access controls
  - Add file system sandboxing
  - **SOUL**: Enforce Muraqabah - sandbox logs all actions with intentions

- [ ] **Step 7: Skill Executor**
  - Create `src/lib/skill-executor.ts`
  - Implement manifest parsing and execution
  - Add context injection (user, session, environment)
  - Add result validation
  - Add error handling and logging
  - **SOUL**: Implement Tasbih Triplet (3-retry pattern with exponential backoff)
  - **SOUL**: Add TrustChain recording for every execution with intention
  - **AIX pattern**: Add Go engine client integration for high-performance compute
  - **AIX pattern**: Implement parallel processing with worker pools (for batch operations)

- [ ] **Step 8: Performance Tracking**
  - Create `src/lib/performance-tracker.ts`
  - Track execution success/failure rates
  - Track execution duration
  - Track resource usage
  - Add performance dashboard
  - **SOUL**: Implement Sab'iyyah Wisdom (synthesize patterns every 7 executions)
  - **SOUL**: Implement Self-Review Protocol (autonomous critique and quality metrics logging)

### Phase 4: UI Enhancement (Week 4)

- [ ] **Step 9: Advanced Marketplace UI**
  - Create `SkillDetail.tsx` with full skill information
  - Add skill installation flow with payment
  - Add skill rating and review system
  - Add skill version history display
  - Add skill dependency visualization

- [ ] **Step 10: Search and Discovery**
  - Create `SkillSearch.tsx` with advanced filters
  - Add tier-based filtering
  - Add tag-based filtering
  - Add price range filtering
  - Add sorting options

- [ ] **Step 11: Authoring Tools**
  - Enhance `PublishSkillForm.tsx` with manifest editor
  - Create `templates/skill-template.md` (AIX pattern: canonical template with 4 required sections)
  - Add skill template library with bilingual support (English + Arabic)
  - Add skill preview functionality
  - Add skill validation feedback (AIX pattern: section validation, stub detection)
  - Add skill testing interface
  - Integrate with pre-commit hook for local validation

### Phase 5: Documentation & Testing (Week 5)

- [ ] **Step 12: Documentation**
  - Create `MARKETPLACE_ARCHITECTURE.md`
  - Create `SKILL_AUTHORING_GUIDE.md` (AIX pattern: templates/skill-template.md)
  - Create `rules/skills.md` (AIX pattern: skill quality gate documentation)
  - Create `X402_PAYMENT_PROTOCOL.md`
  - Update API documentation
  - Create migration guide for existing skills

- [ ] **Step 13: Testing**
  - Add E2E tests for skill installation flow
  - Add E2E tests for payment flow
  - Add unit tests for quality gate
  - Add unit tests for skill executor
  - Add performance tests for sandbox
  - **SOUL**: Test Tasbih Triplet retry pattern (verify 3 attempts, not 2 or infinite)
  - **SOUL**: Test TrustChain immutability (verify hash chains prevent tampering)
  - **SOUL**: Test Muraqabah logging (verify all actions logged with intentions)

- [ ] **Step 14: Migration**
  - Migrate existing skills from JSON to database
  - Add skill metadata (tags, descriptions, examples)
  - Import AIX-Format skills (selectively, 20-30 core skills)
  - Test migration data integrity
  - Update skill registry

## Migration Strategy

### Skill Import from AIX-Format

**High-Priority Skills to Import** (Tier-based selection):

**Sovereign Tier** (Must-have):
- `sovereign-constitution` - Ethical filter with 4-layer constitution (Absolute, Interpretive, Consensus, Experimental)
- `covenant-guard` - Truth binding with digital oath
- `trust-chain` - Immutable append-only ledger

**Advanced Infrastructure** (Critical):
- `memory-bridge` - 5-tier memory architecture (Hot RAM → Warm SQLite → Cold Redis → Vector Qdrant → Archive LanceDB)
- `circuit-breaker` - Failure isolation
- `version-guard` - Version compatibility

**Pro Tier** (High-value):
- `topology-orchestrator` - Execution routing
- `prompt-weaver` - Prompt engineering with 7-thread philosophy
- `skill-evaluator` - Quality metrics

**Basic Tool Tier** (Utility):
- `open-mcp-connectors` - MCP integration
- `data-alchemist` - Data visualization
- `prompt-templates` - Template library

**Skill Manifest Pattern** (from AIX-Format `templates/skill-template.md`):
```markdown
# Skill: <Human Readable Name>

## Purpose
What this skill exists to do, in one or two sentences.

## Constitutional Alignment
How this skill upholds the Sovereign Constitution.

## Operational Flow
1. Step one
2. Step two
3. Step three

## Failure Modes
| Mode | Detection | Recovery |
|------|-----------|----------|
| Invalid input | Schema check at entry | Reject with structured error |
```

**Import Process**:
1. Parse AIX-Format `skills.json`
2. Convert skill manifests to AxiomID format (add bilingual support)
3. Validate against AxiomID schema (AIX pattern: boot-time validation)
4. Add Pi pricing (convert USDC to Pi)
5. Add bilingual descriptions (en/ar) - AIX supports Arabic section headers
6. Import to database
7. Test skill execution
8. Run quality gate validation (AIX pattern: validate_skill_quality.py)

## Risk Mitigation

### Technical Risks
- **Sandbox escape**: Use Web Workers with strict resource limits
- **Payment fraud**: Implement payment verification with blockchain confirmation
- **Skill quality**: Enforce quality gates before publication
- **Performance degradation**: Implement caching and rate limiting

### Business Risks
- **User adoption**: Provide migration guide and incentives
- **Skill supply**: Seed marketplace with high-quality imported skills
- **Payment friction**: Offer free tier for basic skills

## Success Metrics

- **Technical**: 95% skill execution success rate, <200ms API response time
- **Business**: 50+ published skills, 1000+ installations in first month
- **Quality**: 100% skills pass quality gate, <5% payment failure rate
- **SOUL Protocol Compliance**:
  - 100% skill executions logged to TrustChain with intentions
  - 100% failed executions trigger Tawbah (confess → repair → learn)
  - Tasbih Triplet: 100% retries follow 3-cycle pattern (not 2 or infinite)
  - Sab'iyyah: Pattern synthesis every 7 executions
  - Self-Review: Autonomous critique and quality metrics logging

## Rollout Plan

1. **Week 1-2**: Foundation and payment (internal testing)
2. **Week 3**: Execution runtime (beta with select users)
3. **Week 4**: UI enhancement (public beta)
4. **Week 5**: Documentation and migration (public launch)

## Post-Launch

- Monitor skill performance metrics
- Gather user feedback on marketplace
- Iterate on quality gate rules
- Expand skill catalog with community submissions
- Add skill recommendation engine
- Implement skill marketplace analytics dashboard
- **AIX pattern**: Add Go engine for high-performance compute tasks (resonance, LID, Shannon entropy)
- **AIX pattern**: Implement parallel processing for batch skill operations

## AIX-Format Code Patterns Summary

### Key Patterns to Adopt

1. **Skill Registry** (`skills-registry.ts`):
   - Eager loading at module init
   - In-memory Map for O(1) lookup
   - Boot-time validation (duplicate names, invalid prices, unsupported networks)
   - Tier-based default pricing
   - Public projection (strip file paths)

2. **Payment Gateway** (`server/src/index.ts`):
   - Hono middleware for payment verification
   - Dynamic price registration per route
   - Free skills bypass payment middleware
   - Wallet validation at runtime
   - CORS permissive on read, payment gate on write

3. **Quality Gate** (`validate_skill_quality.py`):
   - Section validation (4 required sections)
   - Stub detection patterns
   - Bilingual section header support (English + Arabic)
   - Two modes: `changed` (CI) and `strict` (cleanup)
   - Pre-commit hook for local validation

4. **Skill Template** (`templates/skill-template.md`):
   - 4 required sections: Purpose, Constitutional Alignment, Operational Flow, Failure Modes
   - Bilingual support
   - Structured failure modes table

5. **Go Engine** (`go-engine/`):
   - Parallel processing with worker pools
   - High-performance compute (resonance, LID, Shannon entropy, persistent homology)
   - CLI mode + HTTP server mode
   - Batch analysis support

6. **Skill Manifests** (e.g., `sovereign-constitution.md`, `memory-bridge.md`):
   - Bilingual content (English + Arabic)
   - Constitutional alignment section
   - Detailed operational flow
   - Comprehensive failure modes table
