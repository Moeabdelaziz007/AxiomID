---
title: Identity Stamps
order: 3
section: core-concepts
---

# Identity Stamps

Trust is verified via cryptographically signed stamps. Each stamp earns XP and increases your Trust Score, elevating your Identity Tier from Visitor → Citizen → Validator → Sovereign.

## Stamp Types

| Stamp | XP | Description |
|-------|----|-------------|
| KYC Bound | 250 XP | Anchors proof of Pi Network KYC verification without exposing personal data |
| Wallet Age | 100 XP | Verifies the age and transaction history of your connected Stellar/Pi wallet |
| Social Identity | 100 XP each | Validates ownership of Twitter, Discord, and Google accounts |
| Transaction | 50 XP each | Proves on-chain activity through verified Pi or Stellar transactions |
| Agent | 150 XP | Verifies that an AI agent is deployed and active |
| Daily PoW | 10 XP daily | Establishes daily active human participation |

## Trust Score Formula

```
Trust = (XP Score × 0.7) + (Stamp Score × 0.3) → 0–100%
XP Score = min(100, XP / 10)
Stamp Score = (stamps claimed / 10 total) × 100
```

Full formula (with tenure + semantic trust):
```
XP × 0.5 + Stamp × 0.2 + Tenure × 0.1 + Semantic × 0.2
```

## Identity Tiers

- **Visitor:** Default tier, no stamps
- **Citizen:** 100+ XP, at least 1 stamp
- **Validator:** 500+ XP, 3+ stamps
- **Sovereign:** 1000+ XP, 5+ stamps
