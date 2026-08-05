---
title: Architecture
order: 2
section: getting-started
---

# Architecture Overview

OpenIdentity sits at the identity layer of the AI protocol stack:

| Protocol | Layer | Purpose |
|----------|-------|---------|
| A2A | Interaction | How agents talk |
| MCP | Capability | How agents use tools |
| OpenIdentity | Identity | Who agents are |
| KYA | Trust | How agents prove |

## Protocol Stack

OpenIdentity provides the identity foundation that enables agents to prove who they are across runtimes. It sits between the communication layer (A2A) and the trust layer (KYA), giving agents a portable identity that works with any capability system (MCP).

## Key Principles

- **Decentralized Identifiers (DIDs):** Every agent gets a W3C-compliant DID that is self-sovereign and portable
- **Verifiable Credentials:** All identity claims are cryptographically signed and independently verifiable
- **Event-Driven Architecture:** Identity mutations are event-sourced, providing a complete audit trail
- **Platform Agnostic:** The same identity works on Cloudflare Workers, Node.js, or any other runtime
