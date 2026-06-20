# auth.md Protocol + InteractivePassportCard as Cryptographic Key

**Date:** 2026-06-20
**Author:** AxiomID Engineering
**Status:** Design Approved

## Goal

Make AxiomID a fully auth.md-compliant identity provider with W3C DID resolution, enabling any AI agent in the world to discover, register, and transact autonomously. Transform InteractivePassportCard from a display-only UI into a real cryptographic key management interface with signing capabilities.

## Decisions

| Decision | Choice |
|----------|--------|
| Auth.md flows | Both (Agent Verified + User Claimed) |
| DID resolution | Full W3C DID Document |
| Passport card | Dashboard + signing |
| Identity provider | Pi Network only |
| Build order | Ship MVP first, then auth.md |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    AGENT DISCOVERY                       │
│  Agent fetches https://axiomid.app/auth.md              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  TWO REGISTRATION PATHS                  │
│  ┌──────────────────┐     ┌──────────────────────┐      │
│  │  AGENT VERIFIED   │     │   USER CLAIMED        │     │
│  │  (Pi ID-JAG)      │     │   (Claim Ceremony)    │     │
│  └────────┬──────────┘     └──────────┬────────────┘    │
│           ▼                           ▼                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │              AXIOMID IDENTITY LAYER               │   │
│  │  DID Document (W3C)  ←→  JWKS Endpoint            │   │
│  │  Key Derivation      ←→  Token Exchange            │   │
│  │  Scope Management    ←→  Revocation                │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │         INTERACTIVE PASSPORT CARD                  │   │
│  │  • DID display + verification badge                │   │
│  │  • Public key fingerprint                          │   │
│  │  • Active sessions list                            │   │
│  │  • Sign payloads with DID key                      │   │
│  │  • Revoke sessions                                 │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## New Files (15)

```
src/app/.well-known/jwks.json/route.ts
src/app/.well-known/oauth-protected-resource/route.ts
src/app/.well-known/oauth-authorization-server/route.ts
src/app/auth.md/route.ts
src/app/api/agent/identity/route.ts
src/app/api/agent/identity/claim/route.ts
src/app/api/oauth2/token/route.ts
src/app/api/oauth2/revoke/route.ts
src/lib/did-document.ts
src/lib/jwks.ts
src/lib/claim-ceremony.ts
src/lib/scopes.ts
src/components/ui/PassportKeyManager.tsx
src/components/ui/ClaimCeremony.tsx
src/types/auth-md.ts
```

## Modified Files (5)

```
src/app/api/passport/[slug]/route.ts
src/components/ui/InteractivePassportCard.tsx
src/lib/did.ts
src/lib/sovereign-keys.ts
src/app/api/auth/pi/route.ts
```

## DID Resolution Layer

### W3C DID Document

Every AxiomID user gets a W3C-compliant DID Document:

```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:axiom:axiomid.app:pi:abc123",
  "verificationMethod": [{
    "id": "did:axiom:axiomid.app:pi:abc123#key-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:axiom:axiomid.app:pi:abc123",
    "publicKeyMultibase": "z6Mk..."
  }],
  "authentication": ["#key-1"],
  "assertionMethod": ["#key-1"]
}
```

### Key Generation

- **User root key:** `deriveSovereignAgentKeypair(piUid, "axiom-root")` — Ed25519, deterministic from Pi UID + SOVEREIGN_KEY_SALT
- **Agent key:** `deriveSovereignAgentKeypair(stellarAddress, agentId)` — existing pattern, unchanged
- **JWKS export:** Both public keys served at `/.well-known/jwks.json` in JWK format

### Resolution Endpoints

| Endpoint | Returns |
|----------|---------|
| `GET /api/did/{did}` | Full DID Document |
| `GET /.well-known/jwks.json` | Public keys in JWK format |

## auth.md Server Endpoints

### Discovery

**`GET /auth.md`** — Serves the auth.md Markdown file that tells agents how to register.

**`GET /.well-known/oauth-protected-resource`** — PRM (Protected Resource Metadata) per RFC 9728.

**`GET /.well-known/oauth-authorization-server`** — AS metadata with `agent_auth` block describing both flows.

