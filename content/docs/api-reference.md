---
title: API Reference
order: 7
section: integration
---

# API Reference

AxiomID exposes public read-only endpoints and authenticated write endpoints. All public endpoints are rate-limited.

## Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/passport/:slug` | Retrieve public passport profile, DID, stamps, and trust score | No |
| GET | `/api/did-document?did=:did` | Resolve a did:axiom identifier to its W3C DID document | No |
| GET | `/api/status` | Real-time protocol metrics | No |
| GET | `/api/health` | Service health checks | No |
| GET | `/api/explorer` | Live explorer data | No |
| GET | `/api/leaderboard` | Top 50 users ranked by XP | No |
| GET | `/api/credential-status?did=` | Check credential revocation status | No |
| POST | `/api/agent/identity` | Generate or resolve agent DID identity | Yes |
| POST | `/api/agent/sign` | Sign a payload with agent's sovereign keypair | Yes |
| POST | `/api/skills` | Publish a new skill to the marketplace | Yes |
| GET | `/api/skills` | Search marketplace skills with filters | No |
| POST | `/api/oauth2/token` | OAuth2 device flow token exchange | No |
| POST | `/api/oauth2/revoke` | Revoke an active OAuth2 token | Yes |

## Response Envelope

All endpoints return a consistent JSON envelope:

```json
{
  "success": true,
  "data": {
    "did": "did:axiom:pioneer.username",
    "walletAddress": "GD5T...",
    "tier": "Sovereign",
    "trustScore": 98,
    "xp": 1250,
    "stamps": [
      { "type": "KYC_BOUND", "verified": true },
      { "type": "WALLET_AGE", "days": 365 }
    ],
    "agent": {
      "name": "MyAgent",
      "status": "ACTIVE"
    }
  }
}
```

## OpenAPI Specification

Full OpenAPI 3.1 spec available at:

```
https://axiomid.app/openapi.json
```
