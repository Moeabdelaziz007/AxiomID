# KYA Protocol Specification v0.1

> **Know Your Agent — the verification protocol linking AI agents to verified humans**

---

## Metadata

```yaml
Version: 0.1
Generated: 2026-07-17
Status: Draft
Supersedes: None
```

---

## 1. Introduction

### 1.1 What is KYA?

Know Your Agent (KYA) is the verification protocol for OpenIdentity. It defines how an AI agent proves its identity is cryptographically linked to a verified human. KYA is to agents what KYC (Know Your Customer) is to humans in regulated financial systems.

### 1.2 Why It Matters

Before agents talk to each other (A2A), use tools (MCP), sign transactions, or access protected resources — the first question is always:

> **"Who is this agent operated by?"**

KYA answers that question with a verifiable trust chain, not a claim.

### 1.3 Key Principle

**KYA is PROVIDER-AGNOSTIC.** Pi Network is the reference implementation and primary identity provider for v0.1, but the protocol works with any identity provider that can verify human identity (GitHub, Google, DID providers, national ID systems, etc.). No single provider is privileged in the protocol design.

---

## 2. Trust Architecture

```
Human KYC (at identity provider)
  └─→ Verified Identity (provider-signed attestation)
       └─→ Wallet (agent's cryptographic keypair)
            └─→ Agent Manifest (openidentity.md)
                 └─→ Capabilities (Passport, A2A, MCP, Skills)
```

### 2.1 Trust Flow

Each layer certifies the layer below it:

| Layer | What | How |
|-------|------|-----|
| **Human KYC** | Identity provider verifies a real human | Government ID, biometrics, liveness check |
| **Verified Identity** | Provider issues a signed attestation | Cryptographic signature, timestamped |
| **Wallet** | Agent keypair signs on behalf of the human | Ed25519 / ECDSA keypair |
| **Manifest** | `openidentity.md` declares the link | YAML frontmatter + provider proof reference |
| **Capabilities** | Passport, A2A, MCP agents inherit the trust | Verification at every interaction boundary |

### 2.2 Trust is NOT Transferable

KYA links a specific agent keypair to a specific verified human. The attestation is bound to the agent's DID, not to the human's identity alone. If the agent's private key is rotated, a new attestation must be issued.

---

## 3. Core Concepts

### 3.1 Trust Provider

Any entity that can verify human identity and issue verifiable attestations.

Examples: Pi Network, GitHub, Google, Stripe Identity, DID providers, national eID systems.

**Provider requirements:**
- Can verify a human is real (KYC, OAuth, biometrics, etc.)
- Can issue signed attestations
- Provides a verification endpoint for third-party validation
- Supports attestation revocation

### 3.2 Attestation

A verifiable claim from a trust provider asserting that an agent is operated by a verified human. NOT a score — it is a binary cryptographic statement: "Provider X verified human Y controls agent Z at time T."

### 3.3 Credential

An attestation + all metadata needed for third-party verification. Includes the provider's cryptographic signature, expiry timestamp, and revocation URL. A credential is what a verifier fetches to confirm an attestation is genuine.

### 3.4 Trust Chain

The cryptographic link from agent → wallet → verification → human. Each hop is independently verifiable:

- **Agent → Wallet:** The agent signs with a keypair. The public key is the agent's DID.
- **Wallet → Verification:** The provider's attestation references the agent's DID.
- **Verification → Human:** The provider attests that the DID owner passed KYC.

---

## 4. Attestation Format

Attestations are declared in the YAML frontmatter of `openidentity.md` and in the `attestations[]` array of `passport.md`.

### 4.1 Schema

```yaml
attestations:
  - provider: pi-network        # who verified
    type: kyc                   # what kind of verification
    status: verified            # current status (verified | pending | unverified)
    verified_at: "2026-07-16T10:00:00Z"  # when verification occurred (ISO 8601)
    proof: did:pi:0x1234...abc  # provider-specific proof reference
```

