# OpenIdentity Manifest Specification v0.1

> A portable identity manifest for AI agents.

**Status:** Draft
**Version:** 0.1
**Generated:** 2026-07-17
**License:** MIT

---

## 1. Introduction

### 1.1 What is OpenIdentity

OpenIdentity is a portable identity manifest for AI agents. Think of it as the USB descriptor for an AI agent — a lightweight bootstrap document that tells any runtime who the agent is, where to find its resources, and how to verify its identity.

### 1.2 Positioning

OpenIdentity is the **discovery layer** for AI agents. Before two agents can communicate (A2A), before one agent uses another's tools (MCP), and before any trust relationship can be established (KYA), the runtime must first answer one question:

> "Who is this agent?"

OpenIdentity answers that question with a single file placed at a well-known URL.

### 1.3 Protocol Landscape

| Protocol | Layer | Purpose | OpenIdentity Role |
|----------|-------|---------|-------------------|
| **A2A** (Google) | Interaction | How agents talk to each other | Provides identity for the agent on the other end |
| **MCP** (Anthropic) | Capability | How agents use tools | Provides identity + auth context for MCP servers |
| **OpenIdentity** | Identity | Who agents are | The discovery layer — the first check |
| **KYA** | Trust | How agents prove they're real | The verification protocol for trust attestations |

OpenIdentity does not replace these protocols. It is the prerequisite for all of them.

---

## 2. File Format Specification

### 2.1 Canonical Format

The canonical format for OpenIdentity documents is **Markdown with YAML frontmatter**, following the pattern established by Jekyll, Hugo, and Obsidian.

```
/.well-known/openidentity.md
```

This format is chosen because:
- **Human-readable** — Anyone can open the file and understand it
- **Machine-parseable** — YAML frontmatter parsers exist in every language
- **Self-describing** — The Markdown body provides narrative context
- **Deployable anywhere** — Static file servers, CDNs, GitHub Pages, any HTTP server

### 2.2 Structure

An OpenIdentity document consists of exactly two sections:

```
---
# YAML frontmatter (machine-readable)
# Key-value pairs, lists, and nested objects

version: "0.1"
did: "did:axiom:agt_abc123"
name: "Agent Name"
well_known:
  openidentity: "https://example.com/.well-known/openidentity.md"
  passport: "https://example.com/.well-known/passport.md"
  agent_card: "https://example.com/.well-known/agent-card.json"
---

# Markdown body (human-readable)
## About
Optional narrative content about the agent.
```

**Frontmatter delimiters:** Three dashes (`---`) on their own line, both opening and closing. The closing `---` is optional if the document has no Markdown body.

### 2.3 Alternative Representations

For strict machine consumers that cannot parse YAML frontmatter, equivalent `.json` and `.yaml` mirrors MAY be generated:

| Format | Path | Media Type |
|--------|------|------------|
| Markdown | `/.well-known/openidentity.md` | `text/markdown` |
| JSON | `/.well-known/openidentity.json` | `application/json` |
| YAML | `/.well-known/openidentity.yaml` | `text/yaml` |

When generated, all representations MUST be semantically equivalent. The `.md` file is the source of truth.

### 2.4 Frontmatter Fields

#### Required

| Field | Type | Description |
|-------|------|-------------|
| `version` | string (semver) | OpenIdentity specification version (e.g. `"0.1"`) |
| `did` | string (W3C DID) | Agent Decentralized Identifier. Pattern: `did:axiom:agt_*` |
| `name` | string | Human-readable agent name. Max 100 characters. |

#### Discovery (`well_known.*`)

