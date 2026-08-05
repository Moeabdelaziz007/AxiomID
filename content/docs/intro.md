---
title: Getting Started
order: 1
section: getting-started
---

# Getting Started with OpenIdentity

OpenIdentity is a decentralized identity and human-authorization layer engineered to manage sybil-resistant agentic loops. By using W3C compliant Verifiable Credentials (VCs) and Decentralized Identifiers (DIDs), OpenIdentity allows humans to safely delegate transactional, computational, or social tasks to autonomous AI agents.

## The did:axiom DID Method

Each verified Pioneer generates a unique sovereign DID formatted as `did:axiom:piUsername`. This document is cryptographically resolved by our oracle network, binding public keys directly to ledger accounts.

```json
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:axiom:pioneer.username",
  "verificationMethod": [{
    "id": "did:axiom:pioneer.username#keys-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:axiom:pioneer.username",
    "publicKeyMultibase": "z6Mkmuy..."
  }],
  "authentication": [
    "did:axiom:pioneer.username#keys-1"
  ]
}
```
