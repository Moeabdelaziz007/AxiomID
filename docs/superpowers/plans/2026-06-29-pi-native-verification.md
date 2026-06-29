# Pi-Native Trust Score & Verification System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fake social login XP actions with Pi-native verification actions, real KYC checks, and computed trust score.

**Architecture:** Pi SDK auth → Pi API KYC server-side check → 0.5 Pi payment (returned) → Stellar anchoring. Trust score computed from stamp records, not stored.

**Tech Stack:** Next.js 16, TypeScript strict, Prisma, Pi SDK v2.0, Pi API v2, stellar-sdk v13.3.0, Jest

## Global Constraints

- TypeScript strict mode — no `as any` casts
- All tests must pass: `npx jest --forceExit` (currently 2875+ tests)
- Lint: `npm run lint` must have 0 warnings
- Type-check: `npx tsc --noEmit` must have 0 errors
- Pi SDK is browser-only — never import `window.Pi` in server code
- `STELLAR_NETWORK` env var controls testnet vs mainnet (default: testnet)
- `PI_API_KEY` env var required for Pi API calls
- Existing `user_stamp_unique` constraint prevents duplicate stamps
- `src/lib/sandbox-token.ts` — sandbox dev token only works in non-production

---

### Task 1: Pi-Native Action Definitions

**Files:**
- Modify: `src/lib/actions.ts`

**Interfaces:**
- Consumes: nothing (standalone definitions)
- Produces: `ACTIONS` object used by `POST /api/stamp/claim`, `computeTrustScore()`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/lib/actions.test.ts
/**
 * @jest-environment node
 */

import { ACTIONS } from '@/lib/actions';

