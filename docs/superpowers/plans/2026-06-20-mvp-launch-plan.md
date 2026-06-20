# AxiomID MVP Launch Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working MVP where users connect Pi wallet, create agents, claim stamps, browse skills, and share public passports. No fake data, no stubs in the user-facing flow.

**Architecture:** Vercel (Next.js 16) + Cloudflare Workers. PostgreSQL via Prisma. Pi Network SDK for auth. W3C DIDs and VCs for identity. Physics-inspired trust scoring.

**Tech Stack:** Next.js 16, Prisma, PostgreSQL, Pi Network SDK, Cloudflare Workers, D1, KV, Tailwind CSS, Framer Motion

## Current State (from audit)

| Area | Status | Gap |
|:---|:---|:---|
| Auth (Pi Browser) | Working | — |
| Auth (Sandbox) | **CRITICAL BUG** | Sandbox token bypass on all Vercel previews |
| Dashboard | Working | — |
| DID System | Working | — |
| Stamps/XP/Tiers | Working | — |
| Skills Marketplace | Working | Review aggregation broken (avgRating never updates) |
| Public Passports | Working | — |
| Explorer | Working | — |
| Agent Actions | **Stub** | POST /api/agent/main only logs, no execution |
| KYA Verification | **Cosmetic** | Sets status to PENDING, no real verification |
| Sandbox Execution | **Simulated** | UI exists but no real code execution |
| IPFS Publishing | **Mocked** | Returns mock CID |
| D1 Sync | **Commented out** | Framework exists, code disabled |

## What Ships in MVP vs Post-MVP

| Feature | MVP? | Why |
|:---|:---|:---|
| Pi wallet auth + DID creation | YES | Core value |
| Dashboard with real data | YES | Core value |
| Stamps + XP + tiers | YES | Core value |
| Skills marketplace (browse/install) | YES | Core value |
| Public passports + QR | YES | Core value |
| Explorer (live stats) | YES | Social proof |
| Fix sandbox auth bypass | YES | CRITICAL security |
| Fix review aggregation | YES | Broken feature |
| Agent action dispatch | YES | Agents must do *something* |
| KYA real verification | NO | Needs Pi Network API access |
| Sandbox code execution | NO | Needs VM isolation, complex |
| IPFS publishing | NO | Needs IPFS node or Pinata |
| D1→PG sync | NO | Infrastructure, not user-facing |

---

## Task 1: Fix CRITICAL Sandbox Auth Bypass

**Files:**
- Modify: `src/app/api/auth/pi/route.ts:62-72`

**Why:** Any Vercel preview deployment accepts the hardcoded token `"sandbox-dev-token-abc-123"`. An attacker can create arbitrary user accounts on any preview URL.

- [ ] **Step 1: Read the current sandbox detection logic**

```bash
cat src/app/api/auth/pi/route.ts | head -80
```

- [ ] **Step 2: Fix the isSandboxOrDev check**

Remove `host.includes("vercel.app")` from the sandbox detection. Only allow sandbox mode via explicit env var or localhost.

In `src/app/api/auth/pi/route.ts`, find the `isSandboxOrDev` variable and replace:

```typescript
// BEFORE (insecure):
const isSandboxOrDev = (
  process.env.NEXT_PUBLIC_PI_SANDBOX === "true" ||
  host.includes("localhost") ||
  host.includes("vercel.app") ||
  host.includes("127.0.0.1") ||
  (typeof window !== "undefined" && window.location?.search?.includes("sandbox=true"))
);

// AFTER (secure):
const isSandboxOrDev = (
  process.env.NEXT_PUBLIC_PI_SANDBOX === "true" ||
  host.includes("localhost") ||
  host.includes("127.0.0.1")
);
```

- [ ] **Step 3: Run tests**

```bash
npm test -- --testPathPattern="auth" --verbose
npm run lint
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/pi/route.ts
git commit -m "fix(security): remove vercel.app from sandbox auth bypass — CRITICAL"
```

---

## Task 2: Fix Skill Review Aggregation

