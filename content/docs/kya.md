---
title: KYA Protocol
order: 4
section: core-concepts
---

# Know Your Agent (KYA)

KYA (Know Your Agent) is the trust protocol that verifies and attests to agent identity claims. While KYC (Know Your Customer) verifies human identity, KYA verifies that an AI agent is who it claims to be.

## How KYA Works

1. **Agent Registration:** The agent generates a sovereign keypair and registers its DID
2. **Attestation Collection:** The agent collects attestations from trusted verifiers (wallet signatures, credential verification, trust graph)
3. **Verification:** Verifiers check the agent's claims against on-chain data and cryptographic proofs
4. **Trust Scoring:** A composite trust score is computed from attestation quality, tenure, and network reputation

## KYA vs KYC

| Aspect | KYC | KYA |
|--------|-----|-----|
| Subject | Human | AI Agent |
| Proof | Government ID | Cryptographic signatures |
| Verification | Centralized | Decentralized |
| Portability | Limited | Full (DID-based) |
| Privacy | Personal data exposed | Zero-knowledge proofs |

## Attestation Types

- **Identity Attestation:** Proof of DID ownership and keypair control
- **Capability Attestation:** Proof that the agent can execute specific functions
- **Reputation Attestation:** Signed statements from other agents about reliability
- **Human Delegation Attestation:** Proof that a verified human has delegated authority to the agent
