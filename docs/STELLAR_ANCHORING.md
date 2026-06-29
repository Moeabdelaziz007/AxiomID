# Stellar VC Anchoring

Anchor Verifiable Credentials on the Stellar blockchain for tamper-proof, publicly verifiable identity proofs.

## Overview

Stellar anchoring writes a SHA-256 hash of a signed VC into a Stellar transaction memo. This creates an immutable, timestamped on-chain record that anyone can verify against the presented credential — without revealing the VC itself.

## How It Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  computeVcHash │ ──▶ │ buildAnchorTx │ ──▶ │  Sign + Submit │ ──▶ │  verifyVcOnChain │
│  (SHA-256)    │     │  (self-pay)   │     │  (Horizon)    │     │  (memo match) │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

1. **Hash** — The signed VC is canonicalized (sorted keys) and hashed with SHA-256.
2. **Build** — A minimal self-payment transaction is created with the hash truncated to 28 bytes as a text memo (Stellar memo limit).
3. **Sign & Submit** — The user signs with their Stellar secret key and submits to Horizon.
4. **Verify** — Fetch the transaction from Horizon, extract the memo, and compare against a freshly computed hash of the presented VC.

## API Reference

### POST `/api/stellar/anchor`

Anchors a signed VC on the Stellar blockchain.

**Auth:** Required (Bearer token)

**Request:**
```json
{
  "signedVc": { /* signed Verifiable Credential object */ },
  "userSecretKey": "S..."  // Stellar secret key (56 chars)
}
```

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "txHash": "a1b2c3d4...",
    "stellarTxId": "e5f6g7h8...",
    "memo": "a1b2c3d4e5f6g7h8i9j0k1l2m3n",
    "timestamp": "2026-06-28T12:00:00.000Z"
  }
}
```

**Errors:**
- `400` — Validation error (missing fields, invalid key format)
- `401` — Not authenticated
- `403` — VC subject does not match authenticated user
- `429` — Rate limited
- `500` — Stellar network or signing failure

**Rate limit:** Authenticated tier (IP-based).

**Side effects:** Creates or updates a `vc_anchored` stamp in the database (50 XP awarded).

### Library: `verifyVcOnChain(signedVc, stellarTxId)`

Server-side function to verify a VC's on-chain anchor. No dedicated API endpoint exists — use this in server components or API routes.

```typescript
import { verifyVcOnChain } from "@/lib/stellar-anchoring";

const result = await verifyVcOnChain(signedVc, "stellar_tx_hash_here");
// result.anchored — was the transaction found on-chain?
// result.memoMatches — does the on-chain hash match the presented VC?
// result.onChainHash — the hash stored on-chain (28-byte truncation)
// result.stellarTxId — the transaction ID
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STELLAR_SECRET_KEY` | Yes | — | Server Stellar secret key (for internal operations) |
| `STELLAR_NETWORK` | No | `testnet` | `testnet` or `mainnet` |

## Testnet vs Mainnet

The system auto-selects the Horizon server and network passphrase based on `STELLAR_NETWORK`:

| Network | Horizon URL | Passphrase |
|---------|-------------|------------|
| `testnet` | `https://horizon-testnet.stellar.org` | `Stellar Testnet ; ...` |
| `mainnet` | `https://horizon.stellar.org` | `Stellar Public Network ; ...` |

**Default is testnet.** Set `STELLAR_NETWORK=mainnet` only after thorough testing.

## Technical Notes

- **Memo truncation:** Stellar text memos are limited to 28 bytes. The full SHA-256 hash (64 hex chars) is truncated to 28 chars. Verification compares the truncated memo against the first 28 chars of the freshly computed hash.
- **Self-payment:** The anchor transaction is a self-payment of 0.00001 XLM. The purpose is solely to embed the hash in the ledger.
- **Transaction timeout:** Anchor transactions expire after 180 seconds if not submitted.
- **No VC disclosure:** Only the hash is stored on-chain. The VC content is never exposed.
