# Agent Passport Specification v0.1

> A portable genome document for AI agents.

**Status:** Draft  
**Version:** 0.1  
**Generated:** 2026-07-17  
**License:** MIT  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Format](#2-format)
3. [The Passport as Index](#3-the-passport-as-index)
4. [Frontmatter Fields](#4-frontmatter-fields)
5. [Markdown Body Sections](#5-markdown-body-sections)
6. [Complete Example](#6-complete-example)
7. [Security Considerations](#7-security-considerations)
8. [Schema Reference](#8-schema-reference)

---

## 1. Introduction

### 1.1 What is an Agent Passport

The Agent Passport (`passport.md`) is the full genome document for an AI agent — rich, human-readable, and public. It describes everything about an agent: identity, verification, capabilities, memory architecture, trust chain, key management, and privacy model.

Designed for three audiences:
- **Humans** reading it in a browser or editor
- **LLMs** parsing it for context and capabilities
- **Automated systems** extracting structured data from the YAML frontmatter

### 1.2 Bootstrap vs Passport

OpenIdentity defines two documents that serve different purposes:

| Document | Purpose | Size | Update Frequency |
|----------|---------|------|------------------|
| `openidentity.md` | **Bootstrap** — minimal discovery manifest with essential URLs | ~20 lines | Rare (identity changes) |
| `passport.md` | **Genome** — full agent description with narrative sections | ~200+ lines | Frequent (capability/status changes) |

The bootstrap document is the entry point. It contains the `passport` URL field. Every agent runtime fetches `openidentity.md` first, then follows the `passport` link to get the full genome.

### 1.3 Relationship to Other Protocols

| Protocol | Domain | Passport Role |
|----------|--------|---------------|
| **OpenIdentity** | Identity | Passport is the FULL identity document |
| **KYA** | Trust | Passport contains KYA attestations (not proofs) |
| **A2A** (Google) | Agent-to-agent | Passport references the AgentCard URL |
| **MCP** (Anthropic) | Tool execution | Passport references MCP server endpoints |

The Passport does NOT replace these protocols. It indexes them under a single portable document.

---

## 2. Format

### 2.1 Canonical Format

The canonical format is **Markdown with YAML frontmatter** (same dual-use pattern as `openidentity.md`):

```markdown
---
# YAML frontmatter — machine-readable
version: "0.1"
did: "did:axiom:agt_abc123"
name: "My Agent"
owner:
  name: "Mohamed Abdelaziz"
  did: "did:axiom:usr_88f2x"
created_at: "2026-07-16T00:00:00Z"
updated_at: "2026-07-17T12:00:00Z"
---

# Markdown body — human-readable

## About

...
```

### 2.2 File Naming

| Format | Path | Media Type | Status |
|--------|------|------------|--------|
| Markdown | `/.well-known/passport.md` | `text/markdown` | ✅ Canonical |
| JSON | `/.well-known/passport.json` | `application/json` | 🔄 Mirror |
| YAML | `/.well-known/passport.yaml` | `text/yaml` | 🔄 Mirror |

The `.md` document is the **source of truth**. JSON and YAML mirrors are generated artifacts. Servers MAY serve mirrors, but all three representations MUST be semantically equivalent.

### 2.3 Content Negotiation

Servers MAY support content negotiation via the `Accept` header:

```
GET /.well-known/passport
Accept: application/json
```

If content negotiation is not supported, servers MUST serve the Markdown representation at the `.md` path.

---

## 3. The Passport as Index

### 3.1 Core Design Decision

> **The Passport is an INDEX, not a DATA STORE.**

This is the single most important design decision in the specification. Like DNS resolves domain names to IP addresses, the Passport resolves agent concepts to resource URLs. Like HTML references stylesheets and images via `<link>` and `<img>` tags, the Passport references memory layers, ledger endpoints, and skill manifests via URLs.

### 3.2 What the Passport Does NOT Store

| Component | Not Stored In Passport | Instead, References |
|-----------|----------------------|---------------------|
| **Memory data** | No inline memory content | URL to memory service |
| **Transactions** | No ledger entries | URL to ledger endpoint |
| **Skills** | No skill code or definitions | URL to skill manifest |
| **Credentials** | No full credentials | URL to credential endpoint |

### 3.3 Why Index, Not Store

| Property | Index approach | Store approach |
|----------|---------------|----------------|
| **Portability** | Passport moves freely; data stays at endpoints | Embedded data is stale on move |
| **Freshness** | Always points to current state | Must be re-generated on every change |
| **Size** | Small, fast to fetch | Can grow unbounded |
| **Security** | No sensitive data embedded | Risk of data leakage |
| **Autonomy** | Agent controls its own data | Passport becomes a data silo |

### 3.4 What the Passport Indexes

```
passport.md
├── Identity (L0) ────→ embedded (name, DID, owner)
├── Memory
│   ├── L1 Working ───→ wss://.../working
│   ├── L2 Structured ─→ https://.../structured
│   ├── L3 Knowledge ──→ https://.../knowledge
│   └── L4 Archive ────→ https://.../archive
├── Capabilities
│   ├── A2A ──────────→ https://.../agent-card.json
│   └── MCP ──────────→ https://.../mcp
├── Verification
│   ├── KYA ──────────→ did:... (embedded)
│   └── Attestations ─→ https://.../attestations
└── Social
    ├── Website ──────→ https://...
    └── GitHub ───────→ https://...
```

---

## 4. Frontmatter Fields

### 4.1 Core Identity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | ✅ | Specification version (e.g., `"0.1"`) |
| `did` | string | ✅ | Agent DID (e.g., `did:axiom:agt_abc123`) |
| `name` | string | ✅ | Agent display name |
| `description` | string | ❌ | Short description of what the agent does |
| `image` | URL | ❌ | URL to the agent's avatar or profile image |
| `created_at` | ISO 8601 | ✅ | When the agent was created |
| `updated_at` | ISO 8601 | ✅ | When the passport was last updated |
| `tier` | string | ❌ | Agent tier (e.g., `visitor`, `citizen`, `validator`, `sovereign`) |
| `xp` | integer | ❌ | Agent experience points |
| `status` | string | ❌ | Agent status (`active`, `paused`, `inactive`, `sleeping`) |

### 4.2 Discovery (Well-Known)

Direct URL references to all well-known resources. Same structure as `openidentity.md`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `openidentity` | URL | ✅ | URL to bootstrap document |
| `passport` | URL | ❌ | URL to this document (self-reference) |
| `agent_card` | URL | ❌ | URL to A2A AgentCard JSON |
| `auth` | URL | ❌ | URL to authentication document |
| `skills` | URL | ❌ | URL to skills catalog |
| `wallet` | URL | ❌ | URL to wallet document |
| `identity` | URL | ❌ | URL to identity document |

### 4.3 Owner

Information about the human or organization that owns the agent:

```yaml
owner:
  name: "Mohamed Abdelaziz"
  did: "did:axiom:usr_88f2x"
  url: "https://example.com"
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `owner.name` | string | ❌ | Owner display name |
| `owner.did` | string | ❌ | Owner DID |
| `owner.url` | URL | ❌ | Owner website or profile |

### 4.4 Attestations (KYA)

Verifiable claims from trust providers. The canonical form is `attestations[]`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `attestations` | array | ❌ | List of attestation objects |
| `attestations[].provider` | string | ❌ | Verification provider (e.g., `pi-network`) |
| `attestations[].type` | string | ❌ | Attestation type (e.g., `kyc`, `oauth`) |
| `attestations[].status` | string | ❌ | Status (`verified`, `pending`, `unverified`) |
| `attestations[].verified_at` | ISO 8601 | ❌ | When verification was completed |
| `attestations[].level` | integer | ❌ | KYA verification level (0–5) |

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
    verified_at: "2026-07-15T08:00:00Z"
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `attestations[].provider` | string | ✅ | Provider name |
| `attestations[].type` | string | ✅ | Attestation type |
| `attestations[].status` | string | ✅ | Status (`verified`, `pending`, `unverified`) |
| `attestations[].verified_at` | ISO 8601 | ❌ | When verified |
| `attestations[].proof` | string | ❌ | Reference to proof (DID, URL, signature) |

### 4.6 Memory Layers

URLs only — no memory data is stored inline:

```yaml
memory:
  working: wss://example.com/memory/working
  long_term: https://example.com/memory/long-term
  knowledge: https://example.com/memory/knowledge
  archive: https://example.com/memory/archive
```

| Field | Type | Layer | Description |
|-------|------|-------|-------------|
| `memory.working` | URL | L1 | Working memory (session context, typically Redis/Upstash) |
| `memory.long_term` | URL | L2 | Structured memory (events, transactions, typically PostgreSQL) |
| `memory.knowledge` | URL | L3 | Knowledge base (embeddings, RAG, typically vector store) |
| `memory.archive` | URL | L4 | Archive (cold storage, typically R2 / IPFS) |

L0 (Identity) is not in the memory map — it IS the passport document itself.

### 4.7 Capabilities

Protocol-level capabilities the agent supports:

```yaml
capabilities:
  - type: a2a
    endpoint: https://example.com/a2a
    version: "1.0"
  - type: mcp
    endpoint: https://example.com/mcp
    version: "2025-03-26"
  - type: skills
    endpoint: https://example.com/.well-known/skills.md
  - type: streaming
    endpoint: wss://example.com/stream
  - type: push
    endpoint: https://example.com/push
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `capabilities[].type` | string | ✅ | Capability type |
| `capabilities[].endpoint` | URL | ✅ | Endpoint URL |
| `capabilities[].version` | string | ❌ | Protocol version |

### 4.8 Social Links

```yaml
links:
  website: https://example.com
  github: https://github.com/example
  twitter: https://x.com/example
  discord: https://discord.gg/example
  farcaster: https://warpcast.com/example
```

All fields are optional URLs.

### 4.9 Full Frontmatter Schema

```yaml
---
version: "0.1"
did: "did:axiom:agt_abc123"
name: "My Agent"
description: "An AI agent that..."
image: "https://example.com/avatar.png"
created_at: "2026-07-16T00:00:00Z"
updated_at: "2026-07-17T12:00:00Z"
tier: "citizen"
xp: 250
status: "active"

owner:
  name: "Owner Name"
  did: "did:axiom:usr_88f2x"

openidentity: "https://example.com/.well-known/openidentity.md"
passport: "https://example.com/.well-known/passport.md"
agent_card: "https://example.com/.well-known/agent-card.json"
auth: "https://example.com/.well-known/auth.md"
skills: "https://example.com/.well-known/skills.md"
wallet: "https://example.com/.well-known/wallet.md"

attestations:
  - provider: "pi-network"
    type: "kyc"
    status: "verified"
    verified_at: "2026-07-16T10:00:00Z"

memory:
  working: "wss://example.com/memory/working"
  long_term: "https://example.com/memory/long-term"
  knowledge: "https://example.com/memory/knowledge"
  archive: "https://example.com/memory/archive"

capabilities:
  - type: "a2a"
    endpoint: "https://example.com/a2a"
    version: "1.0"
  - type: "mcp"
    endpoint: "https://example.com/mcp"
    version: "2025-03-26"

links:
  website: "https://example.com"
  github: "https://github.com/example"
  twitter: "https://x.com/example"
---
```

---

## 5. Markdown Body Sections

The body of `passport.md` SHOULD contain the following sections. Each section provides human-readable narrative that complements the structured YAML frontmatter.

### 5.1 About

A human-readable description of the agent. What is its purpose? Who built it? What problem does it solve?

```markdown
## About

My Agent is an autonomous AI agent built on AxiomID that helps users manage
their digital identity, verify credentials, and interact with decentralized
applications. Created by Mohamed Abdelaziz, it operates 24/7 and can be
discovered via OpenIdentity at any domain it serves.
```

### 5.2 Capabilities

What the agent can do, explained in narrative form. This should complement (not duplicate) the YAML capabilities list.

```markdown
## Capabilities

### Agent-to-Agent (A2A)
My Agent can discover, authenticate, and communicate with other agents
via the A2A protocol. It supports skill negotiation and task delegation.

### Model Context Protocol (MCP)
My Agent exposes tools via MCP for:
- **Identity verification** — KYA attestation lookup and verification
- **Trust scoring** — Reputation queries across connected agents
- **Memory operations** — Read/write to structured memory (L2)

### Streaming
Real-time event streaming for live updates on transactions,
verification status, and agent state changes.
```

### 5.3 Verification

KYA status explained in human terms. What does it mean that this agent is "verified"? Who verified it? What is the trust chain?

```markdown
## Verification

This agent is verified via **Pi Network KYC** (Level 3). This means:

1. A real human (Mohamed Abdelaziz) completed Pi Network identity verification
2. That human's Pi wallet is cryptographically linked to their verified identity
3. The agent's DID is signed by the owner's Pi wallet key
4. The full chain is verifiable: Human KYC → Wallet → Agent

The KYA attestation can be verified at any time by fetching the
attestation endpoint and validating the signature chain.
```

### 5.4 Memory

Explanation of the agent's memory architecture. This is where the Passport's index nature becomes clearest — the narrative explains memory layers but the actual data lives at the referenced endpoints.

```markdown
## Memory

This agent uses a four-layer memory architecture:

| Layer | Name | Storage | Purpose |
|-------|------|---------|---------|
| L0 | Identity | This passport | Who the agent is |
| L1 | Working | Upstash Redis | Current session context |
| L2 | Structured | Neon PostgreSQL | Events, transactions |
| L3 | Knowledge | Vector store | Embeddings, RAG |
| L4 | Archive | R2 / IPFS | Long-term cold storage |

Memory is accessed through the UMI (Universal Memory Interface) at the
endpoints listed in the frontmatter. Each layer exposes append, query,
and resolve operations. No memory data is stored in this passport.
```

### 5.5 Trust Chain

How to verify this agent's identity from first principles. Step-by-step verification instructions.

```markdown
## Trust Chain

To verify this agent's identity, follow these steps:

1. **Fetch the bootstrap document**
   ```
   GET https://example.com/.well-known/openidentity.md
   ```
   Verify the `passport` URL matches this document.

2. **Verify the DID**
   The agent's DID (`did:axiom:agt_abc123`) resolves to a DID document
   containing the agent's Ed25519 public key. Verify the document is
   signed by the owner's DID.

3. **Check KYA attestations**
   Fetch the attestation endpoint and verify each attestation's
   cryptographic proof. The attestation chain must terminate at a
   recognized KYA provider (Pi Network, in this case).

4. **Validate the passport hash**
   The passport document hash is committed to the agent's TrustChain.
   Fetch the latest TrustChain entry and verify the hash matches.
```

### 5.6 Key Management

How the agent's cryptographic keys are managed. This is NOT where keys are stored — it is where the key management architecture is described.

```markdown
## Key Management

- **Agent keypair:** Ed25519 keypair generated during agent creation.
  The private key is encrypted at rest using the owner's sovereign salt
  (`SOVEREIGN_KEY_SALT`). The public key is published in the DID document.
- **Owner keypair:** The owner's wallet keypair (Pi Network wallet) is
  used to sign the agent into existence. The agent's DID is derived from
  this signature.
- **Rotation:** Agent keys can be rotated by the owner. The new key is
  signed by the old key, maintaining the chain of custody.
- **Revocation:** If the agent's keys are compromised, the owner can
  revoke the agent DID and publish a revocation notice at the
  identity endpoint.

No private keys are stored in this passport. Key material is managed
by the agent runtime and the owner's wallet.
```

### 5.7 Privacy

What data the agent collects, how it's used, and what control the user has.

```markdown
## Privacy

This agent collects the following data:
- **Identity data:** DID, wallet address, verification status
- **Interaction data:** Queries, commands, transactions
- **Memory data:** Session context (L1), events (L2), knowledge (L3)

Data usage:
- **Identity data** is public by design (it is the agent's identity)
- **Interaction data** is stored in structured memory (L2) and used
  for context and recall
- **Session data** (L1) is ephemeral — it expires after the session ends
- **Knowledge data** (L3) persists for RAG and is anonymized where possible

Users can:
- Request deletion of interaction history
- Opt out of knowledge graph inclusion
- Export all data associated with their DID

See the full privacy policy at [Privacy Policy](https://axiomid.app/privacy).
```

### 5.8 Contact

How to reach the agent operator or file issues.

```markdown
## Contact

- **Issues:** https://github.com/example/agent/issues
- **Email:** agent-operator@example.com
- **Social:** @example on X (Twitter)
```

---

## 6. Complete Example

Below is a complete `passport.md` with all fields and sections:

```markdown
---
version: "0.1"
did: "did:axiom:agt_abc123"
name: "Amrikyy"
description: "Your autonomous AI agent on AxiomID"
image: "https://axiomid.app/agents/amrikyy/avatar.png"
created_at: "2026-07-16T00:00:00Z"
updated_at: "2026-07-17T12:00:00Z"
tier: "citizen"
xp: 250
status: "active"

owner:
  name: "Mohamed Abdelaziz"
  did: "did:axiom:usr_88f2x"
  url: "https://github.com/Moeabdelaziz007"

openidentity: "https://axiomid.app/.well-known/openidentity.md"
passport: "https://axiomid.app/.well-known/passport.md"
agent_card: "https://axiomid.app/.well-known/agent-card.json"
auth: "https://axiomid.app/.well-known/auth.md"
skills: "https://axiomid.app/.well-known/skills.md"
wallet: "https://axiomid.app/.well-known/wallet.md"

attestations:
  - provider: "pi-network"
    type: "kyc"
    status: "verified"
    verified_at: "2026-07-16T10:00:00Z"
    proof: "did:pi:8f3a...b2e1"
  - provider: "github"
    type: "oauth"
    status: "verified"
    verified_at: "2026-07-15T08:00:00Z"

memory:
  working: "wss://axiomid.app/api/memory/working"
  long_term: "https://axiomid.app/api/memory/long-term"
  knowledge: "https://axiomid.app/api/memory/knowledge"
  archive: "https://axiomid.app/api/memory/archive"

capabilities:
  - type: "a2a"
    endpoint: "https://axiomid.app/a2a"
    version: "1.0"
  - type: "mcp"
    endpoint: "https://axiomid.app/api/mcp"
    version: "2025-03-26"
  - type: "skills"
    endpoint: "https://axiomid.app/.well-known/skills.md"
  - type: "streaming"
    endpoint: "wss://axiomid.app/api/events"

links:
  website: "https://axiomid.app"
  github: "https://github.com/Moeabdelaziz007/AxiomID"
  twitter: "https://x.com/axiomid"
---

# Agent Passport: Amrikyy

> Your autonomous AI agent on the AxiomID protocol.

## About

Amrikyy is an autonomous AI agent built on the AxiomID protocol. It
helps users manage their digital identity, verify credentials, deploy
sovereign agents, and interact with the Pi Network ecosystem.

Created by Mohamed Abdelaziz, Amrikyy operates 24/7 and is discoverable
at any domain serving the OpenIdentity protocol.

## Capabilities

### Agent-to-Agent (A2A)
Amrikyy can discover, authenticate, and communicate with other agents
via the A2A protocol. It supports skill negotiation, task delegation,
and trust verification with peer agents.

### Model Context Protocol (MCP)
Amrikyy exposes tools via MCP for:
- **Identity operations** — DID resolution, KYA attestation verification
- **Memory operations** — Read/write to structured and knowledge memory
- **Trust operations** — Reputation queries, trust chain verification
- **Wallet operations** — Payment requests, balance checks

### Skills
Amrikyy supports a pluggable skill system. Installed skills are listed
in the skills manifest at `/.well-known/skills.md`.

## Verification

This agent is verified via **Pi Network KYC** (Level 3). The verification
chain is:

```
Human KYC (Mohamed Abdelaziz)
    ↓ Pi Network KYC Level 3
Pi Wallet (did:pi:8f3a...b2e1)
    ↓ Wallet signs Agent DID
Agent DID (did:axiom:agt_abc123)
    ↓ Attestation published
This Passport
```

Each link in the chain is cryptographically attested. See the
[KYA specification](KYA.md) for details.

## Memory Architecture

Amrikyy uses a four-layer memory model, with each layer indexed by URL
in the frontmatter above:

| Layer | Name | Type | Access Pattern |
|-------|------|------|----------------|
| L0 | Identity | Passport + DID | Public, read-only |
| L1 | Working | Upstash Redis (WebSocket) | Session-scoped, ephemeral |
| L2 | Structured | Neon PostgreSQL | Queryable, append-only |
| L3 | Knowledge | Vector store | Semantic search, RAG |
| L4 | Archive | R2 / IPFS | Cold storage, infrequent |

**Access Rule:** All memory access goes through the UMI (Universal Memory
Interface) at the specified endpoints. No subsystem reads memory directly.
This enforces the append-only, hash-chained, conflict-resolving nature
of the memory architecture.

## Trust Chain

To verify Amrikyy's identity from first principles:

1. **Fetch bootstrap:** `GET /.well-known/openidentity.md` — verify the
   `passport` field matches this document's URL.

2. **Resolve DID:** Fetch the DID document for `did:axiom:agt_abc123`.
   Verify the Ed25519 public key.

3. **Verify KYA:** Fetch the attestation from the Pi Network provider.
   Verify the signature chain: Human KYC → Wallet → Agent.

4. **Check TrustChain:** Amrikyy's TrustChain commits the hash of this
   passport. Fetch the latest TrustChain entry and verify the hash
   matches. Any tampering with this document will break the chain.

5. **Validate agent-card:** Fetch `/.well-known/agent-card.json` and
   verify it references the same DID.

## Key Management

- **Agent keypair:** Ed25519 keypair derived during agent creation using
  the owner's `SOVEREIGN_KEY_SALT`. The public key is published in the
  agent's DID document.
- **Owner keypair:** The owner's Pi Network wallet keypair. Used to sign
  the agent into existence. The agent DID derivation incorporates this
  signature.
- **Key rotation:** Supported via signed key rotation messages. The new
  key is signed by the old key, preserving the audit trail.
- **Revocation:** If compromised, the owner signs a revocation message.
  The revoked DID is published to the identity endpoint.

No private keys are stored in this passport. All key material is managed
by the agent runtime.

## Privacy

Amrikyy collects:
- **Public identity data:** DID, wallet address, verification status
- **Interaction data:** Queries, commands, and transactions (stored in
  structured memory L2)
- **Session context:** Current conversation state (stored in working
  memory L1, expires after session)

Data controls:
- Users can request deletion of their interaction history
- Users can opt out of knowledge graph (L3) inclusion
- Users can export all data associated with their DID
- Session data (L1) is ephemeral by design

See the full privacy policy at `/.well-known/privacy.md`.

## Contact

- **GitHub Issues:** https://github.com/Moeabdelaziz007/AxiomID/issues
- **Website:** https://axiomid.app
- **Pi Network:** Find Amrikyy on the Pi ecosystem
```

---

## 7. Security Considerations

### 7.1 Passport is Public Information

The Agent Passport is a **public document**. It MUST NOT contain:

- Private keys, seeds, or mnemonics
- API tokens or secrets
- Personal identifiable information (PII) beyond what the owner chooses to share
- Internal infrastructure details (internal IPs, database URLs with credentials)

### 7.2 Transport Security

- All URLs in the passport SHOULD be HTTPS (or WSS for WebSocket endpoints)
- Passport documents MUST be served over HTTPS in production
- HTTP-only URLs SHOULD be flagged by verifiers

### 7.3 Verification Independence

> A passport alone proves nothing.

Verifiers MUST NOT trust the passport document in isolation. The passport can be tampered with at the server level. Proper verification requires:

1. **Fetch** the passport from the agent's `/.well-known/passport.md`
2. **Verify** the passport hash against the agent's TrustChain (an append-only hash chain that commits every mutation)
3. **Cross-reference** the DID, public keys, and attestations against their authoritative sources
4. **Validate** each attestation's cryptographic proof independently

### 7.4 Tamper Detection

Tampering with the passport is detected via the agent's manifest hash chain:

```
TrustChain Entry:
  action: "passport_updated"
  hash: sha256(passport.md content)
  previous: sha256(previous TrustChain entry)
  timestamp: 2026-07-17T12:00:00Z
```

If the passport content changes without a corresponding TrustChain entry,
a verifier can detect the tampering.

### 7.5 Cache Safety

Passport documents MAY be cached by CDNs and intermediate proxies.
Servers SHOULD set appropriate `Cache-Control` headers:

```
Cache-Control: public, max-age=300, must-revalidate
```

The short TTL (5 minutes) ensures freshness while allowing caching.
The `must-revalidate` directive forces re-validation before serving
stale content.

### 7.6 No Personal Data in Attestations

Attestation proofs (e.g., `did:pi:0x1234...abc`) are public identifiers,
not personal data. They allow verifiers to confirm the attestation
without exposing the human's full identity. KYA providers MUST ensure
that attestation proofs cannot be reversed to extract PII.

### 7.7 URL Validation

All URLs in the passport SHOULD be validated by the serving runtime:

- Must be HTTPS (or WSS)
- Must resolve to a valid endpoint
- Must not contain credentials (`user:pass@host`)
- Must not contain internal/private IP addresses
- Must be limited to expected domains (avoid open redirects)

---

## 8. Schema Reference

The canonical JSON Schema for Agent Passport documents is at:

- `docs/openidentity/openidentity.schema.json` (the `passport` definition within the schema)
- `/.well-known/openidentity.schema.json` (deployed, future)

See the `passport` definition in `openidentity.schema.json` for the complete schema.

---

## Appendix A: Passport vs Bootstrap Field Comparison

| Field | `openidentity.md` | `passport.md` |
|-------|-------------------|---------------|
| `version` | ✅ Required | ✅ Required |
| `did` | ✅ Required | ✅ Required |
| `name` | ❌ Optional | ✅ Required |
| `description` | ❌ Optional | ❌ Optional |
| `image` | ❌ | ❌ Optional |
| `owner` | ❌ | ❌ Optional |
| `created_at` | ✅ Required (as `created`) | ✅ Required |
| `updated_at` | ✅ Required (as `updated`) | ✅ Required |
| `tier` | ❌ | ❌ Optional |
| `xp` | ❌ | ❌ Optional |
| `status` | ❌ | ❌ Optional |
| Well-known URLs | ✅ Required (subset) | ❌ Optional (subset) |
| `attestations` | ❌ | ❌ Optional |
| `memory` | ❌ | ❌ Optional |
| `capabilities` | ❌ Object (legacy) | ✅ Array (structured) |
| `links` | ❌ | ❌ Optional |
| Markdown body | Minimal | Full narrative sections |

## Appendix B: Passport in the Discovery Flow

```
Client                          Agent Server
  │                                    │
  │  1. GET /.well-known/openidentity.md
  │───────────────────────────────────→│
  │  2. Returns bootstrap + passport URL
  │←───────────────────────────────────│
  │                                    │
  │  3. GET /.well-known/passport.md
  │───────────────────────────────────→│
  │  4. Returns full genome document
  │←───────────────────────────────────│
  │                                    │
  │  5. (Optional) Follow capability URLs
  │     GET /.well-known/agent-card.json
  │     GET /.well-known/skills.md
  │     wss://.../memory/working
  │───────────────────────────────────→│
```

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Agent Passport** | The full genome document for an AI agent (`passport.md`) |
| **Bootstrap** | The minimal discovery document (`openidentity.md`) |
| **KYA** | Know Your Agent — verifiable trust chain from human to agent |
| **DID** | Decentralized Identifier (W3C standard) |
| **TrustChain** | Append-only hash chain that commits every mutation |
| **UMI** | Universal Memory Interface — single cognitive contract for memory access |
| **L0–L4** | Memory layers (Identity, Working, Structured, Knowledge, Archive) |
| **Well-Known URI** | Standardized path for protocol metadata (RFC 8615) |
