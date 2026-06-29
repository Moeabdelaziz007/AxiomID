# Pi-Native Trust Score & Verification System

## Overview

Replace the current fake XP actions (Twitter, Discord, Google connections) with **Pi-native verification actions** that align with Pi Network's 2026 roadmap and partnership goals. Make the claim page verification flow real — no more cosmetic animations.

**Decision:** Approach B — Full Pi-Native (3-4 days)

## Guiding Principle

Every verification action must use the **Pi Network ecosystem**. No external social logins. Pi SDK → Pi KYC API → Pi Payment → Stellar anchoring (same tech stack as Pi itself).

---

## 1. Pi-Native XP Actions

### 1.1 New Action Definitions (`src/lib/actions.ts`)

```ts
export const ACTIONS = {
  CONNECT_WALLET:    { id: 'connect_wallet',     xp: 100, weight: 15, tier: 'medium' },
  COMPLETE_KYC:      { id: 'complete_kyc',       xp: 200, weight: 30, tier: 'critical' },
  PI_PAYMENT:        { id: 'pi_payment',         xp: 0,   weight: 20, tier: 'high' },   // dynamic XP: amount × 10
  SECURITY_CIRCLE:   { id: 'security_circle',    xp: 150, weight: 10, tier: 'medium' },
  LOCKUP_COMMITMENT: { id: 'lockup_commitment',  xp: 250, weight: 20, tier: 'high' },
  NODE_OPERATION:    { id: 'node_operation',     xp: 300, weight: 15, tier: 'high' },
  MAINNET_MIGRATION: { id: 'mainnet_migration',  xp: 150, weight: 15, tier: 'medium' },
  WALLET_AGE:        { id: 'wallet_age',         xp: 300, weight: 10, tier: 'medium' },
  MINING_STREAK:     { id: 'mining_streak',      xp: 50,  weight: 5,  tier: 'low' },     // 50 XP per month, caps at 250
  VALIDATOR_SERVICE: { id: 'validator_service',  xp: 200, weight: 25, tier: 'critical' },
};
```

### 1.2 What Each Action Verifies

| Action | How It's Verified | Pi API Used |
|--------|------------------|-------------|
| `connect_wallet` | Pi SDK `authenticate()` returns valid user | `Pi.authenticate()` |
| `complete_kyc` | Pi API `/v2/me` → `kyc_verified === true` | `GET api.minepi.com/v2/me` |
| `pi_payment` | Pi SDK `createPayment()` → approve → complete cycle | `Pi.createPayment()` |
| `security_circle` | Pi API `/v2/me` → `security_circle.size` | `GET api.minepi.com/v2/me` |
| `lockup_commitment` | Pi API lockup status | `GET api.minepi.com/v2/me` |
| `node_operation` | Pi Node app running >7 consecutive days | Pi Node API |
| `mainnet_migration` | Pi API migration status | `GET api.minepi.com/v2/me` |
| `wallet_age` | Pi wallet creation timestamp | Pi API / on-chain |
| `mining_streak` | Consecutive mining sessions in Pi app | Pi API mining history |
| `validator_service` | Pi KYC validator role status | Pi KYC validator API |

### 1.3 Dynamic XP for `pi_payment`

XP = `Math.floor(payment.amount * 10)`. Example: 0.5 Pi → 5 XP. This incentivizes higher-value legitimate payments.

### 1.4 XP Award Flow

1. Frontend calls `POST /api/stamp/claim` with `actionType` (existing)
2. Backend looks up action in `ACTIONS` map
3. Calls Pi API to verify the action is real (not just trust the client)
4. Creates stamp + action + ledger entry in a transaction
5. Updates user's `xp` and `tier`
6. Returns `{ stampId, xpEarned, newBalance, tier }`

### 1.5 Duplicate Prevention

Existing logic already prevents duplicate stamps (`user_stamp_unique` constraint). Each action can only be claimed once.

---

## 2. Real Trust Score

### 2.1 Calculation Function (`src/lib/trust-score.ts`)

```ts
export function computeTrustScore(
  completedActions: Array<{ type: string; xp: number; timestamp: Date }>,
  stellarAnchored: boolean = false,
  lastActiveAt: Date | null = null,
): number {
  const maxScore = 185;
  let rawScore = 0;

  for (const action of completedActions) {
    const actionDef = Object.values(ACTIONS).find(a => a.id === action.type);
    if (actionDef) rawScore += actionDef.weight;
  }

  // Cap mining_streak contribution at 25 (50 XP = 5 weight × 5 months max)
  const miningStreaks = completedActions.filter(a => a.type === 'mining_streak');
  if (miningStreaks.length > 5) {
    rawScore -= (miningStreaks.length - 5) * 5; // cap at 5 months
  }

  // Inactivity decay: -10% per 90 days of inactivity
  const decay = computeDecay(lastActiveAt);

  // Stellar anchor bonus: +15% if anchored
  const anchorMultiplier = stellarAnchored ? 1.15 : 1.0;

  const score = Math.min(100, Math.max(0, Math.round(
    (rawScore / maxScore) * 100 * decay * anchorMultiplier
  )));

  return score;
}

function computeDecay(lastActiveAt: Date | null): number {
  if (!lastActiveAt) return 0.8;
  const daysSinceActive = Math.floor(
    (Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const decaySteps = Math.floor(daysSinceActive / 90);
  return Math.max(0.8, 1.0 - (decaySteps * 0.1));
}
```

### 2.2 Trust Score Tier Labels

| Score | Label | Color |
|-------|-------|-------|
| 0–20 | Emerging | `#64748b` (gray) |
| 21–40 | Active | `#f59e0b` (amber) |
| 41–60 | Trusted | `#00d4ff` (blue) |
| 61–80 | Verified | `#00ff41` (green) |
| 81–100 | Sovereign | `#a855f7` (purple) |

