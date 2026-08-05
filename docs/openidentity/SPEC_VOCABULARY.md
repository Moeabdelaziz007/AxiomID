# OpenIdentity Shared Vocabulary

> Version: 0.1
> Generated: 2026-07-17
> This document defines the shared terms used across all OpenIdentity specs.
> Every spec in this directory MUST use these definitions consistently.

## Core Concepts

### Agent Identity
A portable, verifiable identity document that describes an AI agent. Composed of:
- **Manifest** (`openidentity.md`) — Bootstrap document with YAML frontmatter (machine) + Markdown body (human)
- **Passport** (`passport.md`) — Full genome document (rich, public, index of resources)
- **KYA** — Know Your Agent: the verification protocol linking agent → human → identity provider

### Discovery
All identity resources live under `/.well-known/` per RFC 8615. Any agent runtime can discover an agent by fetching `/.well-known/openidentity.md`.

### Attestation (replaces "trust score")
A verifiable claim from a trust provider (e.g., Pi Network KYC, GitHub OAuth, DID provider). NOT a score 0-100. Structure:

```yaml
attestations:
  - provider: pi-network
    type: kyc
    status: verified
    verified_at: "2026-07-16T10:00:00Z"
    proof: did:pi:0x1234...abc
```

### Credential
An attestation + metadata that makes it verifiable by third parties. Includes provider signature, expiry, and revocation URL.

## File Format

### Canonical format: Markdown + YAML Frontmatter
- `.md` is the SOURCE OF TRUTH
- YAML frontmatter for machine-readable data (dict, list, scalar)
- Markdown body for human narrative, rationale, examples
- Generated `.json` and `.yaml` mirrors for strict consumers

### Frontmatter Schema (validated by `docs/openidentity/openidentity.schema.json`)

```yaml
---
version: 0.1                        # spec version
id: did:key:z6Mk...                 # agent DID (W3C DID compatible)
name: "My Agent"                    # human-readable name
description: "An AI agent that..."  # what this agent does

# Discovery URLs (all under .well-known)
well_known:
  openidentity: https://example.com/.well-known/openidentity.md
  passport: https://example.com/.well-known/passport.md
  agent_card: https://example.com/.well-known/agent-card.json
  auth: https://example.com/.well-known/auth.md
  skills: https://example.com/.well-known/skills.md
  wallet: https://example.com/.well-known/wallet.md

# Capabilities
capabilities:
  - a2a
  - mcp
  - skills

# Attestations (replaces single kyc object)
attestations:
  - provider: pi-network
    type: kyc
    status: verified
    verified_at: "2026-07-16T10:00:00Z"
```

## Protocol Relationships

| Protocol | Layer | Purpose |
|----------|-------|---------|
| A2A | Interaction | How agents TALK |
| MCP | Capability | How agents USE TOOLS |
| OpenIdentity | Identity | Who agents ARE |
| KYA | Trust | How agents PROVE |

## Resource URL Conventions

All URLs SHOULD be HTTPS. The `/.well-known/` prefix is REQUIRED for all discovery endpoints.

| Resource | URL | Format |
|----------|-----|--------|
| Bootstrap manifest | `/.well-known/openidentity.md` | Markdown + YAML frontmatter |
| Agent Passport | `/.well-known/passport.md` | Markdown + YAML frontmatter |
| AgentCard (A2A) | `/.well-known/agent-card.json` | JSON (A2A v1.0) |
| Auth methods | `/.well-known/auth.md` | Markdown |
| Skills catalog | `/.well-known/skills.md` | Markdown |
| Wallet capabilities | `/.well-known/wallet.md` | Markdown |

## Memory Layers (L0-L4)

Passport INDEXES memory layers (does NOT store them):

| Layer | Name | Storage | Description |
|-------|------|---------|-------------|
| L0 | Identity | OpenIdentity + Passport | Who the agent IS |
| L1 | Working | Upstash Redis | Current session context |
| L2 | Structured | Neon PostgreSQL | Events, transactions |
| L3 | Knowledge | Ghost.build | Vector embeddings, RAG |
| L4 | Archive | R2 / IPFS | Long-term, cold storage |
