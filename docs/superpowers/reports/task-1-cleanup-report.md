# Task 1 Cleanup Report — Stale Action IDs

**Status:** DONE

## Summary

Replaced all stale Twitter/Discord/Google action ID references with Pi-native action types across components, constants, and test files. Updated TOTAL_STAMPS from 6 to 10 and adjusted all downstream trust score calculations.

## Files Modified

### Components
| File | Change |
|------|--------|
| `src/components/StampBoard.tsx` | Replaced lucide imports (AtSign, MessageCircle, Key → Wallet, Shield, CircleDollarSign, Lock, Server, Globe, Clock, CheckCircle). Replaced STAMP_DEFS array: 6 old entries → 10 Pi-native entries. |
| `src/components/passport/constants.tsx` | Replaced MODULE_SLOTS: 6 entries (pi_net, twitter, discord, google, wallet, mining) → 9 Pi-native entries (wallet, kyc, payment, security, lockup, node, mainnet, mining, validator). |
| `src/components/StampCard.tsx` | Removed dead `connect_google` ternary on line 128. Prefixed unused `type` prop with `_type` for lint compliance. |

### Lib
| File | Change |
|------|--------|
| `src/lib/trust.ts` | `TOTAL_STAMPS = 6` → `TOTAL_STAMPS = 10` |

### Test Files
| File | Change |
|------|--------|
| `src/__tests__/components/stamp-card.test.tsx` | `connect_twitter` → `connect_wallet` |
| `src/__tests__/components/agent-passport.test.tsx` | `verify_identity` → `complete_kyc`, `connect_twitter` → `connect_wallet`, `ACTIVE: 1/6` → `ACTIVE: 1/9`, module slot labels updated (PI NET→WALLET, TWITTER→KYC, DISCORD→PI PAY, GOOGLE→SECURITY) |
| `src/__tests__/components/stamp-board.test.tsx` | All `connect_twitter` → `connect_wallet`, VC payloads updated (twitter→wallet), stamp count 6→10, button label updated ("twitter stamp"→"wallet connection") |
| `src/__tests__/app/settings-page.test.tsx` | Already using Pi-native types — no changes needed |
| `src/__tests__/lib/trust.test.ts` | Updated "weights XP at 70%" test: 50→44 (stampScore changed 50→30 with TOTAL_STAMPS=10). Updated modern formula test: 56→52. |
| `src/__tests__/api/stamp-system.test.ts` | Updated trust score expectations: 5→3 (0XP,1stamp), 16→14 (150XP,1stamp) |
| `src/__tests__/api/og-passport.test.ts` | Updated trust score expectations: stamps=6→10 for 100 score, stamps=10→15 for clamping test, stamps=4 trust 90→82 |

## Test Results

```
Test Suites: 125 passed, 125 total
Tests:       2878 passed, 2878 total
```

## Verification

- **Lint:** 0 warnings (`npm run lint`)
- **Type-check:** 0 errors (`npx tsc --noEmit`)
- **Tests:** 2878 passed, 0 failed (`npx jest --forceExit`)

## Concerns

None. All changes are mechanical replacements — no behavioral changes to production code beyond the action type renames.
