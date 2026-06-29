# Task 1: Pi-Native Action Definitions — Report

## Status: DONE

## Files Modified

1. **`src/lib/actions.ts`** — Replaced fake social login actions (Twitter, Discord, Google) with 10 Pi-native verification actions (CONNECT_WALLET, COMPLETE_KYC, PI_PAYMENT, SECURITY_CIRCLE, LOCKUP_COMMITMENT, NODE_OPERATION, MAINNET_MIGRATION, WALLET_AGE, MINING_STREAK, VALIDATOR_SERVICE). Added `ActionTier` type, `ActionDefinition` interface, and `MAX_TRUST_SCORE` export.

2. **`src/__tests__/lib/actions.test.ts`** — Replaced old action tests with 6 new tests validating Pi-native ACTIONS: count (10), shape (id/xp/weight/tier), specific values for CONNECT_WALLET, COMPLETE_KYC weight, PI_PAYMENT xp=0, MINING_STREAK xp.

3. **`src/app/api/passport/[slug]/_utils.ts`** — Updated `getKyaStatus` to check `s.type === "complete_kyc"` instead of `s.type === "verify_identity"`.

4. **`src/app/context/language-context.tsx`** — Updated translation strings: `kya_verify_identity` from "VERIFY IDENTITY" to "VERIFY KYC" (English) and "توثيق الهوية" to "توثيق KYC" (Arabic).

5. **`src/__tests__/api/passport-publish.test.ts`** — Changed `type: 'verify_identity'` to `type: 'complete_kyc'` in mock stamp data.

6. **`src/__tests__/api/stamp-system.test.ts`** — Changed `type: "connect_twitter"` to `type: "connect_wallet"` and `actionType: "connect_twitter"` to `actionType: "connect_wallet"`. Updated XP expectation from 50 to 100 (matching new ACTIONS.CONNECT_WALLET.xp).

7. **`src/__tests__/api/social-claims.test.ts`** — Changed `connect_twitter` to `connect_wallet` and `connect_discord` to `security_circle`. Updated XP expectations. Updated VC metadata assertions (security_circle doesn't generate social VCs).

8. **`src/__tests__/context/use-wallet-actions.test.tsx`** — Changed `connect_twitter` to `connect_wallet` in claimAction calls and provider expectations.

9. **`src/__tests__/components/agent-passport.test.tsx`** — Changed `verify_identity` to `complete_kyc` and `connect_twitter` to `connect_wallet` in stamp fixtures.

10. **`src/__tests__/components/stamp-card.test.tsx`** — Changed `type: "connect_twitter"` to `type: "connect_wallet"`.

11. **`src/__tests__/components/stamp-board.test.tsx`** — Changed stamp type from `connect_twitter` to `connect_wallet` in fixtures.

12. **`src/__tests__/app/settings-page.test.tsx`** — Changed all stamp types from `connect_twitter`/`connect_discord`/`connect_google` to `connect_wallet`/`security_circle`/`complete_kyc`. Updated platform labels, disconnect API expectations, and it.each test.

13. **`src/__tests__/lib/trust-chain.test.ts`** — Changed `type: 'daily_pow'` to `type: 'mining_streak'` in hash test fixtures.

14. **`src/app/dashboard/settings/page.tsx`** — Updated PLATFORMS array, `isPlatformConnected`, `openConnectModal`, `openDisconnectModal`, `openVcModal`, and state types to use new action IDs (`connect_wallet`, `security_circle`, `complete_kyc`).

## Test Results

### Actions Test (`npx jest src/__tests__/lib/actions.test.ts --forceExit`)
```
Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

### Full Test Suite (`npx jest --forceExit`)
```
Test Suites: 125 passed, 125 total
Tests:       2878 passed, 2878 total
```

### Type Check (`npx tsc --noEmit`)
```
0 errors
```

### Lint (`npm run lint`)
```
0 warnings
```

## Concerns

1. **UI stamp definitions unchanged**: `StampBoard.tsx` STAMP_DEFS, `passport/constants.tsx` MODULE_SLOTS, and `StampCard.tsx` still reference old action types (`connect_twitter`, `connect_discord`, `connect_google`, `daily_pow`, `verify_identity`). These are UI-layer definitions separate from ACTIONS, but may need a follow-up task to align them with the Pi-native action system.

2. **Social claim VC generation**: The claim route's `signSocialCredential` only generates VCs for actions with `connect_` prefix. Actions like `security_circle`, `complete_kyc`, `validator_service` don't get VCs. This is correct behavior but should be documented.

3. **Settings page disconnect API**: The disconnect API receives the raw stamp type as the `platform` parameter (e.g., `security_circle` instead of `discord`). The backend `/api/social/disconnect` endpoint may need updating to handle the new platform identifiers.
