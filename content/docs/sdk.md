---
title: SDK & Integration
order: 6
section: integration
---

# SDK & Integration

AxiomID provides two packages: `@axiomid/sdk` for querying trust/passport data, and `@axiomid/crypto` for Ed25519 key derivation and signing. Both are MIT licensed.

## Packages

### @axiomid/sdk

Query passports, trust scores, stamps, and DID documents.

```bash
npm install @axiomid/sdk
```

```typescript
import { AxiomSDK } from "@axiomid/sdk";

const axiom = new AxiomSDK({
  network: "mainnet",
  apiKey: process.env.AXIOM_API_KEY,
});

// Verify a user's passport
const passport = await axiom.verifyPassport("pioneer.username");

// Check specific stamps
const stamps = await axiom.getStamps("pioneer.username");
console.log("KYC Verified:", stamps.kycBound.verified);

// Resolve DID document
const did = await axiom.resolveDID("did:axiom:pioneer.username");
```

### @axiomid/crypto

Ed25519 key derivation, signing, and verification.

```bash
npm install @axiomid/crypto
```

```typescript
import { deriveKeypair, signPayload, verifySignature } from "@axiomid/crypto";

// Derive a sovereign agent keypair
const keypair = deriveKeypair(stellarAddress, agentId, process.env.SOVEREIGN_KEY_SALT);

// Sign a payload
const signature = signPayload(JSON.stringify(payload), keypair.privateKey);

// Verify a signature
const valid = verifySignature(payload, signature, keypair.publicKey);
```

> **Security Note:** `deriveKeypair` MUST use `SOVEREIGN_KEY_SALT` from env. Never use public inputs alone as key material. Private keys never leave the server.

## SDK API Reference

| Method | Returns | Description |
|--------|---------|-------------|
| `verifyPassport(slug)` | `Promise<Passport>` | Fetch public passport with trust score, tier, stamps, and agent status |
| `getStamps(slug)` | `Promise<Stamps>` | Get all verified stamps for a user |
| `resolveDID(did)` | `Promise<DIDDocument>` | Resolve a did:axiom identifier to its W3C DID document |
| `getTrustScore(did)` | `Promise<TrustScore>` | Get trust score breakdown |
| `searchSkills(query)` | `Promise<Skill[]>` | Search skills by name, description, or capabilities |
