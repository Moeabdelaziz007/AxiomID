# T2 — Loops.so Email Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Loops.so email service to send transactional emails on key user lifecycle events (welcome, claim, trust upgrade, agent deploy, weekly digest).

**Architecture:** Thin wrapper (`src/lib/email.ts`) around `@loops-so/node` SDK. Events fired inline at call sites in existing route handlers. No event bus — YAGNI.

**Tech Stack:** `@loops-so/node`, Loops.so API, Next.js App Router, Prisma, TypeScript strict mode.

## Global Constraints

- `"strict": true` in tsconfig — never weaken
- No `as any` casts — use `unknown` for external data boundaries
- No `console.log` in route handlers — use `logger` from `@/lib/logger`
- No new dependencies if avoidable (Loops SDK is the one exception here)
- Vercel Functions are stateless — no in-memory state between requests
- Tests: `jest` with `--forceExit`, 1238+ tests must remain passing
- Commit messages follow IQRA Chronicle format: `type(scope): description ۞`

## File Structure

```
src/lib/email.ts                    ← Loops SDK wrapper (NEW)
src/__tests__/lib/email.test.ts     ← Unit tests (NEW)
src/app/api/auth/pi/route.ts        ← Add welcome email (MODIFY: ~line 134)
src/app/api/stamp/claim/route.ts    ← Add claim email (MODIFY: ~line 170)
.vercel.json                        ← Add weekly digest cron (MODIFY)
.env.example                        ← Add LOOPS_API_KEY (MODIFY)
```

---

### Task T2.1: Install Loops SDK + Create Email Wrapper

**Files:**

- Create: `src/lib/email.ts`
- Create: `src/__tests__/lib/email.test.ts`
- Modify: `package.json` (add dependency)

**Interfaces:**

- Produces: `sendEvent(eventName: string, contactProps: Record<string, unknown>): Promise<void>`

- [ ] **Step 1: Install Loops SDK**

```bash
npm install @loops-so/node
```

- [ ] **Step 2: Write failing test for email wrapper**

```typescript
// src/__tests__/lib/email.test.ts
jest.mock('@loops-so/node', () => ({
  LoopsClient: jest.fn().mockImplementation(() => ({
    sendEvent: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { sendEvent } from '@/lib/email';
import { LoopsClient } from '@loops-so/node';

describe('sendEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LOOPS_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.LOOPS_API_KEY;
  });

  it('sends event to Loops SDK', async () => {
    await sendEvent('pioneer_joined', { userId: 'u1', did: 'did:test' });

    expect(LoopsClient).toHaveBeenCalledWith('test-key');
    const mockInstance = (LoopsClient as jest.Mock).mock.results[0].value;
    expect(mockInstance.sendEvent).toHaveBeenCalledWith({
      eventName: 'pioneer_joined',
      userId: 'u1',
      did: 'did:test',
    });
  });

  it('throws when LOOPS_API_KEY is missing', async () => {
    delete process.env.LOOPS_API_KEY;

    await expect(sendEvent('test_event', { userId: 'u1' })).rejects.toThrow('LOOPS_API_KEY');
  });

  it('does not throw on SDK errors (fire-and-forget)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const mockInstance = { sendEvent: jest.fn().mockRejectedValue(new Error('API down')) };
    (LoopsClient as jest.Mock).mockImplementation(() => mockInstance);

    // Should not throw — fire-and-forget with logging
    await expect(sendEvent('test_event', { userId: 'u1' })).resolves.not.toThrow();

    consoleSpy.mockRestore();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx jest src/__tests__/lib/email.test.ts --forceExit
```

Expected: FAIL — `sendEvent` not defined

- [ ] **Step 4: Implement email wrapper**