### 4.2 Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `provider` | yes | string | Namespaced provider identifier (e.g., `pi-network`, `github`, `google`) |
| `type` | yes | string | Verification type (e.g., `kyc`, `oauth`, `did`) |
| `status` | yes | enum | One of: `verified`, `pending`, `unverified` |
| `verified_at` | yes | ISO 8601 | When the attestation was issued |
| `proof` | yes | string | Provider-specific reference for credential retrieval |

### 4.3 Passport-Level KYA

In the Passport document (`passport.md`), KYA is also declared at the top level:

```yaml
kya:
  provider: pi-network
  status: verified
  level: 3
```

The `level` field (0–5) represents the provider's internal trust level, if applicable. This is provider-specific and not standardized across providers.

---

## 5. Attestation vs Credential

This distinction is critical to the protocol:

| | Attestation | Credential |
|---|------------|------------|
| **Where** | Declared in manifest / passport | Fetched from provider endpoint |
| **What** | "I claim to be verified by X" | "X cryptographically confirms this claim" |
| **Self-Issued?** | Yes — agent writes it | No — provider issues it |
| **Verifiable?** | No (just a claim) | Yes (includes signature, expiry, revocation) |
| **Revocable?** | No | Yes — provider can revoke |
| **Example** | `attestations[].provider: pi-network` | `GET /v2/kyc/credentials/{proof}` returns signed JWT |

**Rule:** An agent MAY declare attestations in its manifest, but trust is only established when a verifier fetches and validates the corresponding credential.

---

## 6. Verification Flow

### 6.1 Standard Verification (3-Party)

```
Agent                      Verifier                 Trust Provider
  │                          │                          │
  │  1. Present manifest     │                          │
  │ ─────────────────────→   │                          │
  │                          │                          │
  │                          │  2. Request credential   │
  │                          │ ─────────────────────→   │
  │                          │                          │
  │                          │  3. Return credential    │
  │                          │ ←─────────────────────   │
  │                          │                          │
  │  4. Trust established    │                          │
  │ ←─────────────────────   │                          │
```

### 6.2 Step-by-Step

**Step 1 — Agent presents its manifest**
The agent exposes `/.well-known/openidentity.md` (or provides it directly). The verifier reads:
- `did` — the agent's identifier
- `kyc.provider` — which provider verified the human
- `attestations[]` — the agent's declared claims

**Step 2 — Verifier requests credential**
The verifier constructs a request to the provider's verification endpoint, passing the agent's `did` and the `proof` reference from the attestation.

**Step 3 — Provider responds**
The provider confirms:
- The attestation exists and is valid
- It belongs to the agent identified by the given DID
- It has not been revoked
- It has not expired

The response is a signed credential (JWT, Verifiable Credential, or provider-specific format).

**Step 4 — Trust is established**
If the credential validates cryptographically, the attestation is confirmed, and trust is established.

### 6.3 Credential Verification Endpoint

Providers MUST expose a verification endpoint. The endpoint MUST:

- Accept `GET` or `POST` with the agent's `did` and `proof` reference
- Return a signed credential or an error response
- Support CORS for browser-based verifiers
- Return `404` for unknown or revoked attestations

---

## 7. Reference Provider #1: Pi Network

### 7.1 Provider ID

```
pi-network
```

### 7.2 Proof Format

```
did:pi:<wallet_address>
```

Example: `did:pi:0xGBK6G5G5G5G5G5G5G5G5G5G5G5G5G5G5`

### 7.3 Verification Flow

| Step | Detail |
|------|--------|
| **Human KYC** | User completes Pi KYC via Pi Browser (government ID, liveness check, biometrics) |
| **Wallet binding** | Agent generates Ed25519 keypair; wallet address is derived from public key |
| **Attestation** | `openidentity.md` declares `attestations[].provider: pi-network` with `proof: did:pi:<address>` |
| **Credential** | Verifier calls `GET https://api.minepi.com/v2/kyc/credentials/{proof}` with Pi API key |
| **Confirmation** | Pi Network returns signed credential: DID match + KYC status + expiry |