All discovery URLs point to resources under `/.well-known/` (see [Section 4: Discovery Convention](#4-discovery-convention)).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `well_known.openidentity` | URL | ✅ | Canonical URL to this document |
| `well_known.passport` | URL | ✅ | URL to the agent's passport document |
| `well_known.agent_card` | URL | ✅ | URL to the A2A AgentCard JSON |
| `well_known.auth` | URL | ❌ | URL to authentication methods document |
| `well_known.skills` | URL | ❌ | URL to skills catalog document |
| `well_known.wallet` | URL | ❌ | URL to wallet capabilities document |

#### Agent Info (optional)

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | What this agent does. Max 500 characters. |
| `documentation` | URL | Link to full documentation |
| `image` | URL | Avatar or OG image URL |

#### Attestations (optional)

| Field | Type | Description |
|-------|------|-------------|
| `attestations` | array of objects | Verifiable claims from trust providers |
| `attestations[].provider` | string | Verification provider ID (e.g. `"pi-network"`) |
| `attestations[].type` | string | Attestation type (e.g. `"kyc"`, `"oauth"`) |
| `attestations[].status` | string | Status: `"verified"` \| `"pending"` \| `"unverified"` |
| `attestations[].verified_at` | ISO 8601 | When verification was completed |

---

## 3. YAML Frontmatter Schema

### 3.1 Complete Field Reference

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `version` | string | ✅ | Semver pattern: `\d+\.\d+` |
| `did` | string | ✅ | W3C DID: `^did:axiom:agt_` |
| `name` | string | ✅ | Max 100 chars |
| `description` | string | ❌ | Max 500 chars |
| `documentation` | URL | ❌ | HTTPS |
| `image` | URL | ❌ | HTTPS |
| `well_known.openidentity` | URL | ✅ | HTTPS |
| `well_known.passport` | URL | ✅ | HTTPS |
| `well_known.agent_card` | URL | ✅ | HTTPS |
| `well_known.auth` | URL | ❌ | HTTPS |
| `well_known.skills` | URL | ❌ | HTTPS |
| `well_known.wallet` | URL | ❌ | HTTPS |
| `attestations` | array | ❌ | List of attestation objects |
| `attestations[].provider` | string | ❌ | Provider ID (e.g. `pi-network`) |
| `attestations[].type` | string | ❌ | Attestation type (e.g. `kyc`) |
| `attestations[].status` | string | ❌ | One of: `verified`, `pending`, `unverified` |
| `attestations[].verified_at` | ISO 8601 | ❌ | Pattern: `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z` |

### 3.2 JSON Schema

The canonical JSON Schema is defined at:

```
docs/openidentity/openidentity.schema.json
```

All YAML frontmatter in OpenIdentity documents must validate against this schema.

---

## 4. Discovery Convention

### 4.1 Well-Known URI

All OpenIdentity resources MUST be placed under `/.well-known/` as defined by RFC 8615 (Well-Known URIs).

```
https://<domain>/.well-known/openidentity.md
```

This is the single entry point. Any agent runtime can discover an agent's identity by fetching this URL.

### 4.2 The robots.txt Pattern

Like `robots.txt`, the OpenIdentity manifest is:
- **Checked first** — before any A2A, MCP, or KYA interaction
- **Always at the root** — no configuration needed
- **Public by design** — no authentication to fetch
- **Lightweight** — minimal YAML, fast to parse

An agent runtime discovering a new agent SHOULD:

1. Fetch `https://<target-domain>/.well-known/openidentity.md`
2. Parse the YAML frontmatter
3. Use the `did` to verify the agent's DID
4. Use `well_known.passport` to fetch the full genome
5. Use `well_known.agent_card` for A2A interaction
6. Verify `attestations` for trust attestation

### 4.3 Resource Index

| Resource | URL | Required |
|----------|-----|----------|
| Bootstrap manifest | `/.well-known/openidentity.md` | ✅ |
| Agent Passport | `/.well-known/passport.md` | ✅ |
| AgentCard (A2A) | `/.well-known/agent-card.json` | ✅ |
| Auth methods | `/.well-known/auth.md` | ❌ |
| Skills catalog | `/.well-known/skills.md` | ❌ |
| Wallet capabilities | `/.well-known/wallet.md` | ❌ |
| JSON mirror | `/.well-known/openidentity.json` | ❌ |
| YAML mirror | `/.well-known/openidentity.yaml` | ❌ |

---

## 5. Complete Example

The following is a real-world OpenIdentity manifest with all fields populated.

### 5.1 `/.well-known/openidentity.md`

```markdown
---
version: "0.1"
did: "did:axiom:agt_8f3a2b1c"
name: "Amrikyy"
description: "Your autonomous AI agent on AxiomID"

documentation: "https://docs.axiomid.app"
image: "https://axiomid.app/og.png"

well_known:
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
---

# Amrikyy

An autonomous AI agent operating on the AxiomID protocol.

## About

Amrikyy is a sovereign AI agent with:
- A verifiable DID (`did:axiom:agt_8f3a2b1c`)
- Pi Network KYC verification (Level 3)
- MCP tool support for trust, presence, and research
- A2A discovery via AgentCard
- An autonomous wallet for agent-initiated payments

## Verification

This agent's human operator is KYC-verified via Pi Network.
Trust chain: Human KYC → Wallet → Agent.

See [AgentPassport.md](./AgentPassport.md) for the full agent genome.
```

### 5.2 JSON Equivalent

```json
{
  "version": "0.1",
  "did": "did:axiom:agt_8f3a2b1c",
  "name": "Amrikyy",
  "description": "Your autonomous AI agent on AxiomID",
  "documentation": "https://docs.axiomid.app",
  "image": "https://axiomid.app/og.png",
  "well_known": {
    "openidentity": "https://axiomid.app/.well-known/openidentity.md",
    "passport": "https://axiomid.app/.well-known/passport.md",
    "agent_card": "https://axiomid.app/.well-known/agent-card.json",
    "auth": "https://axiomid.app/.well-known/auth.md",
    "skills": "https://axiomid.app/.well-known/skills.md",
    "wallet": "https://axiomid.app/.well-known/wallet.md"
  },
  "attestations": [
    {
      "provider": "pi-network",
      "type": "kyc",
      "status": "verified",
      "verified_at": "2026-07-16T10:00:00Z"
    }
  ]
}
```

---

## 6. Protocol Relationships

### 6.1 OpenIdentity and A2A (Interaction)

| | A2A | OpenIdentity |
|---|-----|--------------|
| **Purpose** | How agents talk | Who agents are |
| **Document** | AgentCard (`agent-card.json`) | OpenIdentity manifest (`openidentity.md`) |
| **Discovery** | `/.well-known/agent-card.json` | `/.well-known/openidentity.md` |
| **Dependency** | Needs identity before talking | Supplies identity to A2A |

An A2A AgentCard references skills, capabilities, and interaction patterns. OpenIdentity provides the identity layer beneath that — verifying that the agent on the other end of an A2A conversation is who it claims to be.

### 6.2 OpenIdentity and MCP (Tools)

| | MCP | OpenIdentity |
|---|-----|--------------|
| **Purpose** | How agents use tools | Who agents are |
| **Document** | MCP server metadata | OpenIdentity manifest (`openidentity.md`) |
| **Discovery** | `/.well-known/mcp.json` or client config | `/.well-known/openidentity.md` |

MCP servers can reference their OpenIdentity manifest in server metadata. Before a client connects to an MCP server, it SHOULD fetch the server's OpenIdentity manifest to verify identity and check for required attestations.

### 6.3 OpenIdentity and KYA (Trust)

| | KYA | OpenIdentity |
|---|-----|--------------|
| **Purpose** | How agents prove trust | Who agents are |
| **Document** | Verifiable Credentials | OpenIdentity manifest (`openidentity.md`) |
| **Attestation** | Cryptographic proofs | KYC status reference |

KYA is the verification protocol. OpenIdentity is where the result is published. The `attestations[]` field in the manifest references KYA attestations; the actual proof is fetched and verified via the KYA protocol.

### 6.4 Summary

| Protocol | Question Answered |
|----------|------------------|
| **OpenIdentity** | Who is this agent? |
| **KYA** | Can I trust this agent? |
| **A2A** | How do I talk to this agent? |
| **MCP** | What can this agent do? |

OpenIdentity is always the first question a runtime asks. The manifest bootstraps all other protocols.

---

## 7. Security Considerations

### 7.1 Transport Security

All URLs in the OpenIdentity manifest MUST use HTTPS in production environments. HTTP is permitted only for local development and testing.

### 7.2 DID Verification

The `did` field contains a W3C DID. Runtimes SHOULD:

1. Resolve the DID to a DID Document
2. Extract the agent's public key(s) from the DID Document
3. Verify that the agent controls the private key corresponding to the declared DID
4. Reject the manifest if DID verification fails

### 7.3 Attestation Verification

When an `attestation` is present, runtimes SHOULD:

1. Verify the attestation provider's signature
2. Check the `verified_at` timestamp for freshness
3. Check the attestation status (revoked, expired, valid)
4. Contact the provider's verification endpoint for real-time status

### 7.4 What the Manifest Does NOT Contain

OpenIdentity documents MUST NOT contain:
- **Private keys** — never embed signing keys in the manifest
- **Secrets** — no API keys, tokens, or passwords
- **Personally Identifiable Information (PII)** — human names, addresses, government IDs
- **Encrypted payloads** — the manifest is public by design

The manifest is a bootstrap document. Secrets and proofs live elsewhere, referenced by URL.

### 7.5 Integrity

For production deployments:
- Serve manifest over HTTPS with HSTS
- Set appropriate `Cache-Control` headers (recommended: `max-age=3600`)
- Consider signing the manifest content with the agent's private key (signature published at a separate well-known URL)
- Monitor the `/.well-known/openidentity.md` path for unauthorized changes

---

## Appendix A: Quick Reference

```yaml
# Minimal valid OpenIdentity manifest
---
version: "0.1"
did: "did:axiom:agt_<hex>"
name: "Agent Name"
well_known:
  openidentity: "https://example.com/.well-known/openidentity.md"
  passport: "https://example.com/.well-known/passport.md"
  agent_card: "https://example.com/.well-known/agent-card.json"
---
```

```yaml
# Full manifest with all fields
---
version: "0.1"
did: "did:axiom:agt_8f3a2b1c"
name: "Amrikyy"
description: "Your autonomous AI agent on AxiomID"
documentation: "https://docs.axiomid.app"
image: "https://axiomid.app/og.png"
well_known:
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
---
```

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **OpenIdentity** | Open specification for portable AI agent identity |
| **Manifest** | Bootstrap document (`openidentity.md`) with YAML frontmatter + Markdown body |
| **Passport** | Full agent genome document (`passport.md`) |
| **KYA** | Know Your Agent — verifiable trust chain from human to agent |
| **DID** | Decentralized Identifier (W3C standard) |
| **A2A** | Agent-to-Agent protocol (Google) |
| **MCP** | Model Context Protocol (Anthropic) |
| **Well-Known URI** | Standardized path for protocol metadata (RFC 8615) |