### Registration

**`POST /api/agent/identity`**

Request (Agent Verified):
```json
{
  "type": "identity_assertion",
  "assertion": "<Pi-ID-JAG-JWT>"
}
```

Request (User Claimed — anonymous):
```json
{
  "type": "anonymous"
}
```

Response (Agent Verified):
```json
{
  "identity_assertion": "<AxiomID-signed-JWT>",
  "scopes": ["api.read", "api.write"]
}
```

Response (User Claimed):
```json
{
  "claim_token": "tok_abc123",
  "claim": {
    "user_code": "AXIO-7K3M",
    "verification_uri": "https://axiomid.app/claim",
    "expires_in": 600
  }
}
```

### Claim Ceremony

**`POST /api/agent/identity/claim`**

Starts or refreshes a claim ceremony. Returns `user_code` and `verification_uri`.

### Token Exchange

**`POST /api/oauth2/token`**

Grant types:
- `urn:ietf:params:oauth:grant-type:jwt-bearer` — exchange identity_assertion for access_token
- `claim` — poll claim status; returns access_token on user confirmation

### Revocation

**`POST /api/oauth2/revoke`**

Invalidates an access token. Returns 200 on success.

### Signing

**`POST /api/agent/sign`**

Signs a payload with the user's DID key. Server-side only (private key never leaves server).

Request:
```json
{
  "payload": "text to sign",
  "did": "did:axiom:axiomid.app:pi:abc123"
}
```

Response:
```json
{
  "signature": "0x3a8f...",
  "did": "did:axiom:axiomid.app:pi:abc123",
  "keyVersion": 1
}
```

## InteractivePassportCard Key Management

The card gains three new sections below the existing passport display:

### Key Management Section
- DID display (truncated, copyable)
- Public key fingerprint (truncated)
- Key creation date
- "View DID Document" link
- "Copy DID" button

### Sign Section
- Text input for payload
- "Sign with DID key" button
- Calls `POST /api/agent/sign` (server-side signing)
- Displays signature + "Verify" button

### Active Sessions Section
- List of agent sessions with last-seen timestamps
- "Revoke all" button

## Security Model

### Trust Boundaries
- Private keys are **never stored** — derived deterministically via HMAC-SHA256
- ID-JAGs verified against Pi Network's JWKS (cached 1h)
- All tokens short-lived (1h) with refresh via identity_assertion
- Claim tokens expire in 10 minutes
- Rate limiting on all auth endpoints

### Key Rotation
- New `keyVersion` field on DID Document
- Rotation = increment version + derive new keypair
- Old keys remain in JWKS for 24h grace period

### Revocation
- `POST /oauth2/revoke` invalidates token immediately
- Revoked tokens stored in a Set
- SSE event `agent.revoked` pushed to affected agents

## Data Flow: Agent Verified

```
1. Agent → GET axiomid.app/auth.md
2. Agent → POST /api/agent/identity { type: "identity_assertion", assertion: "<ID-JAG>" }
3. Server: verify JWT against Pi JWKS, JIT-provision user
4. Server → 200 { identity_assertion, scopes }
5. Agent → POST /api/oauth2/token { grant_type: "jwt-bearer", assertion: "<identity_assertion>" }
6. Server → 200 { access_token, expires_in: 3600 }
7. Agent → API calls with Bearer token
```

## Data Flow: User Claimed

```
1. Agent → POST /api/agent/identity { type: "anonymous" }
2. Server → 200 { claim_token, claim: { user_code, verification_uri, expires_in } }
3. Agent → User: "Go to axiomid.app/claim, enter code"
4. User → confirms on website
5. Agent → POST /api/oauth2/token { grant_type: "claim", claim_token } (poll)
6. Server → 200 { access_token, identity_assertion, scopes }
```

## Testing Strategy

- Unit tests for DID Document generation
- Unit tests for JWKS export
- Integration tests for Agent Verified flow (mock Pi JWKS)
- Integration tests for User Claimed flow (mock claim ceremony)
- Unit tests for token exchange and revocation
- Unit tests for PassportKeyManager component
- Unit tests for ClaimCeremony component
- E2E test: full registration flow from auth.md discovery to API call