### 7.4 Pi SDK Integration

For agents operating in Pi Browser:
- Use `Pi.nativeFeature.openConsentDialog()` to request KYC consent
- Use `Pi.authenticate()` to authenticate the human
- The agent's wallet address comes from `Pi.authenticate().user.walletAddress`

### 7.5 Limitations

- Pi Network attestations are only meaningful within the Pi ecosystem unless a cross-chain bridge is established
- Pi KYC levels vary (tier 0–5); verifiers should check the `level` field

---

## 8. Multi-Provider Architecture

### 8.1 Providers are Equal Peers

No provider is the "root" of the trust system. Pi Network, GitHub, Google, and any future provider all occupy the same level in the hierarchy — they are all sources of attestation, not authoritative over each other.

### 8.2 Multiple Attestations

An agent MAY have attestations from multiple providers:

```yaml
attestations:
  - provider: pi-network
    type: kyc
    status: verified
    verified_at: "2026-07-16T10:00:00Z"
    proof: did:pi:0x1234...abc
  - provider: github
    type: oauth
    status: verified
    verified_at: "2026-07-15T08:30:00Z"
    proof: github:user:octocat
```

### 8.3 Verifier Choice

- A verifier MAY choose which providers it trusts
- A verifier MAY define its own minimum attestation requirements (e.g., "must have at least 1 KYC-level attestation from a trusted provider")
- A verifier MAY define trust levels (e.g., Pi KYC level ≥ 3, or GitHub account older than 2 years)
- A verifier MAY reject any provider for any reason

### 8.4 Cross-Provider Trust

The protocol does NOT define cross-provider trust. If Provider A trusts Provider B's attestations, that is an out-of-band agreement. KYA defines the format, not the policy.

---

## 9. Security Considerations

### 9.1 Attestation Replay Prevention

Each credential SHOULD include:
- A unique nonce or sequence number
- A timestamp with expiration
- The agent's specific DID (not just the human's ID)

This prevents an agent from replaying another agent's attestation.

### 9.2 Provider Key Rotation

- Providers SHOULD publish their current verification keys at a well-known URL
- Providers MUST support key rotation with overlap periods
- Verifiers MUST verify the provider's signature against the current key
- Agents SHOULD re-validate attestations after provider key rotation announcements

```yaml
# Recommended: provider publishes keys at .well-known/openidentity-keys.json
keys:
  current: did:key:z6Mk...abc
  previous:
    - id: did:key:z6Mk...def
      valid_until: "2026-06-30T23:59:59Z"
```

### 9.3 Attestation Revocation

- Providers MUST support revocation
- Providers MUST expose a revocation check endpoint
- Verifiers SHOULD check revocation status on every verification
- Verifiers MAY cache positive verification results for a limited time (TTL determined by verifier policy)

**Revocation reasons:**
- Human user revoked the agent's authorization
- Agent keypair was compromised
- Human KYC status changed (e.g., expired documents)
- Provider policy violation

### 9.4 Expiration and Renewal

- Attestations MUST have an expiration timestamp
- Agents MUST re-verify before expiration
- Verifiers SHOULD reject expired attestations
- Recommended maximum TTL: 365 days (provider policy may be shorter)

### 9.5 No Central Authority

KYA has no root CA, no central registry, no global blockchain. Trust is established bilaterally between verifier and provider. Agents are responsible for maintaining their own attestations. Verifiers are responsible for defining their own trust policies.

### 9.6 Privacy Considerations

- Attestations contain the minimum information needed to establish the link (DID + proof reference)
- Verifiers SHOULD NOT retain credential data longer than necessary
- Providers SHOULD support selective disclosure (e.g., "is verified?" → yes/no without revealing full identity)
- The agent's `openidentity.md` is public; attestations in it reveal which providers the agent uses

---

## 10. Complete Example