**Files:**
- Modify: `src/app/api/skills/[slug]/review/route.ts`
- Modify: `prisma/schema.prisma` (if avgRating/ratingCount fields don't exist)

**Why:** When users submit reviews, `avgRating` and `ratingCount` on the Skill model are never updated. The marketplace shows stale ratings.

- [ ] **Step 1: Check if avgRating/ratingCount exist on Skill model**

```bash
grep -n "avgRating\|ratingCount" prisma/schema.prisma
```

- [ ] **Step 2: Add aggregation logic to the POST handler**

In `src/app/api/skills/[slug]/review/route.ts`, after creating the review, add aggregation:

```typescript
// After creating the review, update skill aggregate
const aggregations = await prisma.skillReview.aggregate({
  where: { skillId: skill.id },
  _avg: { rating: true },
  _count: { rating: true },
});

await prisma.skill.update({
  where: { id: skill.id },
  data: {
    avgRating: aggregations._avg.rating ?? 0,
    ratingCount: aggregations._count.rating,
  },
});
```

- [ ] **Step 3: Add test for review aggregation**

Create or update `src/__tests__/api/skill-review.test.ts`:

```typescript
it("should update avgRating and ratingCount on Skill after review", async () => {
  // Create a skill, submit a review, verify avgRating updated
});
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --testPathPattern="skill" --verbose
npm run lint
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/skills/[slug]/review/route.ts
git commit -m "fix: update skill avgRating/ratingCount on review submit"
```

---

## Task 3: Make Agent Action Dispatch Do Something

**Files:**
- Modify: `src/app/api/agent/main/route.ts`

**Why:** POST /api/agent/main only logs the action and returns a text message. Agents can't actually execute anything. For MVP, agents should at least echo back a meaningful response or trigger a stamp claim.

- [ ] **Step 1: Read current dispatch logic**

```bash
cat src/app/api/agent/main/route.ts
```

- [ ] **Step 2: Implement basic action dispatch**

Replace the stub with a dispatcher that handles known action types. For MVP, support: `query` (return agent info), `status` (return agent status), `dispatch` (log + return acknowledgement).

```typescript
// In the POST handler, after validation:
const agent = await prisma.userAgent.findFirst({
  where: { userId: user.id, status: "ACTIVE" },
});

if (!agent) {
  return apiError("NOT_FOUND", "No active agent found");
}

// Log the action
await prisma.agentLog.create({
  data: {
    userId: user.id,
    agentId: agent.id,
    level: "INFO",
    message: `Action dispatched: ${sanitizedAction}`,
    metadata: { action: sanitizedAction, input: sanitizedInput },
  },
});

// Basic dispatch
let responseMessage: string;
switch (sanitizedAction) {
  case "status":
    responseMessage = `Agent "${agent.name}" is ${agent.status}. Mode: ${agent.mode}.`;
    break;
  case "query":
    responseMessage = JSON.stringify({ name: agent.name, status: agent.status, mode: agent.mode });
    break;
  default:
    responseMessage = `Action "${sanitizedAction}" logged. Agent "${agent.name}" acknowledged.`;
}

return NextResponse.json({ success: true, message: responseMessage });
```

- [ ] **Step 3: Run tests**

```bash
npm test -- --testPathPattern="agent" --verbose
npm run lint
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/agent/main/route.ts
git commit -m "feat: implement basic agent action dispatch (status, query, default)"
```

---

## Task 4: Fix Landing Page Header Contrast

**Files:**
- Modify: `src/app/page.tsx` (header section)

**Why:** Header text blends into the page background when scrolling. Need sticky header with visible background.

- [ ] **Step 1: Verify current header classes**

Check that header has `sticky top-0 z-50 backdrop-blur-xl bg-[#0a0b10]/90 border-b border-white/5`

- [ ] **Step 2: Test in browser**

```bash
npm run dev
```

Open http://localhost:3000, scroll down, verify header stays visible with readable text.

- [ ] **Step 3: Commit (if changes needed)**

```bash
git add src/app/page.tsx
git commit -m "fix: header sticky with backdrop-blur for readability"
```

---

## Task 5: Fix Footer Link Visibility

**Files:**
- Modify: `src/app/page.tsx` (footer section)

**Why:** Footer links have no base color — they're invisible until hovered.

- [ ] **Step 1: Verify footer links have `text-subtle` class**

Check that each `<Link>` in the footer has `className="text-subtle hover:text-surface transition-colors"`

- [ ] **Step 2: Test in browser**

Verify footer links are visible in both dark and light themes.

- [ ] **Step 3: Commit (if changes needed)**

```bash
git add src/app/page.tsx
git commit -m "fix: footer link visibility with text-subtle base color"
```

---

## Task 6: Merge PR #74 (3D Passport + Showcase)

**Files:** Already on branch `feat/ux-11-overhaul`

**Why:** PR #74 adds 3D passport and Showcase mode. CI was failing (lint errors). We fixed the lint errors in earlier tasks. Now merge it.

- [ ] **Step 1: Push fixes to PR #74 branch**

```bash
git push origin feat/ux-11-overhaul
```

- [ ] **Step 2: Wait for CI to pass**

```bash
gh pr checks 74
```

- [ ] **Step 3: Merge if green**

```bash
gh pr merge 74 --squash --auto
```

- [ ] **Step 4: Switch back to main and pull**

```bash
git checkout main && git pull origin main
```

---

## Task 7: Final QA — Full Test Suite + Build

**Files:** None (verification only)

**Why:** Ensure everything passes before calling MVP done.

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: 852+ tests pass, 0 failures.

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Run build**

```bash
npx next build --webpack
```

Expected: Build succeeds.

- [ ] **Step 5: Verify Vercel deployment**

Check that the latest commit auto-deploys to axiomid.app. Verify:
- Landing page loads, header sticky, footer visible
- Dashboard renders with real data
- Auth flow works (Pi Browser or sandbox in dev)
- Marketplace shows skills with correct ratings
- Explorer shows live stats
- Public passport page loads

---

## Task 8: Commit Everything + Update README

**Files:**
- Modify: `README.md` (already rewritten to 125 lines)
- Modify: `AGENTS.md` (ponytail rules appended)

- [ ] **Step 1: Stage all uncommitted changes**

```bash
git add -A
```

- [ ] **Step 2: Review what's staged**

```bash
git status
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: MVP launch prep — security fixes, review aggregation, agent dispatch, UI polish

- Fix CRITICAL sandbox auth bypass (vercel.app domain removed)
- Fix skill review aggregation (avgRating/ratingCount now updated)
- Implement basic agent action dispatch (status, query, default)
- Fix header sticky + backdrop-blur for readability
- Fix footer link visibility with text-subtle
- Rewrite README (563→125 lines, ponytail YAGNI)
- Fix 14 lint/type errors across codebase
- Add ponytail rules to AGENTS.md"
```

- [ ] **Step 4: Push**

```bash
git push origin feat/ux-11-overhaul
```

- [ ] **Step 5: Create PR to main**

```bash
gh pr create --title "feat: MVP launch — security, UX, agent dispatch" --body "MVP readiness: all critical bugs fixed, full test suite passing."
```

---

## Post-MVP Backlog (not blocking launch)

| Item | Priority | Effort |
|:---|:---|:---|
| KYA real verification (Pi Network API) | High | 2-3 days |
| Sandbox real execution (VM2/isolated-vm) | High | 1 week |
| IPFS real publishing (Pinata/Web3.Storage) | Medium | 2 days |
| D1→PG sync uncomment + test | Medium | 1 day |
| Skill review rating display on marketplace cards | Low | 1 hour |
| math-physics.ts dedup (shared package) | Low | 1 day |
| Rate limit per-user instead of static key on /sync | Low | 30 min |
| LIKE wildcard escaping in skill search | Low | 30 min |

---

## Verification Checklist

After all tasks complete, verify:

- [ ] `npm test` → 852+ pass
- [ ] `npm run lint` → 0 errors
- [ ] `npx tsc --noEmit` → clean
- [ ] `npx next build --webpack` → success
- [ ] Landing page: header sticky, footer readable
- [ ] Dashboard: passport, stamps, agent, marketplace all render
- [ ] Auth: Pi Browser login works, sandbox fallback works on localhost only
- [ ] Marketplace: skills show correct avgRating after reviews
- [ ] Agent: POST /api/agent/main returns meaningful response
- [ ] Explorer: live stats update
- [ ] Public passport: loads by slug/wallet/DID
- [ ] Vercel preview deploys do NOT accept sandbox token
