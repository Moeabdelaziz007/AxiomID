# AxiomID Product Specification

**Version:** 2.0  
**Last Updated:** 2026-08-06  
**Status:** Active Development

---

## Product Overview

**AxiomID** is the **Identity Layer** for the Pi Network Agent Economy — a sovereign identity protocol enabling humans and autonomous agents to establish cryptographically verified, portable, and trust-minimized identities.

> "Your Identity. Your Rules."

---

## Core Value Proposition

| Problem | AxiomID Solution |
|---------|------------------|
| Siloed Web2 identities owned by platforms | W3C DIDs you own and control |
| Repeated KYC for every app | Verify once (KYA), prove everywhere |
| Easy identity spoofing | Cryptographic Trust Score on-chain |
| AI agents can't prove authority | Agent-native delegation with cryptographic attestation |
| No payment integration | Native Pi Network payments |

---

## Product Architecture

### Five-Layer Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT LAYER                               │
│  Autonomous agents with sovereign keys, Pi wallets, skills  │
├─────────────────────────────────────────────────────────────┤
│                   PAYMENT LAYER                              │
│  Pi Network native payments, 70/30 revenue split, escrow    │
├─────────────────────────────────────────────────────────────┤
│                 MARKETPLACE LAYER                            │
│  Skills, capabilities, services — discoverable & monetizable │
├─────────────────────────────────────────────────────────────┤
│                   TRUST LAYER                                │
│  Trust Score, social credentials, verification stamps       │
├─────────────────────────────────────────────────────────────┤
│                  IDENTITY LAYER                              │
│  W3C DID, Passport, KYA/KYC, sovereign key management       │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Sovereign Identity (Identity Layer)
- **W3C DID (`did:axiom`)** — Portable, standards-compliant identifiers
- **Agent Passport** — `passport.jsonld` with verifiable credentials
- **KYA (Know Your Agent)** — Social verification + on-chain trust
- **KYC Integration** — Pi Network identity verification

### 2. Trust & Reputation (Trust Layer)
- **Trust Score (0-100)** — Multi-factor: social, on-chain, activity
- **Identity Stamps** — Cryptographic proofs of achievements
- **Federated Trust Graphs** — Cross-protocol reputation
- **Slashing & Staking** — Economic security for agents

### 3. Skills Marketplace (Marketplace Layer)
- **Capability Packs** — Modular agent skills (Cloudflare, Pi SDK, etc.)
- **Provider Adapters** — Runtime-agnostic execution
- **Revenue Sharing** — 70/30 split on Mainnet
- **Discovery Protocol** — ADP-based agent discovery

### 4. Native Payments (Payment Layer)
- **Pi Network Native** — No bridging, no wrapped tokens
- **Testnet: 100% to developer** — Full revenue during development
- **Mainnet: 70/30 split** — 70% developer, 30% Pi Network
- **Escrow & Dispute Resolution** — Built-in protection

### 5. Agent Runtime (Agent Layer)
- **DDD Orchestration Engine** — Domain-driven execution
- **Event-Sourced Pipeline** — `IdentityCreated → DomainReserved → PassportIssued → RuntimeProvisioned`
- **Multi-Agent Delegation** — Hierarchical agent teams
- **Sandbox Environment** — Safe testing with mock data

---

## User Journeys

### Human User (Pioneer)
```
Connect Wallet → Complete KYA → Get Trust Score → Claim Stamps → Deploy Agents
```

### Agent Developer
```
Create Agent → Configure Capabilities → Publish to Marketplace → Earn Revenue
```

### Enterprise / Platform
```
Integrate AxiomID SDK → Verify Users/Agents → Accept Pi Payments → Access Trust Data
```

---

## Revenue Model

### App Revenue Dashboard

**Wallet Address:** `GCLXRHXZT44XQEQWIIWLAZOR2NYFWPYSKMUPFXVXPP4UENH2SMWJ2X36`

| Environment | Revenue Share | Notes |
|-------------|---------------|-------|
| **Testnet** | **100% to Developer** | Full revenue during development |
| **Mainnet** | **70% Developer / 30% Pi Network** | Platform fee for App Studio |

### Transaction History
View complete transaction history and real-time balance on the **Pi Network Block Explorer**.

---

## Technical Specifications

### Standards Compliance
- **W3C DID Core 1.0** — `did:axiom` method
- **W3C Verifiable Credentials** — Passport format
- **DIDComm v2** — Secure agent communication
- **Pi SDK** — Native Pi Network integration

### Security Model
- **Ed25519** — Sovereign key derivation
- **HMAC-SHA256** — SOVEREIGN_KEY_SALT protected
- **ZKP-Ready** — Privacy-preserving credentials
- **Append-only TrustChain** — Tamper-evident audit log

### Performance Targets
- **Page Load:** < 50ms (Turbopack optimized)
- **API Latency:** < 200ms p95
- **Trust Score Update:** < 5s propagation
- **Payment Settlement:** Instant (Pi Network)

---

## Competitive Landscape

| Feature | Web2 Identity | DID Solutions | **AxiomID** |
|---------|--------------|---------------|-------------|
| Ownership | Platform | User | **User + Agent** |
| AI Agent Support | ❌ | Limited | **Native** |
| Payments | Stripe/etc | Crypto | **Pi Native** |
| Trust Score | Centralized | Reputation | **On-chain + Social** |
| Marketplace | App Stores | N/A | **Skills + Services** |
| Testnet Revenue | N/A | N/A | **100%** |

---

## Roadmap

### Phase 1: Foundation ✅
- [x] W3C DID + Passport
- [x] KYA/KYC flow
- [x] Trust Score engine
- [x] Pi SDK integration

### Phase 2: Marketplace 🚧
- [ ] Skills registry
- [ ] Capability packs
- [ ] Revenue dashboard
- [ ] 70/30 payment split

### Phase 3: Network Effects 📋
- [ ] Federated trust graphs
- [ ] Cross-chain DID anchoring
- [ ] Multi-agent delegation
- [ ] Cloudflare Workflows generation

### Phase 4: Platform 📋
- [ ] Enterprise SDK
- [ ] White-label passport
- [ ] Compliance tooling
- [ ] Global CDN edge

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Registered Identities | 100,000+ | ~2,500 |
| Active Agents | 10,000+ | ~500 |
| Trust Score Avg | > 85 | 78 |
| Mainnet Revenue | $1M+/mo | $0 (Testnet) |
| Verification Rate | > 90% | 82% |

---

## Design System Reference

See **[DESIGN.md](./DESIGN.md)** for complete visual language, component patterns, and implementation guidelines.

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| `DESIGN.md` | Visual language & component patterns |
| `AGENTS.md` | Engineering constitution & SOUL protocol |
| `ARCHITECTURE.md` | System architecture & data flows |
| `CHANGELOG.md` | Version history |

---

*AxiomID — The Human Authorization Protocol for the Agent Economy.*