```typescript
// src/lib/email.ts
import { LoopsClient } from '@loops-so/node';
import { logger } from './logger';

function getLoopsClient(): LoopsClient {
  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) {
    throw new Error('LOOPS_API_KEY environment variable is required');
  }
  return new LoopsClient(apiKey);
}

/**
 * Send a Loops.so event (fire-and-forget with error logging).
 *
 * @param eventName - The event name configured in Loops.so dashboard
 * @param contactProps - Contact properties (userId, did, xp, tier, etc.)
 */
export async function sendEvent(
  eventName: string,
  contactProps: Record<string, unknown>
): Promise<void> {
  try {
    const client = getLoopsClient();
    await client.sendEvent({ eventName, ...contactProps });
    logger.info('[EMAIL] Event sent', { eventName });
  } catch (err) {
    logger.error('[EMAIL] Failed to send event', {
      eventName,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest src/__tests__/lib/email.test.ts --forceExit
```

Expected: PASS (3/3)

- [ ] **Step 6: Commit**

```bash
git add src/lib/email.ts src/__tests__/lib/email.test.ts package.json package-lock.json
git commit -m "feat(email): add Loops.so SDK wrapper ۞"
```

---

### Task T2.2: Wire Welcome Email to Auth Route

**Files:**

- Modify: `src/app/api/auth/pi/route.ts` (add import + sendEvent call)

**Interfaces:**

- Consumes: `sendEvent` from `@/lib/email`

- [ ] **Step 1: Read current auth route**

Read `src/app/api/auth/pi/route.ts` — identify the `prisma.user.create` block (line ~120-134).

- [ ] **Step 2: Add import + welcome email**

Add at top of file:

```typescript
import { sendEvent } from '@/lib/email';
```

After `prisma.user.create` (the new user block), add:

```typescript
// Fire-and-forget welcome email
sendEvent('pioneer_joined', {
  userId: user.id,
  did,
  piUsername: username || null,
}).catch(() => {});
```

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: clean

- [ ] **Step 4: Run existing auth tests**

```bash
npx jest src/__tests__/api/ --forceExit
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/pi/route.ts
git commit -m "feat(auth): fire pioneer_joined event on first Pi login ۞"
```

---

### Task T2.3: Wire Claim Email to Stamp Claim Route

**Files:**

- Modify: `src/app/api/stamp/claim/route.ts` (add import + sendEvent call)

**Interfaces:**

- Consumes: `sendEvent` from `@/lib/email`

- [ ] **Step 1: Read current claim route**

Read `src/app/api/stamp/claim/route.ts` — identify the return block after `prisma.$transaction` (line ~170).

- [ ] **Step 2: Add import + claim email**

Add at top of file:

```typescript
import { sendEvent } from '@/lib/email';
```

After the transaction completes and before the return, add:

```typescript
// Fire-and-forget claim email
sendEvent('claim_completed', {
  userId: authUser.id,
  did: authUser.did,
  piUsername: authUser.piUsername,
  stampType: actionType,
  xpEarned: actionDef.xp,
  newBalance,
  newTier,
}).catch(() => {});
```

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: clean

- [ ] **Step 4: Run existing claim tests**

```bash
npx jest src/__tests__/api/ --forceExit
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stamp/claim/route.ts
git commit -m "feat(claim): fire claim_completed event on stamp claim ۞"
```

---

### Task T2.4: Add Weekly Digest Cron

**Files:**

- Modify: `vercel.json` (add cron entry)

**Interfaces:**

- Consumes: `sendEvent` from `@/lib/email` (in the cron route, created separately)

- [ ] **Step 1: Add cron to vercel.json**

Add to the `crons` array:

```json
{
  "path": "/api/weekly-digest",
  "schedule": "0 8 * * 1"
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat(cron): add weekly digest schedule ۞"
```

---

### Task T2.5: Update .env.example

**Files:**

- Modify: `.env.example`

- [ ] **Step 1: Add Loops vars**

```bash
# ── Loops.so (Email Automation) ──────────────────────────────
# Get from: https://loops.so → Settings → API
LOOPS_API_KEY=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs(env): add LOOPS_API_KEY to .env.example ۞"
```

---

### Task T2.6: Full Verification

- [ ] **Step 1: typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: lint**

```bash
npm run lint
```

- [ ] **Step 3: full test suite**

```bash
npx jest --forceExit
```

Expected: 1238+ tests passing

- [ ] **Step 4: push**

```bash
git push origin feat/loops-email
```