### 2.3 Where Score Is Returned

- `GET /api/user/status` → add `computedTrustScore` field (computed, not stored)
- `POST /api/pi/kya/verify` → returns updated score after verification
- `POST /api/stamp/claim` → returns updated score after claim
- Dashboard display reads computed score

### 2.4 What Changes in DB

- **Keep** `xp` and `tier` columns (denormalized for fast reads)
- **Keep** `stamps` table (source of truth for completed actions)
- **Compute** trust score on-the-fly from stamps — never stored

---

## 3. Verification Flow (Claim Page Step 2)

### 3.1 Flow Architecture

```
User clicks "START VERIFICATION"
        │
        ├─→ Native Pi KYC Consent Dialog
        │       ↓
        ├─→ Backend: POST /api/pi/kya/verify
        │       ├─ 1. Pi API: GET /v2/me → check kyc_verified
        │       ├─ 2. Pi SDK: createPayment(0.5 Pi, memo="AxiomID KYC")
        │       ├─ 3. Pi API: approve payment
        │       ├─ 4. Pi API: complete payment (releases funds back)
        │       └─ 5. Return { kycStatus, paymentCompleted }
        │
        └─→ Stellar anchoring (optional, after KYC verified)
                ├─ Compute VC hash
                ├─ Submit to Stellar testnet
                └─ Return { txHash, stellarTxId }
```

### 3.2 What the User Sees

Three checkmarks that fill in real-time as backend confirms each step:

| Checkmark | What It Means |
|-----------|--------------|
| ✅ KYC Verified | Pi API confirmed `kyc_verified === true` |
| ✅ Payment Proven | 0.5 Pi payment completed (proves Pi KYC) |
| ✅ On-Chain Proof | Stellar transaction confirmed with VC hash memo |

Progress bar is tied to actual backend responses — not fake animation.

### 3.3 Pi Payment Details

- Amount: **0.5 Pi** (user-facing amount)
- Memo: `"AxiomID KYC Verification"`
- Flow: `Pi.createPayment()` → `onReadyForServerApproval` → approve via API → `onReadyForServerCompletion` → complete via API → Pi funds returned to user
- The payment **proves KYC** because Pi only allows KYC-verified users to make payments

### 3.4 Stellar Anchoring Integration

After KYC verification completes:
1. Call `POST /api/stellar/anchor` with signed VC
2. Server computes VC hash, builds Stellar tx, submits to testnet
3. Returns `txHash` — user sees "On-Chain Proof" checkmark

---

## 4. Sandbox Dev Mode

### 4.1 Behavior

- Sandbox dev token still works in dev/test (needed for CI)
- **Add red banner** on claim page and dashboard when `determineSandboxMode() === true`
- Banner text: `⚠️ DEV MODE — Not connected to Pi Network. Real KYC and payments disabled.`
- No changes to sandbox token logic

### 4.2 Files

- `src/components/DevModeBanner.tsx` — new component, conditionally rendered
- `src/app/claim/page.tsx` — render banner when `determineSandboxMode()`
- `src/app/dashboard/page.tsx` — render banner

---

## 5. Backend API Routes

### 5.1 New Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/pi/kya/verify` | POST | Pi KYC server-side check + 0.5 Pi payment flow |
| `/api/user/trust-score` | GET | Return computed trust score from stamps |

### 5.2 Modified Routes

| Route | Change |
|-------|--------|
| `/api/user/status` | Add `computedTrustScore` field |
| `/api/stamp/claim` | Return `computedTrustScore` in response |
| `/api/pi/kya/claim` | Rename to `/api/pi/kya/verify`, rewrite body |

### 5.3 New Library Files

| File | Purpose |
|------|---------|
| `src/lib/trust-score.ts` | `computeTrustScore()`, `computeDecay()` |
| `src/lib/pi-kyc.ts` | `verifyKycServerSide()` — Pi API KYC check |

### 5.4 Deleted Files

| File | Reason |
|------|--------|
| `src/lib/actions.ts` | Replaced entirely with Pi-native actions |

---

## 6. Migration Plan

### Phase 1: Backend (Day 1)
1. Replace `src/lib/actions.ts` with Pi-native definitions
2. Create `src/lib/trust-score.ts`
3. Create `src/lib/pi-kyc.ts`
4. Create `POST /api/pi/kya/verify` route
5. Modify `GET /api/user/status` to include computed score
6. Modify `POST /api/stamp/claim` to return computed score

### Phase 2: Frontend (Day 2)
1. Create `DevModeBanner.tsx`
2. Rewrite `claim/page.tsx` Step 2 with real verification
3. Wire Stellar anchoring into claim flow
4. Update dashboard to show computed trust score

### Phase 3: Testing (Day 3)
1. Unit tests for `computeTrustScore()`
2. Unit tests for `verifyKycServerSide()`
3. Integration tests for `/api/pi/kya/verify`
4. Full test suite pass
5. Type-check + lint clean

### Phase 4: Polish (Day 4)
1. UI polish on verification progress
2. Error handling for Pi API failures
3. Dev mode banner testing
4. Final review + PR

---

## 7. Success Criteria

- [ ] All XP actions are Pi-native (zero external social logins)
- [ ] Step 2 verification calls real Pi API (not animation)
- [ ] 0.5 Pi payment is real and returned to user
- [ ] Trust score is computed from stamps (not hardcoded)
- [ ] Stellar anchoring works in claim flow
- [ ] Dev mode has red warning banner
- [ ] All 2875+ tests pass
- [ ] Type-check clean
- [ ] Lint clean (0 warnings)