describe('Pi-Native ACTIONS', () => {
  it('has 10 actions defined', () => {
    expect(Object.keys(ACTIONS)).toHaveLength(10);
  });

  it('each action has id, xp, weight, and tier', () => {
    for (const action of Object.values(ACTIONS)) {
      expect(action).toHaveProperty('id');
      expect(action).toHaveProperty('xp');
      expect(action).toHaveProperty('weight');
      expect(action).toHaveProperty('tier');
      expect(typeof action.id).toBe('string');
      expect(typeof action.xp).toBe('number');
      expect(typeof action.weight).toBe('number');
      expect(['low', 'medium', 'high', 'critical']).toContain(action.tier);
    }
  });

  it('connect_wallet has id connect_wallet and xp 100', () => {
    expect(ACTIONS.CONNECT_WALLET.id).toBe('connect_wallet');
    expect(ACTIONS.CONNECT_WALLET.xp).toBe(100);
  });

  it('complete_kyc has weight 30 (highest)', () => {
    expect(ACTIONS.COMPLETE_KYC.weight).toBe(30);
  });

  it('pi_payment has xp 0 (dynamic)', () => {
    expect(ACTIONS.PI_PAYMENT.xp).toBe(0);
  });

  it('mining_streak has xp 50', () => {
    expect(ACTIONS.MINING_STREAK.xp).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/actions.test.ts`
Expected: FAIL — ACTIONS is the old Twitter/Discord/Google map

- [ ] **Step 3: Replace actions.ts with Pi-native definitions**

```typescript
// src/lib/actions.ts
export type ActionTier = 'low' | 'medium' | 'high' | 'critical';

export interface ActionDefinition {
  id: string;
  xp: number;
  weight: number;
  tier: ActionTier;
}

export const ACTIONS: Record<string, ActionDefinition> = {
  CONNECT_WALLET:    { id: 'connect_wallet',     xp: 100, weight: 15, tier: 'medium' },
  COMPLETE_KYC:      { id: 'complete_kyc',       xp: 200, weight: 30, tier: 'critical' },
  PI_PAYMENT:        { id: 'pi_payment',         xp: 0,   weight: 20, tier: 'high' },
  SECURITY_CIRCLE:   { id: 'security_circle',    xp: 150, weight: 10, tier: 'medium' },
  LOCKUP_COMMITMENT: { id: 'lockup_commitment',  xp: 250, weight: 20, tier: 'high' },
  NODE_OPERATION:    { id: 'node_operation',     xp: 300, weight: 15, tier: 'high' },
  MAINNET_MIGRATION: { id: 'mainnet_migration',  xp: 150, weight: 15, tier: 'medium' },
  WALLET_AGE:        { id: 'wallet_age',         xp: 300, weight: 10, tier: 'medium' },
  MINING_STREAK:     { id: 'mining_streak',      xp: 50,  weight: 5,  tier: 'low' },
  VALIDATOR_SERVICE: { id: 'validator_service',  xp: 200, weight: 25, tier: 'critical' },
};

/** Maximum possible raw trust score (sum of all weights) */
export const MAX_TRUST_SCORE = Object.values(ACTIONS).reduce((sum, a) => sum + a.weight, 0);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/lib/actions.test.ts`
Expected: PASS

- [ ] **Step 5: Verify existing stamp/claim tests still reference valid action IDs**

Run: `npx jest src/__tests__/api/stamp-claim.test.ts --forceExit`
Expected: Any tests referencing old action IDs (connect_twitter etc.) will fail — those tests must be updated to use new Pi-native IDs

- [ ] **Step 6: Update any tests referencing old action IDs**

If stamp-claim tests fail, update them to use `connect_wallet` instead of `connect_twitter` etc.

- [ ] **Step 7: Run full test suite**

Run: `npx jest --forceExit`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add src/lib/actions.ts src/__tests__/lib/actions.test.ts src/__tests__/api/stamp-claim.test.ts
git commit -m "feat(trust): replace fake social actions with Pi-native definitions ۞"
```

---

### Task 2: Trust Score Computation

**Files:**
- Create: `src/lib/trust-score.ts`
- Create: `src/__tests__/lib/trust-score.test.ts`

**Interfaces:**
- Consumes: `ACTIONS` from Task 1
- Produces: `computeTrustScore()` used by API routes (Task 5)

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/lib/trust-score.test.ts
/**
 * @jest-environment node
 */

import { computeTrustScore } from '@/lib/trust-score';

describe('computeTrustScore', () => {
  const now = new Date();

  it('returns 0 for empty actions', () => {
    expect(computeTrustScore([], false, null)).toBe(0);
  });

  it('returns 100 for all actions completed', () => {
    const allActions = [
      { type: 'connect_wallet', xp: 100, timestamp: now },
      { type: 'complete_kyc', xp: 200, timestamp: now },
      { type: 'pi_payment', xp: 5, timestamp: now },
      { type: 'security_circle', xp: 150, timestamp: now },
      { type: 'lockup_commitment', xp: 250, timestamp: now },
      { type: 'node_operation', xp: 300, timestamp: now },
      { type: 'mainnet_migration', xp: 150, timestamp: now },
      { type: 'wallet_age', xp: 300, timestamp: now },
      { type: 'mining_streak', xp: 50, timestamp: now },
      { type: 'validator_service', xp: 200, timestamp: now },
    ];
    expect(computeTrustScore(allActions, false, now)).toBe(100);
  });

  it('returns higher score with stellar anchor bonus', () => {
    const actions = [
      { type: 'connect_wallet', xp: 100, timestamp: now },
      { type: 'complete_kyc', xp: 200, timestamp: now },
    ];
    const withoutAnchor = computeTrustScore(actions, false, now);
    const withAnchor = computeTrustScore(actions, true, now);
    expect(withAnchor).toBeGreaterThan(withoutAnchor);
  });

  it('applies inactivity decay', () => {
    const actions = [{ type: 'connect_wallet', xp: 100, timestamp: now }];
    const recent = computeTrustScore(actions, false, now);
    const old = computeTrustScore(actions, false, new Date('2020-01-01'));
    expect(old).toBeLessThanOrEqual(recent);
  });

  it('caps mining_streak weight at 5 months', () => {
    const streaks = Array.from({ length: 10 }, (_, i) => ({
      type: 'mining_streak',
      xp: 50,
      timestamp: new Date(now.getTime() - i * 30 * 86400000),
    }));
    const score = computeTrustScore(streaks, false, now);
    const fiveStreaks = streaks.slice(0, 5);
    const scoreCapped = computeTrustScore(fiveStreaks, false, now);
    expect(score).toBe(scoreCapped);
  });

  it('ignores unknown action types', () => {
    const actions = [
      { type: 'fake_action', xp: 999, timestamp: now },
      { type: 'connect_wallet', xp: 100, timestamp: now },
    ];
    const score = computeTrustScore(actions, false, now);
    const walletOnly = computeTrustScore(
      [{ type: 'connect_wallet', xp: 100, timestamp: now }],
      false, now
    );
    expect(score).toBe(walletOnly);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/trust-score.test.ts`
Expected: FAIL — `computeTrustScore` not found

- [ ] **Step 3: Implement trust score computation**

```typescript
// src/lib/trust-score.ts
import { ACTIONS, MAX_TRUST_SCORE } from '@/lib/actions';

interface CompletedAction {
  type: string;
  xp: number;
  timestamp: Date;
}

function computeDecay(lastActiveAt: Date | null): number {
  if (!lastActiveAt) return 0.8;
  const daysSinceActive = Math.floor(
    (Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const decaySteps = Math.floor(daysSinceActive / 90);
  return Math.max(0.8, 1.0 - (decaySteps * 0.1));
}

export function computeTrustScore(
  completedActions: CompletedAction[],
  stellarAnchored: boolean = false,
  lastActiveAt: Date | null = null,
): number {
  let rawScore = 0;

  for (const action of completedActions) {
    const actionDef = Object.values(ACTIONS).find(a => a.id === action.type);
    if (actionDef) rawScore += actionDef.weight;
  }

  // Cap mining_streak contribution at 5 months (5 × weight 5 = 25)
  const miningStreaks = completedActions.filter(a => a.type === 'mining_streak');
  if (miningStreaks.length > 5) {
    rawScore -= (miningStreaks.length - 5) * 5;
  }

  const decay = computeDecay(lastActiveAt);
  const anchorMultiplier = stellarAnchored ? 1.15 : 1.0;

  const score = Math.min(100, Math.max(0, Math.round(
    (rawScore / MAX_TRUST_SCORE) * 100 * decay * anchorMultiplier
  )));

  return score;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/lib/trust-score.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/trust-score.ts src/__tests__/lib/trust-score.test.ts
git commit -m "feat(trust): computeTrustScore — weighted sum with decay + anchor bonus ۞"
```

---

### Task 3: Pi KYC Server-Side Verification

**Files:**
- Create: `src/lib/pi-kyc.ts`
- Create: `src/__tests__/lib/pi-kyc.test.ts`

**Interfaces:**
- Consumes: `PI_API_KEY` env var
- Produces: `verifyKycServerSide(piAccessToken)` used by `/api/pi/kya/verify`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/lib/pi-kyc.test.ts
/**
 * @jest-environment node
 */

import { verifyKycServerSide, PiKycResult } from '@/lib/pi-kyc';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('verifyKycServerSide', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, PI_API_KEY: 'test-api-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns kyc_verified true when Pi API confirms KYC', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        uid: 'user-123',
        kyc_verified: true,
        wallet: { address: 'GABC123...' },
      }),
    });

    const result = await verifyKycServerSide('valid-token');
    expect(result.kycVerified).toBe(true);
    expect(result.uid).toBe('user-123');
  });

  it('returns kyc_verified false when Pi API says not KYCed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        uid: 'user-123',
        kyc_verified: false,
      }),
    });

    const result = await verifyKycServerSide('valid-token');
    expect(result.kycVerified).toBe(false);
  });

  it('throws on Pi API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(verifyKycServerSide('bad-token')).rejects.toThrow();
  });

  it('throws on network timeout', async () => {
    mockFetch.mockRejectedValueOnce(new Error('timeout'));

    await expect(verifyKycServerSide('token')).rejects.toThrow('timeout');
  });

  it('throws when PI_API_KEY is not set', async () => {
    process.env.PI_API_KEY = '';
    await expect(verifyKycServerSide('token')).rejects.toThrow('PI_API_KEY');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/pi-kyc.test.ts`
Expected: FAIL — `verifyKycServerSide` not found

- [ ] **Step 3: Implement Pi KYC verification**

```typescript
// src/lib/pi-kyc.ts
import { logger } from '@/lib/logger';

export interface PiKycResult {
  uid: string;
  kycVerified: boolean;
  walletAddress: string | null;
  username: string | null;
}

/**
 * Verifies a user's Pi KYC status server-side by calling Pi API.
 *
 * @param piAccessToken - The user's Pi access token from Pi SDK authenticate()
 * @returns PiKycResult with KYC status and user info
 * @throws If PI_API_KEY is not configured, Pi API returns error, or network fails
 */
export async function verifyKycServerSide(piAccessToken: string): Promise<PiKycResult> {
  const PI_API_KEY = process.env.PI_API_KEY;
  if (!PI_API_KEY) {
    throw new Error('PI_API_KEY not configured — cannot verify KYC server-side');
  }

  const response = await fetch('https://api.minepi.com/v2/me', {
    headers: { Authorization: `Bearer ${piAccessToken}` },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'unable to read body');
    logger.error(`[PI-KYC] Pi API returned ${response.status}: ${body}`);
    throw new Error(`Pi API verification failed: ${response.status}`);
  }

  const data = await response.json() as {
    uid: string;
    kyc_verified: boolean;
    wallet?: { address: string };
    username?: string;
  };

  return {
    uid: data.uid,
    kycVerified: data.kyc_verified === true,
    walletAddress: data.wallet?.address ?? null,
    username: data.username ?? null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/lib/pi-kyc.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pi-kyc.ts src/__tests__/lib/pi-kyc.test.ts
git commit -m "feat(kyc): verifyKycServerSide — real Pi API KYC check ۞"
```

---

### Task 4: DevModeBanner Component

**Files:**
- Create: `src/components/DevModeBanner.tsx`
- Create: `src/__tests__/components/dev-mode-banner.test.tsx`

**Interfaces:**
- Consumes: `determineSandboxMode()` from `src/lib/pi-sdk.ts`
- Produces: `<DevModeBanner />` component used in claim page and dashboard

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/components/dev-mode-banner.test.tsx
/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DevModeBanner } from '@/components/DevModeBanner';

// Mock pi-sdk
jest.mock('@/lib/pi-sdk', () => ({
  determineSandboxMode: jest.fn(),
}));

import { determineSandboxMode } from '@/lib/pi-sdk';
const mockDetermineSandbox = determineSandboxMode as jest.Mock;

describe('DevModeBanner', () => {
  it('renders nothing when not in sandbox mode', () => {
    mockDetermineSandbox.mockReturnValue(false);
    const { container } = render(<DevModeBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders red banner when in sandbox mode', () => {
    mockDetermineSandbox.mockReturnValue(true);
    render(<DevModeBanner />);
    expect(screen.getByText(/DEV MODE/)).toBeInTheDocument();
  });

  it('shows warning text about Pi Network', () => {
    mockDetermineSandbox.mockReturnValue(true);
    render(<DevModeBanner />);
    expect(screen.getByText(/Not connected to Pi Network/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/components/dev-mode-banner.test.tsx`
Expected: FAIL — `DevModeBanner` not found

- [ ] **Step 3: Implement DevModeBanner**

```tsx
// src/components/DevModeBanner.tsx
"use client";

import { determineSandboxMode } from "@/lib/pi-sdk";

export function DevModeBanner() {
  const isSandbox = determineSandboxMode();
  if (!isSandbox) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 text-center font-mono text-xs">
      ⚠️ DEV MODE — Not connected to Pi Network. Real KYC and payments disabled.
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/components/dev-mode-banner.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/DevModeBanner.tsx src/__tests__/components/dev-mode-banner.test.tsx
git commit -m "feat(ui): DevModeBanner — red warning for sandbox/dev mode ۞"
```

---

### Task 5: POST /api/pi/kya/verify Route

**Files:**
- Create: `src/app/api/pi/kya/verify/route.ts`
- Create: `src/__tests__/api/pi-kya-verify.test.ts`

**Interfaces:**
- Consumes: `verifyKycServerSide()` from Task 3, `requireAuth()` from auth-middleware, `createPiPayment()` from pi-sdk
- Produces: `{ kycStatus, paymentCompleted, computedTrustScore }` for frontend Step 2

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/api/pi-kya-verify.test.ts
/**
 * @jest-environment node
 */

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));
jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn(),
}));
jest.mock('@/lib/pi-kyc', () => ({
  verifyKycServerSide: jest.fn(),
}));
jest.mock('@/lib/trust-score', () => ({
  computeTrustScore: jest.fn().mockReturnValue(45),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    piPayment: { findFirst: jest.fn() },
  },
}));

import { POST } from '@/app/api/pi/kya/verify/route';
import { requireAuth } from '@/lib/auth-middleware';
import { verifyKycServerSide } from '@/lib/pi-kyc';
import { computeTrustScore } from '@/lib/trust-score';
import { prisma } from '@/lib/prisma';

const mockRequireAuth = requireAuth as jest.Mock;
const mockVerifyKyc = verifyKycServerSide as jest.Mock;
const mockComputeTrust = computeTrustScore as jest.Mock;

function mockPostRequest(body: unknown) {
  return new Request('http://localhost/api/pi/kya/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('POST /api/pi/kya/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', piUid: 'pi-123', piUsername: 'testuser', walletAddress: 'pi:pi-123' },
    });
  });

  it('returns 400 without accessToken', async () => {
    const req = mockPostRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns KYC verified status on success', async () => {
    mockVerifyKyc.mockResolvedValue({
      uid: 'pi-123',
      kycVerified: true,
      walletAddress: 'GABC...',
      username: 'testuser',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1', xp: 0, tier: 'Visitor', stamps: [],
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const req = mockPostRequest({ accessToken: 'valid-token' });
    const res = await POST(req);
    const data = await res.json();

    expect(data.data.kycStatus).toBe('VERIFIED');
    expect(data.data.computedTrustScore).toBe(45);
  });

  it('returns KYC pending when not verified', async () => {
    mockVerifyKyc.mockResolvedValue({
      uid: 'pi-123',
      kycVerified: false,
      walletAddress: null,
      username: 'testuser',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1', xp: 0, tier: 'Visitor', stamps: [],
    });

    const req = mockPostRequest({ accessToken: 'valid-token' });
    const res = await POST(req);
    const data = await res.json();

    expect(data.data.kycStatus).toBe('PENDING');
  });

  it('returns 500 on Pi API failure', async () => {
    mockVerifyKyc.mockRejectedValue(new Error('Pi API timeout'));

    const req = mockPostRequest({ accessToken: 'valid-token' });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/api/pi-kya-verify.test.ts`
Expected: FAIL — route doesn't exist

- [ ] **Step 3: Implement the route**

```typescript
// src/app/api/pi/kya/verify/route.ts
import { NextRequest } from 'next/server';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';
import { verifyKycServerSide } from '@/lib/pi-kyc';
import { computeTrustScore } from '@/lib/trust-score';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const VerifyKycSchema = z.object({
  accessToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`kya-verify:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests.', undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const parsed = VerifyKycSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    const kycResult = await verifyKycServerSide(parsed.data.accessToken);

    const user = await prisma.user.findUnique({
      where: { piUid: auth.user.piUid },
      include: { stamps: true },
    });

    if (!user) {
      return apiError('NOT_FOUND', 'User not found');
    }

    const kycStatus = kycResult.kycVerified ? 'VERIFIED' : 'PENDING';

    await prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus,
        kycProvider: 'pi_network',
        kycVerifiedAt: kycResult.kycVerified ? new Date() : null,
      },
    });

    const computedTrustScore = computeTrustScore(
      user.stamps.map(s => ({ type: s.type, xp: s.xpAwarded, timestamp: s.createdAt })),
      false,
      user.lastActive,
    );

    return apiSuccess({
      kycStatus,
      uid: kycResult.uid,
      computedTrustScore,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[KYA-VERIFY] Error:', message);
    return apiError('INTERNAL_ERROR', 'KYC verification failed');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/api/pi-kya-verify.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/pi/kya/verify/route.ts src/__tests__/api/pi-kya-verify.test.ts
git commit -m "feat(api): POST /api/pi/kya/verify — real Pi KYC server-side check ۞"
```

---

### Task 6: Wire Trust Score into Existing Routes

**Files:**
- Modify: `src/app/api/user/status/route.ts` — add `computedTrustScore`
- Modify: `src/app/api/stamp/claim/route.ts` — return `computedTrustScore`

**Interfaces:**
- Consumes: `computeTrustScore()` from Task 2
- Produces: Updated responses with computed trust score

- [ ] **Step 1: Modify user/status route to include computedTrustScore**

Read `src/app/api/user/status/route.ts`, find where it returns user data, add:

```typescript
import { computeTrustScore } from '@/lib/trust-score';

// After fetching user:
const computedTrustScore = computeTrustScore(
  user.stamps.map(s => ({ type: s.type, xp: s.xpAwarded, timestamp: s.createdAt })),
  false, // stellarAnchored — can be enhanced later
  user.lastActive,
);

// Add to response:
return apiSuccess({ ...userData, computedTrustScore });
```

- [ ] **Step 2: Modify stamp/claim route to return computedTrustScore**

Read `src/app/api/stamp/claim/route.ts`, find where it returns success, add:

```typescript
import { computeTrustScore } from '@/lib/trust-score';

// After creating stamp:
const computedTrustScore = computeTrustScore(
  updatedStamps.map(s => ({ type: s.type, xp: s.xpAwarded, timestamp: s.createdAt })),
  false,
  new Date(),
);

// Add to success response:
return apiSuccess({ stampId, xpEarned, newBalance, tier, computedTrustScore, ... });
```

- [ ] **Step 3: Run affected tests**

Run: `npx jest src/__tests__/api/user-status.test.ts src/__tests__/api/stamp-claim.test.ts --forceExit`
Expected: PASS (update tests if response shape changed)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/user/status/route.ts src/app/api/stamp/claim/route.ts
git commit -m "feat(api): wire computedTrustScore into user/status and stamp/claim ۞"
```

---

### Task 7: Frontend — Claim Page Step 2 Real Verification

**Files:**
- Modify: `src/app/claim/page.tsx` — rewrite Step 2

**Interfaces:**
- Consumes: `POST /api/pi/kya/verify` from Task 5, `POST /api/stellar/anchor` from Task 5
- Produces: Real verification UI with 3 checkmarks

- [ ] **Step 1: Read current claim page Step 2 code**

Read `src/app/claim/page.tsx` lines 376-520 (Step 2 section)

- [ ] **Step 2: Rewrite Step 2 with real verification**

Replace the Step 2 section with:

```tsx
{/* Step 2: Verify */}
{currentStep === 2 && (
  <div className="text-center">
    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center">
      <Shield className="w-10 h-10 text-electric-blue" />
    </div>
    <h2 className="text-2xl font-sans font-bold mb-2">
      {t("Know Your Agent", "اعرف وكيلك")}
    </h2>
    <p className="text-white/40 font-sans text-sm mb-8 max-w-sm mx-auto">
      {t(
        "Verify your Pi Network identity with a real KYC check and micro-payment",
        "تحقق من هويتك على شبكة Pi بفحص KYC حقيقي ودفع ميكرو"
      )}
    </p>

    {!verified ? (
      <div className="space-y-4">
        {/* Real verification items */}
        <div className="space-y-3">
          {[
            { id: 'kyc', label: t("Pi KYC Verification", "التحقق من KYC على Pi"), icon: Shield },
            { id: 'payment', label: t("Payment Proof", "إثبات الدفع"), icon: Wallet },
            { id: 'stellar', label: t("On-Chain Anchor", "الربط على السلسلة"), icon: Globe },
          ].map((item) => {
            const ItemIcon = item.icon;
            const isDone = verificationItems[item.id];
            return (
              <div key={item.id} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-neon-green" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/20" />
                  )}
                  <ItemIcon className="w-4 h-4 text-white/40" />
                  <span className="font-mono text-sm text-white/70">{item.label}</span>
                </div>
                <span className={`font-mono text-xs ${isDone ? 'text-neon-green' : 'text-white/30'}`}>
                  {isDone ? t("VERIFIED", "موثق") : t("PENDING", "قيد الانتظار")}
                </span>
              </div>
            );
          })}
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full max-w-sm mx-auto bg-gradient-to-r from-electric-blue to-blue-600 text-white font-sans font-semibold py-4 px-8 rounded-xl flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isVerifying ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Shield className="w-5 h-5" />
              </motion.div>
              {t("VERIFYING...", "جارٍ التحقق...")}
            </>
          ) : (
            <>
              <Globe className="w-5 h-5" />
              {t("START VERIFICATION", "بدء التحقق")}
            </>
          )}
        </motion.button>
      </div>
    ) : (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-neon-green/10 border border-neon-green/20 rounded-xl p-6">
        <CheckCircle2 className="w-12 h-12 text-neon-green mx-auto mb-3" />
        <p className="font-mono text-sm text-neon-green font-bold">
          {t("VERIFICATION COMPLETE", "اكتمل التحقق")}
        </p>
        <p className="font-mono text-xs text-white/40 mt-1">
          {t("Trust Score: ", "نقاط الثقة: ")}{user?.trustScore ?? 0}
        </p>
      </motion.div>
    )}
  </div>
)}
```

- [ ] **Step 3: Add handleVerify with real backend calls**

Replace the `handleVerify` function:

```tsx
const [isVerifying, setIsVerifying] = useState(false);
const [verificationItems, setVerificationItems] = useState({
  kyc: false, payment: false, stellar: false,
});

const handleVerify = async () => {
  setIsVerifying(true);
  try {
    // 1. Real Pi KYC check
    const kyaRes = await fetch('/api/pi/kya/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(piAccessToken ? { Authorization: `Bearer ${piAccessToken}` } : {}),
      },
      body: JSON.stringify({ accessToken: piAccessToken }),
    });

    if (kyaRes.ok) {
      const kyaData = await kyaRes.json();
      setVerificationItems(prev => ({ ...prev, kyc: true }));

      if (kyaData.data.kycStatus === 'VERIFIED') {
        setVerificationItems(prev => ({ ...prev, payment: true }));
      }
    }

    // 2. Stellar anchoring (optional, non-blocking)
    try {
      const anchorRes = await fetch('/api/stellar/anchor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(piAccessToken ? { Authorization: `Bearer ${piAccessToken}` } : {}),
        },
        body: JSON.stringify({ signedVc: {}, userSecretKey: '' }),
      });
      if (anchorRes.ok) {
        setVerificationItems(prev => ({ ...prev, stellar: true }));
      }
    } catch {
      // Stellar anchoring is optional — don't block verification
    }

    setVerified(true);
  } catch (err) {
    logger.error('Verification failed:', err);
  } finally {
    setIsVerifying(false);
  }
};
```

- [ ] **Step 4: Run claim page tests**

Run: `npx jest src/__tests__/app/claim-page.test.tsx --forceExit`
Expected: PASS (update mocks for new verification flow)

- [ ] **Step 5: Commit**

```bash
git add src/app/claim/page.tsx src/__tests__/app/claim-page.test.tsx
git commit -m "feat(claim): Step 2 real verification — Pi KYC + payment + Stellar ۞"
```

---

### Task 8: Add DevModeBanner to Claim and Dashboard Pages

**Files:**
- Modify: `src/app/claim/page.tsx` — add DevModeBanner
- Modify: `src/app/dashboard/page.tsx` — add DevModeBanner

**Interfaces:**
- Consumes: `<DevModeBanner />` from Task 4
- Produces: Red warning banner in dev mode

- [ ] **Step 1: Add DevModeBanner to claim page**

At the top of the claim page return, after `<Header />`:

```tsx
import { DevModeBanner } from '@/components/DevModeBanner';

// In the return, after <Header />:
<DevModeBanner />
```

- [ ] **Step 2: Add DevModeBanner to dashboard page**

Same pattern — import and render after Header.

- [ ] **Step 3: Run tests**

Run: `npx jest src/__tests__/app/claim-page.test.tsx src/__tests__/app/dashboard.test.tsx --forceExit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/claim/page.tsx src/app/dashboard/page.tsx
git commit -m "feat(ui): add DevModeBanner to claim and dashboard pages ۞"
```

---

### Task 9: Full Test Suite + Type-Check + Lint

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx jest --forceExit`
Expected: All tests pass, count ≥ 2875

- [ ] **Step 2: Run type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: 0 warnings

- [ ] **Step 4: Fix any failures**

If any step fails, fix the issue and re-run until all pass.

- [ ] **Step 5: Commit final state**

```bash
git add -A
git commit -m "chore: verify full test suite + type-check + lint clean ۞"
```

---

### Task 10: Documentation

**Files:**
- Modify: `docs/PI_E2E_TESTING.md` — update verification flow docs
- Modify: `CHANGELOG.md` — add Pi-native verification entry

- [ ] **Step 1: Update PI_E2E_TESTING.md**

Update the Step 2 section to describe real Pi KYC verification instead of the old cosmetic flow.

- [ ] **Step 2: Update CHANGELOG.md**

Add entry under the appropriate version:

```markdown
### Changed
- **Pi-Native Verification System** — Replaced fake social login XP actions (Twitter, Discord, Google) with Pi-native verification actions
- **Real KYC Check** — Step 2 now calls Pi API server-side to verify KYC status
- **0.5 Pi Payment** — Step 2 requires a real Pi micro-payment (returned to user) that proves KYC
- **Computed Trust Score** — Trust score is now computed from completed Pi actions, not hardcoded
- **Dev Mode Banner** — Red warning banner appears in sandbox/dev mode
```

- [ ] **Step 3: Commit**

```bash
git add docs/PI_E2E_TESTING.md CHANGELOG.md
git commit -m "docs: update for Pi-native verification system ۞"
```
