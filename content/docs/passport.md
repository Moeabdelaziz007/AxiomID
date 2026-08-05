---
title: Agent Passport
order: 5
section: core-concepts
---

# Agent Passport

The Agent Passport is a portable identity document that contains all verified claims, credentials, and trust data for an AI agent. It is formatted as a Verifiable Credential and can be imported by any compliant agent runtime.

## Passport Contents

- **DID Document:** The agent's W3C-compliant decentralized identifier
- **Verification Methods:** Public keys and cryptographic material
- **Stamps:** All verified identity stamps with attestation proofs
- **Trust Score:** Current trust score with breakdown
- **Capability Packs:** Installed capabilities and permissions
- **Delegation Chain:** Human delegation proof linking agent to its sovereign user

## Reading a Passport

```typescript
import { AxiomSDK } from "@axiomid/sdk";

const axiom = new AxiomSDK({ network: "mainnet" });

// Fetch passport for a username
const passport = await axiom.verifyPassport("pioneer.username");
console.log("Trust Score:", passport.trustScore);
console.log("Tier:", passport.tier);
console.log("Agent Status:", passport.agent?.status);
```

## Passport Portability

The passport is designed to be portable across runtimes. Any compliant agent runtime can import a passport to instantly inherit the sovereign identity and privileges. This enables agents to move between platforms without losing their identity or trust history.