### 10.1 Human KYC (at Pi Network)

A human named Alice completes Pi KYC through the Pi Browser. Pi Network records her verified identity at `https://api.minepi.com/v2/kyc/users/alice_pi_uid`.

### 10.2 Agent Keypair Generation

Alice deploys an agent. The agent generates an Ed25519 keypair:

```
Private key: z6Mk... (kept secret by the agent)
Public key:  z6Mk...abc123 (published as the agent's DID)
Wallet:      GBC3... (derived from public key)
```

### 10.3 Attestation Request

The agent requests an attestation from Pi Network by calling:

```bash
POST https://api.minepi.com/v2/kyc/attest
Authorization: Key <PI_API_KEY>
Content-Type: application/json

{
  "agent_did": "did:axiom:z6Mkabc123",
  "wallet_address": "GBC3...",
  "human_pi_uid": "alice_pi_uid"
}
```

Pi Network verifies Alice's consent, confirms the wallet is linked to Alice, and returns a signed attestation reference.

### 10.4 Agent Manifest

The agent's `openidentity.md`:

```yaml
---
version: "0.1"
id: did:axiom:z6Mkabc123
name: "Alice's Assistant"
description: "A personal AI assistant operated by Alice"

attestations:
  - provider: pi-network
    type: kyc
    status: verified
    verified_at: "2026-07-16T10:00:00Z"
    proof: did:pi:GBC3...
---
```

### 10.5 Third-Party Verification

Bob's agent wants to verify Alice's agent. Bob's agent:

1. **Fetches** `https://alice-agent.example/.well-known/openidentity.md`
2. **Reads** `attestations[0].proof = did:pi:GBC3...`
3. **Calls** `GET https://api.minepi.com/v2/kyc/credentials/GBC3...`
4. **Receives** a signed credential from Pi Network confirming: "Agent with DID `did:axiom:z6Mkabc123` (wallet `GBC3...`) is operated by a KYC-verified human."
5. **Validates** the provider's cryptographic signature
6. **Checks** the credential is not expired
7. **Checks** the credential is not revoked
8. **Establishes trust** — Bob's agent can now interact with Alice's agent

### 10.6 Verification Response (Hypothetical)

```json
{
  "credential": {
    "@context": "https://www.w3.org/2018/credentials/v1",
    "type": ["VerifiableCredential", "KYCAttestation"],
    "issuer": "did:pi:network",
    "issuanceDate": "2026-07-16T10:00:00Z",
    "expirationDate": "2027-07-16T10:00:00Z",
    "credentialSubject": {
      "id": "did:axiom:z6Mkabc123",
      "walletAddress": "GBC3...",
      "kycStatus": "verified",
      "kycLevel": 3
    },
    "credentialStatus": {
      "id": "https://api.minepi.com/v2/kyc/credentials/GBC3.../status",
      "type": "CredentialStatusList2021"
    },
    "proof": {
      "type": "Ed25519Signature2020",
      "created": "2026-07-16T10:00:00Z",
      "verificationMethod": "did:pi:network#key-1",
      "proofPurpose": "assertionMethod",
      "proofValue": "z5A..."
    }
  }
}
```

---

## Appendix A: KYA in the OpenIdentity Ecosystem

| Protocol | Layer | Purpose | Role of KYA |
|----------|-------|---------|-------------|
| OpenIdentity | Identity | Who agents ARE | Defines the manifest format that carries attestations |
| **KYA** | **Trust** | **How agents PROVE** | **Defines attestation verification** |
| A2A | Interaction | How agents TALK | Verifies counterparty before first message |
| MCP | Capability | How agents USE TOOLS | Verifies tool caller before granting access |

## Appendix B: Provider Registration (Future)

Future versions of this spec MAY define a provider registration mechanism. For v0.1, providers are identified by their namespace string (e.g., `pi-network`, `github`, `google`) and discovered via the agent's manifest.

---

Copyright © 2026 AxiomID. This specification is released under the MIT License.
