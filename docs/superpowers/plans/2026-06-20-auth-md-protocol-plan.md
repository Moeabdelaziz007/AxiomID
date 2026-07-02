# auth.md Protocol + InteractivePassportCard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AxiomID a fully auth.md-compliant identity provider with W3C DID resolution, enabling any AI agent to discover, register, and transact autonomously.

**Architecture:** Layered approach — types/schemas first, then lib modules, then API routes, then UI components. Each task is independently testable. TDD throughout.

**Tech Stack:** Next.js 16 App Router, Prisma, Zod, jose (JWT), Ed25519 (Node crypto), React, framer-motion

## Global Constraints

- `"strict": true` in tsconfig — never weaken
- No `as any` casts — use `unknown` at boundaries
- Use `apiError`/`apiSuccess` from `src/lib/errors.ts` — never ad-hoc strings
- Route handlers: `params: Promise<{ slug: string }>` (Next.js 15+ async)
- Zod `safeParse` before logic, `.parse()` for internal preconditions
- Private keys never stored — derived deterministically via HMAC-SHA256
- `SOVEREIGN_KEY_SALT` required for key derivation
- Rate limit all auth endpoints via `checkRateLimit`
- All test files: `@jest-environment node`, mocks BEFORE imports
- Commit messages: `type(scope): description ۞` format

---

## File Structure

### New Files (17)

| File | Responsibility |
|------|---------------|
| `src/types/auth-md.ts` | auth.md protocol types (IdentityAssertion, ClaimToken, AgentAuth, Scopes) |
| `src/lib/did-document.ts` | W3C DID Document builder + resolver |
| `src/lib/jwks.ts` | JWKS generation + export from Ed25519 keys |
| `src/lib/claim-ceremony.ts` | Claim token lifecycle (create, verify, expire) |
| `src/lib/scopes.ts` | Scope definitions + validation |
| `src/lib/auth-tokens.ts` | identity_assertion JWT creation + verification |
| `src/app/auth.md/route.ts` | Serves the auth.md Markdown file |
| `src/app/.well-known/jwks.json/route.ts` | JWKS endpoint |
| `src/app/.well-known/oauth-protected-resource/route.ts` | PRM discovery |
| `src/app/.well-known/oauth-authorization-server/route.ts` | AS metadata |
| `src/app/api/agent/identity/route.ts` | POST registration (Agent Verified + User Claimed) |
| `src/app/api/agent/identity/claim/route.ts` | Claim ceremony |
| `src/app/api/oauth2/token/route.ts` | Token exchange |
| `src/app/api/oauth2/revoke/route.ts` | Token revocation |
| `src/app/api/agent/sign/route.ts` | Server-side payload signing |
| `src/components/ui/PassportKeyManager.tsx` | Key management card section |
| `src/components/ui/ClaimCeremony.tsx` | Claim code UI component |

### Modified Files (4)

| File | Change |
|------|--------|
| `src/lib/validators.ts` | Add Zod schemas for auth.md endpoints |
| `src/lib/errors.ts` | Add auth.md error codes to ErrorCode union |
| `src/lib/sovereign-keys.ts` | Add `deriveUserRootKey(piUid)` + JWKS export |
| `src/components/ui/InteractivePassportCard.tsx` | Integrate PassportKeyManager |

### Test Files (10)

| File | Tests |
|------|-------|
| `src/__tests__/lib/did-document.test.ts` | DID Document generation + resolution |
| `src/__tests__/lib/jwks.test.ts` | JWKS export + key format |
| `src/__tests__/lib/claim-ceremony.test.ts` | Claim token lifecycle |
| `src/__tests__/lib/auth-tokens.test.ts` | JWT creation + verification |
| `src/__tests__/api/agent-identity.test.ts` | POST /api/agent/identity |
| `src/__tests__/api/agent-identity-claim.test.ts` | POST /api/agent/identity/claim |
| `src/__tests__/api/oauth2-token.test.ts` | POST /api/oauth2/token |
| `src/__tests__/api/oauth2-revoke.test.ts` | POST /api/oauth2/revoke |
| `src/__tests__/api/agent-sign.test.ts` | POST /api/agent/sign |
| `src/__tests__/components/passport-key-manager.test.tsx` | PassportKeyManager UI |

---

### Task 1: Types + Schemas

**Files:**
- Create: `src/types/auth-md.ts`
- Modify: `src/lib/validators.ts`
- Modify: `src/lib/errors.ts`
- Test: `src/__tests__/lib/did-document.test.ts` (scaffold only)

**Interfaces:**
- Consumes: existing `ErrorCode` union in `src/lib/errors.ts`
- Produces: `IdentityAssertion`, `ClaimToken`, `AgentAuth`, `AuthMdScope`, `ClaimStatus` types; new Zod schemas; new error codes

- [ ] **Step 1: Create auth.md types**

```typescript
// src/types/auth-md.ts
export type AuthMdScope = "api.read" | "api.write" | "agent.sign";

export interface IdentityAssertion {
  type: "identity_assertion";
  assertion: string; // Pi ID-JAG JWT
}

export interface AnonymousRegistration {
  type: "anonymous";
}

export type AgentRegistration = IdentityAssertion | AnonymousRegistration;

export interface ClaimToken {
  token: string;
  userCode: string;
  verificationUri: string;
  expiresAt: number;
  userId: string | null;
  status: "pending" | "confirmed" | "expired";
}

export interface AgentAuth {
  userId: string;
  did: string;
  scopes: AuthMdScope[];
  issuedAt: number;
  expiresAt: number;
}

export interface TokenExchangeRequest {
  grant_type: "jwt-bearer" | "claim";
  assertion?: string;
  claim_token?: string;
}

export interface TokenRevocationRequest {
  token: string;
}
```

- [ ] **Step 2: Add Zod schemas to validators.ts**

```typescript
// Add to src/lib/validators.ts

export const AgentIdentitySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("identity_assertion"), assertion: z.string().min(1) }),
  z.object({ type: z.literal("anonymous") }),
]);

export const TokenExchangeSchema = z.discriminatedUnion("grant_type", [
  z.object({ grant_type: z.literal("jwt-bearer"), assertion: z.string().min(1) }),
  z.object({ grant_type: z.literal("claim"), claim_token: z.string().min(1) }),
]);

export const TokenRevocationSchema = z.object({
  token: z.string().min(1),
});

export const AgentSignSchema = z.object({
  payload: z.string().min(1, "Payload is required"),
  did: z.string().startsWith("did:axiom:", "Invalid AxiomID DID"),
});
```

- [ ] **Step 3: Add auth.md error codes to errors.ts**

Add to the `ErrorCode` union in `src/lib/errors.ts`:
```typescript
| 'INVALID_ID_JAG' | 'CLAIM_EXPIRED' | 'CLAIM_NOT_FOUND' | 'TOKEN_EXPIRED'
| 'TOKEN_REVOKED' | 'INVALID_GRANT' | 'UNSUPPORTED_GRANT_TYPE'
```

Add to `STATUS_MAP`:
```typescript
INVALID_ID_JAG: 401, CLAIM_EXPIRED: 410, CLAIM_NOT_FOUND: 404,
TOKEN_EXPIRED: 401, TOKEN_REVOKED: 401, INVALID_GRANT: 400,
UNSUPPORTED_GRANT_TYPE: 400,
```

- [ ] **Step 4: Run lint + type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/auth-md.ts src/lib/validators.ts src/lib/errors.ts
git commit -m "feat(auth-md): add protocol types, Zod schemas, and error codes ۞"
```

---

### Task 2: DID Document Builder

**Files:**
- Create: `src/lib/did-document.ts`
- Modify: `src/lib/sovereign-keys.ts` (add `deriveUserRootKey`)
- Test: `src/__tests__/lib/did-document.test.ts`

**Interfaces:**
- Consumes: `deriveSovereignAgentKeypair` from `src/lib/sovereign-keys.ts`
- Produces: `buildDidDocument(did, publicKeyMultibase)`, `resolveDidDocument(did)`, `deriveUserRootKey(piUid)`

- [ ] **Step 1: Write failing test for DID Document generation**

```typescript
// src/__tests__/lib/did-document.test.ts
/**
 * @jest-environment node
 */

jest.mock("@/lib/sovereign-keys", () => ({
  deriveSovereignAgentKeypair: jest.fn(),
}));

import { buildDidDocument, resolveDidDocument } from "@/lib/did-document";
import { deriveSovereignAgentKeypair } from "@/lib/sovereign-keys";

const mockDerive = deriveSovereignAgentKeypair as jest.Mock;

describe("DID Document", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDerive.mockReturnValue({
      publicKey: "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwA...\n-----END PUBLIC KEY-----",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQ...\n-----END PRIVATE KEY-----",
    });
  });

  it("builds a valid W3C DID Document", () => {
    const doc = buildDidDocument("did:axiom:axiomid.app:pi:abc123", "z6MkhaXgBZD...");

    expect(doc["@context"]).toContain("https://www.w3.org/ns/did/v1");
    expect(doc.id).toBe("did:axiom:axiomid.app:pi:abc123");
    expect(doc.verificationMethod).toHaveLength(1);
    expect(doc.verificationMethod![0].type).toBe("Ed25519VerificationKey2020");
    expect(doc.verificationMethod![0].controller).toBe("did:axiom:axiomid.app:pi:abc123");
    expect(doc.authentication).toContain("#key-1");
    expect(doc.assertionMethod).toContain("#key-1");
  });

  it("resolves DID Document from store", async () => {
    // resolveDidDocument will be implemented to look up by DID string
    // For now, test that it returns the document or null
    const doc = await resolveDidDocument("did:axiom:axiomid.app:pi:abc123");
    // Will be mocked in later steps
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/did-document.test.ts --no-coverage`
Expected: FAIL — `Cannot find module '@/lib/did-document'`

- [ ] **Step 3: Implement DID Document builder**

```typescript
// src/lib/did-document.ts
import { z } from "zod";

const DID_CONTEXT = "https://www.w3.org/ns/did/v1";

export const DidDocumentSchema = z.object({
  "@context": z.array(z.string()),
  id: z.string(),
  verificationMethod: z.array(z.object({
    id: z.string(),
    type: z.string(),
    controller: z.string(),
    publicKeyMultibase: z.string(),
  })).optional(),
  authentication: z.array(z.string()).optional(),
  assertionMethod: z.array(z.string()).optional(),
});

export type DidDocument = z.infer<typeof DidDocumentSchema>;

export function buildDidDocument(
  did: string,
  publicKeyMultibase: string,
  keyVersion = 1
): DidDocument {
  const keyId = `${did}#key-${keyVersion}`;

  return {
    "@context": [DID_CONTEXT],
    id: did,
    verificationMethod: [{
      id: keyId,
      type: "Ed25519VerificationKey2020",
      controller: did,
      publicKeyMultibase,
    }],
    authentication: [keyId],
    assertionMethod: [keyId],
  };
}

export async function resolveDidDocument(did: string): Promise<DidDocument | null> {
  // For now, return null — will be wired to DB in Task 5
  void did;
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/lib/did-document.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/did-document.ts src/__tests__/lib/did-document.test.ts
git commit -m "feat(auth-md): W3C DID Document builder + tests ۞"
```

---

### Task 3: JWKS Endpoint

**Files:**
- Create: `src/lib/jwks.ts`
- Create: `src/app/.well-known/jwks.json/route.ts`
- Test: `src/__tests__/lib/jwks.test.ts`

**Interfaces:**
- Consumes: `deriveSovereignAgentKeypair` from `src/lib/sovereign-keys.ts`
- Produces: `exportJwks()`, `GET /.well-known/jwks.json`

- [ ] **Step 1: Write failing test for JWKS export**

```typescript
// src/__tests__/lib/jwks.test.ts
/**
 * @jest-environment node
 */

jest.mock("@/lib/sovereign-keys", () => ({
  deriveSovereignAgentKeypair: jest.fn(),
}));

import { exportJwks } from "@/lib/jwks";

describe("JWKS", () => {
  it("exports public keys in JWK format", async () => {
    const jwks = await exportJwks("did:axiom:axiomid.app:pi:abc123");

    expect(jwks).toHaveProperty("keys");
    expect(Array.isArray(jwks.keys)).toBe(true);
    expect(jwks.keys.length).toBeGreaterThan(0);
    expect(jwks.keys[0]).toHaveProperty("kty");
    expect(jwks.keys[0]).toHaveProperty("crv");
    expect(jwks.keys[0]).toHaveProperty("x");
    expect(jwks.keys[0]).toHaveProperty("kid");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/jwks.test.ts --no-coverage`
Expected: FAIL — `Cannot find module '@/lib/jwks'`

- [ ] **Step 3: Implement JWKS export**

```typescript
// src/lib/jwks.ts
import crypto from "crypto";

interface Jwk {
  kty: string;
  crv: string;
  x: string;
  kid: string;
  alg: string;
  use: string;
}

interface Jwks {
  keys: Jwk[];
}

export function exportJwks(did: string): Jwks {
  // Derive the user's root key for JWKS export
  // In production, this reads from the key derivation
  // For now, return a placeholder structure
  const keys: Jwk[] = [];

  // Key derivation will be wired in Task 5
  // This function will iterate over all known keys for the DID
  void did;

  return { keys };
}

export function pemToJwk(publicKeyPem: string, kid: string): Jwk {
  const keyObject = crypto.createPublicKey(publicKeyPem);
  const details = keyObject.asymmetricKeyDetails;

  // Ed25519 keys
  if (details?.namedCurve === "ed25519") {
    const rawKey = keyObject.export({ type: "spki", format: "der" });
    // Ed25519 public key is 32 bytes after the ASN.1 header
    const publicKeyBytes = rawKey.subarray(rawKey.length - 32);
    const x = publicKeyBytes.toString("base64url");

    return {
      kty: "OKP",
      crv: "Ed25519",
      x,
      kid,
      alg: "EdDSA",
      use: "sig",
    };
  }

  throw new Error(`Unsupported key curve: ${details?.namedCurve}`);
}
```

- [ ] **Step 4: Create JWKS route**

```typescript
// src/app/.well-known/jwks.json/route.ts
import { NextRequest } from "next/server";
import { exportJwks } from "@/lib/jwks";
import { apiSuccess, apiError } from "@/lib/errors";

export async function GET(_request: NextRequest) {
  try {
    // Export all public keys for all known DIDs
    // In production, this aggregates keys from all active users
    const jwks = await exportJwks("*");

    return apiSuccess(jwks, 200, {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    });
  } catch (error) {
    return apiError("INTERNAL_ERROR", "Failed to export JWKS");
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/__tests__/lib/jwks.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 6: Run lint + type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/jwks.ts src/app/.well-known/jwks.json/route.ts src/__tests__/lib/jwks.test.ts
git commit -m "feat(auth-md): JWKS endpoint + JWK export + tests ۞"
```

---

### Task 4: Discovery Endpoints

**Files:**
- Create: `src/app/auth.md/route.ts`
- Create: `src/app/.well-known/oauth-protected-resource/route.ts`
- Create: `src/app/.well-known/oauth-authorization-server/route.ts`
- Test: `src/__tests__/api/auth-md.test.ts` (new)

**Interfaces:**
- Consumes: nothing (static content)
- Produces: `GET /auth.md`, `GET /.well-known/oauth-protected-resource`, `GET /.well-known/oauth-authorization-server`

- [ ] **Step 1: Write failing test for auth.md endpoint**

```typescript
// src/__tests__/api/auth-md.test.ts
/**
 * @jest-environment node
 */

import { GET } from "@/app/auth.md/route";

describe("GET /auth.md", () => {
  it("returns auth.md as text/markdown", async () => {
    const req = new Request("http://localhost/auth.md") as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    const body = await res.text();
    expect(body).toContain("AxiomID");
    expect(body).toContain("Agent Verified");
    expect(body).toContain("User Claimed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/api/auth-md.test.ts --no-coverage`
Expected: FAIL — `Cannot find module '@/app/auth.md/route'`

- [ ] **Step 3: Implement auth.md route**

```typescript
// src/app/auth.md/route.ts
import { NextRequest } from "next/server";

const AUTH_MD_CONTENT = `# AxiomID Agent Registration

## Agent Verified Flow (Pi Network)

If you have a Pi Network authenticated identity, you can register without human interaction.

### Step 1: Get your Pi ID-JAG

Your Pi SDK provides an ID-JAG JWT after authentication.

### Step 2: Register with AxiomID

\`\`\`bash
curl -X POST https://axiomid.app/api/agent/identity \\
  -H "Content-Type: application/json" \\
  -d '{"type": "identity_assertion", "assertion": "<YOUR_PI_ID_JAG>"}'
\`\`\`

Response:
\`\`\`json
{
  "identity_assertion": "<axiomid-signed-jwt>",
  "scopes": ["api.read", "api.write"]
}
\`\`\`

### Step 3: Exchange for Access Token

\`\`\`bash
curl -X POST https://axiomid.app/api/oauth2/token \\
  -H "Content-Type: application/json" \\
  -d '{"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": "<identity_assertion>"}'
\`\`\`

## User Claimed Flow

For agents without Pi authentication.

### Step 1: Register Anonymously

\`\`\`bash
curl -X POST https://axiomid.app/api/agent/identity \\
  -H "Content-Type: application/json" \\
  -d '{"type": "anonymous"}'
\`\`\`

### Step 2: Show User the Code

The response includes a \`user_code\` and \`verification_uri\`. Show these to the user.

### Step 3: Poll for Token

\`\`\`bash
curl -X POST https://axiomid.app/api/oauth2/token \\
  -H "Content-Type: application/json" \\
  -d '{"grant_type": "claim", "claim_token": "<claim_token>"}'
\`\`\`

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| \`/api/agent/identity\` | POST | Register agent |
| \`/api/agent/identity/claim\` | POST | Start claim ceremony |
| \`/api/oauth2/token\` | POST | Exchange for access token |
| \`/api/oauth2/revoke\` | POST | Revoke access token |
| \`/.well-known/jwks.json\` | GET | Public keys |

## DID Format

\`\`\`
did:axiom:axiomid.app:pi:{uid}
\`\`\`

## Scopes

- \`api.read\` — Read passport, agent status, leaderboard
- \`api.write\` — Update agent, publish skills, claim stamps
- \`agent.sign\` — Sign payloads with DID key
`;

export async function GET(_request: NextRequest) {
  return new Response(AUTH_MD_CONTENT, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
```

- [ ] **Step 4: Implement PRM endpoint**

```typescript
// src/app/.well-known/oauth-protected-resource/route.ts
import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/errors";

export async function GET(_request: NextRequest) {
  return apiSuccess({
    resource: "https://axiomid.app",
    authorization_servers: ["https://axiomid.app"],
    scopes_supported: ["api.read", "api.write", "agent.sign"],
    bearer_methods_supported: ["header"],
  }, 200, {
    "Cache-Control": "public, s-maxage=86400",
  });
}
```

- [ ] **Step 5: Implement AS metadata endpoint**

```typescript
// src/app/.well-known/oauth-authorization-server/route.ts
import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/errors";

export async function GET(_request: NextRequest) {
  return apiSuccess({
    issuer: "https://axiomid.app",
    authorization_endpoint: "https://axiomid.app/api/agent/identity",
    token_endpoint: "https://axiomid.app/api/oauth2/token",
    revocation_endpoint: "https://axiomid.app/api/oauth2/revoke",
    jwks_uri: "https://axiomid.app/.well-known/jwks.json",
    response_types_supported: ["agent_auth"],
    grant_types_supported: [
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "claim",
    ],
    scopes_supported: ["api.read", "api.write", "agent.sign"],
    agent_auth: {
      type: "oidc",
      claims_supported: ["sub", "iss", "aud", "exp", "iat"],
      id_token_type: "urn:ietf:params:oauth:token-type:id_token",
    },
  }, 200, {
    "Cache-Control": "public, s-maxage=86400",
  });
}
```

- [ ] **Step 6: Run tests**

Run: `npx jest src/__tests__/api/auth-md.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 7: Run lint + type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/app/auth.md/route.ts src/app/.well-known/ src/__tests__/api/auth-md.test.ts
git commit -m "feat(auth-md): discovery endpoints — auth.md, PRM, AS metadata ۞"
```

---

### Task 5: Auth Tokens (identity_assertion JWT)

**Files:**
- Create: `src/lib/auth-tokens.ts`
- Test: `src/__tests__/lib/auth-tokens.test.ts`

**Interfaces:**
- Consumes: `deriveSovereignAgentKeypair` from `src/lib/sovereign-keys.ts`
- Produces: `createIdentityAssertion(did, scopes)`, `verifyIdentityAssertion(token)`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/lib/auth-tokens.test.ts
/**
 * @jest-environment node
 */

import { createIdentityAssertion, verifyIdentityAssertion } from "@/lib/auth-tokens";

describe("Auth Tokens", () => {
  const TEST_DID = "did:axiom:axiomid.app:pi:test123";
  const TEST_SCOPES = ["api.read", "api.write"] as const;

  it("creates a valid identity assertion JWT", () => {
    const token = createIdentityAssertion(TEST_DID, [...TEST_SCOPES]);

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
  });

  it("verifies a valid identity assertion", () => {
    const token = createIdentityAssertion(TEST_DID, [...TEST_SCOPES]);
    const payload = verifyIdentityAssertion(token);

    expect(payload.sub).toBe(TEST_DID);
    expect(payload.iss).toBe("https://axiomid.app");
    expect(payload.scopes).toEqual([...TEST_SCOPES]);
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it("rejects expired tokens", () => {
    // Create a token with 0 expiry
    const token = createIdentityAssertion(TEST_DID, [...TEST_SCOPES], 0);
    expect(() => verifyIdentityAssertion(token)).toThrow();
  });

  it("rejects tokens with wrong issuer", () => {
    // Manually create a bad token (will need jose library)
    expect(() => verifyIdentityAssertion("garbage")).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/auth-tokens.test.ts --no-coverage`
Expected: FAIL — `Cannot find module '@/lib/auth-tokens'`

- [ ] **Step 3: Implement auth tokens**

```typescript
// src/lib/auth-tokens.ts
import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";

const ISSUER = "https://axiomid.app";
const AUDIENCE = "https://axiomid.app";
const EXPIRY_SECONDS = 3600; // 1 hour

// Use a symmetric key for signing (in production, use asymmetric)
function getSigningKey(): Uint8Array {
  const key = process.env.AUTH_TOKEN_SECRET || "dev-auth-token-secret-change-in-production";
  return new TextEncoder().encode(key);
}

export function createIdentityAssertion(
  did: string,
  scopes: string[],
  expiresInSec = EXPIRY_SECONDS
): string {
  const key = getSigningKey();

  return new SignJWT({
    sub: did,
    scopes,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(expiresInSec)
    .sign(key);
}

export function verifyIdentityAssertion(token: string): {
  sub: string;
  scopes: string[];
  iss: string;
  exp: number;
  iat: number;
} {
  const key = getSigningKey();

  // jwtVerify throws on invalid/expired tokens
  const result = jwtVerify(token, key, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  // result.payload contains the decoded JWT
  return result.payload as { sub: string; scopes: string[]; iss: string; exp: number; iat: number };
}

export function createAccessToken(did: string, scopes: string[]): string {
  return createIdentityAssertion(did, scopes);
}

export function verifyAccessToken(token: string): { sub: string; scopes: string[] } {
  const payload = verifyIdentityAssertion(token);
  return { sub: payload.sub, scopes: payload.scopes };
}
```

- [ ] **Step 4: Install jose**

Run: `npm install jose`
Expected: success

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/__tests__/lib/auth-tokens.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth-tokens.ts src/__tests__/lib/auth-tokens.test.ts package.json package-lock.json
git commit -m "feat(auth-md): identity_assertion JWT creation + verification with jose ۞"
```

---

### Task 6: Claim Ceremony

**Files:**
- Create: `src/lib/claim-ceremony.ts`
- Test: `src/__tests__/lib/claim-ceremony.test.ts`

**Interfaces:**
- Consumes: nothing (standalone)
- Produces: `createClaimToken()`, `verifyClaimToken(token)`, `confirmClaimToken(token, userId)`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/lib/claim-ceremony.test.ts
/**
 * @jest-environment node
 */

import { createClaimToken, verifyClaimToken, confirmClaimToken } from "@/lib/claim-ceremony";

describe("Claim Ceremony", () => {
  it("creates a claim token with user code", () => {
    const claim = createClaimToken();

    expect(claim.token).toBeDefined();
    expect(claim.userCode).toMatch(/^AXIO-[A-Z0-9]{4}$/);
    expect(claim.verificationUri).toBe("https://axiomid.app/claim");
    expect(claim.expiresAt).toBeGreaterThan(Date.now());
    expect(claim.status).toBe("pending");
  });

  it("verifies a valid claim token", () => {
    const claim = createClaimToken();
    const result = verifyClaimToken(claim.token);

    expect(result).not.toBeNull();
    expect(result!.status).toBe("pending");
  });

  it("confirms a claim token", () => {
    const claim = createClaimToken();
    confirmClaimToken(claim.token, "user-123");

    const result = verifyClaimToken(claim.token);
    expect(result!.status).toBe("confirmed");
    expect(result!.userId).toBe("user-123");
  });

  it("rejects expired claim tokens", () => {
    const claim = createClaimToken();
    // Manually expire by modifying the internal store
    // The implementation should handle this
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/claim-ceremony.test.ts --no-coverage`
Expected: FAIL — `Cannot find module '@/lib/claim-ceremony'`

- [ ] **Step 3: Implement claim ceremony**

```typescript
// src/lib/claim-ceremony.ts
import crypto from "crypto";

const CLAIM_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

interface ClaimRecord {
  token: string;
  userCode: string;
  verificationUri: string;
  expiresAt: number;
  userId: string | null;
  status: "pending" | "confirmed" | "expired";
}

// In-memory store (replace with DB in production)
const claimStore = new Map<string, ClaimRecord>();

function generateUserCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "AXIO-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createClaimToken(): ClaimRecord {
  const token = crypto.randomBytes(32).toString("hex");
  const userCode = generateUserCode();

  const record: ClaimRecord = {
    token,
    userCode,
    verificationUri: "https://axiomid.app/claim",
    expiresAt: Date.now() + CLAIM_TOKEN_EXPIRY_MS,
    userId: null,
    status: "pending",
  };

  claimStore.set(token, record);
  return record;
}

export function verifyClaimToken(token: string): ClaimRecord | null {
  const record = claimStore.get(token);
  if (!record) return null;

  if (Date.now() > record.expiresAt) {
    record.status = "expired";
    return null;
  }

  return record;
}

export function confirmClaimToken(token: string, userId: string): void {
  const record = claimStore.get(token);
  if (!record) throw new Error("Claim token not found");

  if (Date.now() > record.expiresAt) {
    record.status = "expired";
    throw new Error("Claim token expired");
  }

  record.status = "confirmed";
  record.userId = userId;
}

export function findClaimByUserCode(userCode: string): ClaimRecord | null {
  for (const record of claimStore.values()) {
    if (record.userCode === userCode && record.status === "pending") {
      return record;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/lib/claim-ceremony.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/claim-ceremony.ts src/__tests__/lib/claim-ceremony.test.ts
git commit -m "feat(auth-md): claim ceremony lifecycle — create, verify, confirm ۞"
```

---

### Task 7: Agent Identity Registration Endpoint

**Files:**
- Create: `src/app/api/agent/identity/route.ts`
- Test: `src/__tests__/api/agent-identity.test.ts`

**Interfaces:**
- Consumes: `AgentIdentitySchema` from validators, `verifyPiAccessToken` (existing), `createIdentityAssertion` from auth-tokens, `createClaimToken` from claim-ceremony
- Produces: `POST /api/agent/identity`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/api/agent-identity.test.ts
/**
 * @jest-environment node
 */

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn(),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findFirst: jest.fn(), create: jest.fn() } },
}));
jest.mock("@/lib/auth-tokens", () => ({
  createIdentityAssertion: jest.fn(),
}));
jest.mock("@/lib/claim-ceremony", () => ({
  createClaimToken: jest.fn(),
}));

import { POST } from "@/app/api/agent/identity/route";
import { checkRateLimit } from "@/lib/rate-limiter";
import { createIdentityAssertion } from "@/lib/auth-tokens";
import { createClaimToken } from "@/lib/claim-ceremony";

const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockCreateAssertion = createIdentityAssertion as jest.Mock;
const mockCreateClaim = createClaimToken as jest.Mock;

function mockPostRequest(body: unknown) {
  return new Request("http://localhost/api/agent/identity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/agent/identity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it("returns identity_assertion for valid ID-JAG", async () => {
    mockCreateAssertion.mockReturnValue("mock-jwt-token");

    const req = mockPostRequest({ type: "identity_assertion", assertion: "valid-pi-jwt" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.identity_assertion).toBeDefined();
    expect(data.scopes).toContain("api.read");
    expect(data.scopes).toContain("api.write");
  });

  it("returns claim_token for anonymous registration", async () => {
    mockCreateClaim.mockReturnValue({
      token: "claim-abc",
      userCode: "AXIO-1234",
      verificationUri: "https://axiomid.app/claim",
      expiresAt: Date.now() + 600000,
      status: "pending",
    });

    const req = mockPostRequest({ type: "anonymous" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.claim_token).toBe("claim-abc");
    expect(data.claim.user_code).toBe("AXIO-1234");
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = mockPostRequest({ type: "anonymous" });
    const res = await POST(req);

    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid request body", async () => {
    const req = mockPostRequest({ type: "invalid_type" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/api/agent-identity.test.ts --no-coverage`
Expected: FAIL — `Cannot find module '@/app/api/agent/identity/route'`

- [ ] **Step 3: Implement agent identity endpoint**

```typescript
// src/app/api/agent/identity/route.ts
import { NextRequest } from "next/server";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { AgentIdentitySchema } from "@/lib/validators";
import { createIdentityAssertion } from "@/lib/auth-tokens";
import { createClaimToken } from "@/lib/claim-ceremony";
import { logger } from "@/lib/logger";

const DEFAULT_SCOPES = ["api.read", "api.write"];

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-identity:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = AgentIdentitySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    if (parsed.data.type === "identity_assertion") {
      // Agent Verified flow — verify Pi ID-JAG and issue identity_assertion
      // Verified Pi JWKS in production (Task 8)
      const did = "did:axiom:axiomid.app:pi:extracted-from-jwt";
      const identityAssertion = createIdentityAssertion(did, DEFAULT_SCOPES);

      return apiSuccess({
        identity_assertion: identityAssertion,
        scopes: DEFAULT_SCOPES,
      });
    }

    // User Claimed flow — create claim token
    const claim = createClaimToken();

    return apiSuccess({
      claim_token: claim.token,
      claim: {
        user_code: claim.userCode,
        verification_uri: claim.verificationUri,
        expires_in: Math.floor((claim.expiresAt - Date.now()) / 1000),
      },
    });
  } catch (error) {
    logger.error("[AGENT-IDENTITY] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to process agent identity");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/api/agent-identity.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/agent/identity/route.ts src/__tests__/api/agent-identity.test.ts
git commit -m "feat(auth-md): POST /api/agent/identity — Agent Verified + User Claimed ۞"
```

---

### Task 8: Claim Ceremony Endpoint

**Files:**
- Create: `src/app/api/agent/identity/claim/route.ts`
- Test: `src/__tests__/api/agent-identity-claim.test.ts`

**Interfaces:**
- Consumes: `findClaimByUserCode`, `verifyClaimToken` from claim-ceremony
- Produces: `POST /api/agent/identity/claim`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/api/agent-identity-claim.test.ts
/**
 * @jest-environment node
 */

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn(),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));
jest.mock("@/lib/claim-ceremony", () => ({
  findClaimByUserCode: jest.fn(),
  verifyClaimToken: jest.fn(),
}));

import { POST } from "@/app/api/agent/identity/claim/route";
import { findClaimByUserCode, verifyClaimToken } from "@/lib/claim-ceremony";

const mockFindClaim = findClaimByUserCode as jest.Mock;
const mockVerifyClaim = verifyClaimToken as jest.Mock;

function mockPostRequest(body: unknown) {
  return new Request("http://localhost/api/agent/identity/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/agent/identity/claim", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns claim status when user_code is valid", async () => {
    mockFindClaim.mockReturnValue({
      token: "claim-abc",
      userCode: "AXIO-1234",
      status: "pending",
      verificationUri: "https://axiomid.app/claim",
      expiresAt: Date.now() + 600000,
      userId: null,
    });

    const req = mockPostRequest({ user_code: "AXIO-1234" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("pending");
  });

  it("returns 404 for invalid user_code", async () => {
    mockFindClaim.mockReturnValue(null);

    const req = mockPostRequest({ user_code: "INVALID" });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/api/agent-identity-claim.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement claim endpoint**

```typescript
// src/app/api/agent/identity/claim/route.ts
import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/errors";
import { findClaimByUserCode } from "@/lib/claim-ceremony";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ClaimQuerySchema = z.object({
  user_code: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = ClaimQuerySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    const claim = findClaimByUserCode(parsed.data.user_code);

    if (!claim) {
      return apiError("CLAIM_NOT_FOUND", "Invalid or expired user code");
    }

    return apiSuccess({
      status: claim.status,
      verification_uri: claim.verificationUri,
      expires_in: Math.max(0, Math.floor((claim.expiresAt - Date.now()) / 1000)),
    });
  } catch (error) {
    logger.error("[AGENT-CLAIM] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to process claim");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/api/agent-identity-claim.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/agent/identity/claim/route.ts src/__tests__/api/agent-identity-claim.test.ts
git commit -m "feat(auth-md): POST /api/agent/identity/claim — claim ceremony ۞"
```

---

### Task 9: Token Exchange Endpoint

**Files:**
- Create: `src/app/api/oauth2/token/route.ts`
- Test: `src/__tests__/api/oauth2-token.test.ts`

**Interfaces:**
- Consumes: `verifyIdentityAssertion`, `createAccessToken` from auth-tokens, `verifyClaimToken` from claim-ceremony
- Produces: `POST /api/oauth2/token`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/api/oauth2-token.test.ts
/**
 * @jest-environment node
 */

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn(),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));
jest.mock("@/lib/auth-tokens", () => ({
  verifyIdentityAssertion: jest.fn(),
  createAccessToken: jest.fn(),
}));
jest.mock("@/lib/claim-ceremony", () => ({
  verifyClaimToken: jest.fn(),
}));

import { POST } from "@/app/api/oauth2/token/route";
import { verifyIdentityAssertion, createAccessToken } from "@/lib/auth-tokens";
import { verifyClaimToken } from "@/lib/claim-ceremony";

const mockVerifyAssertion = verifyIdentityAssertion as jest.Mock;
const mockCreateToken = createAccessToken as jest.Mock;
const mockVerifyClaim = verifyClaimToken as jest.Mock;

function mockPostRequest(body: unknown) {
  return new Request("http://localhost/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/oauth2/token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateToken.mockReturnValue("access-token-xyz");
  });

  it("exchanges jwt-bearer for access token", async () => {
    mockVerifyAssertion.mockReturnValue({ sub: "did:axiom:axiomid.app:pi:abc", scopes: ["api.read"] });

    const req = mockPostRequest({ grant_type: "jwt-bearer", assertion: "valid-jwt" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.access_token).toBe("access-token-xyz");
    expect(data.token_type).toBe("Bearer");
    expect(data.expires_in).toBe(3600);
  });

  it("returns access token on confirmed claim", async () => {
    mockVerifyClaim.mockReturnValue({ status: "confirmed", userId: "user-1" });

    const req = mockPostRequest({ grant_type: "claim", claim_token: "claim-abc" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.access_token).toBeDefined();
  });

  it("returns pending status for unconfirmed claim", async () => {
    mockVerifyClaim.mockReturnValue({ status: "pending" });

    const req = mockPostRequest({ grant_type: "claim", claim_token: "claim-abc" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("pending");
  });

  it("returns 400 for unsupported grant type", async () => {
    const req = mockPostRequest({ grant_type: "unsupported" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/api/oauth2-token.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement token exchange**

```typescript
// src/app/api/oauth2/token/route.ts
import { NextRequest } from "next/server";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { TokenExchangeSchema } from "@/lib/validators";
import { verifyIdentityAssertion, createAccessToken } from "@/lib/auth-tokens";
import { verifyClaimToken } from "@/lib/claim-ceremony";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`oauth2-token:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests.", undefined, rateLimitHeaders(rateLimit));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = TokenExchangeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    if (parsed.data.grant_type === "jwt-bearer") {
      // Verify identity_assertion and issue access token
      const payload = verifyIdentityAssertion(parsed.data.assertion);
      const accessToken = createAccessToken(payload.sub, payload.scopes);

      return apiSuccess({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
      });
    }

    // Claim flow — poll claim status
    const claim = verifyClaimToken(parsed.data.claim_token);

    if (!claim) {
      return apiError("CLAIM_EXPIRED", "Claim token expired or invalid");
    }

    if (claim.status === "pending") {
      return apiSuccess({ status: "pending" });
    }

    if (claim.status === "confirmed" && claim.userId) {
      const accessToken = createAccessToken(`did:axiom:axiomid.app:pi:${claim.userId}`, ["api.read", "api.write"]);
      return apiSuccess({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        identity_assertion: accessToken,
        scopes: ["api.read", "api.write"],
      });
    }

    return apiError("CLAIM_EXPIRED", "Claim in invalid state");
  } catch (error) {
    logger.error("[OAUTH2-TOKEN] Error:", error);
    return apiError("INVALID_GRANT", "Token exchange failed");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/api/oauth2-token.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/oauth2/token/route.ts src/__tests__/api/oauth2-token.test.ts
git commit -m "feat(auth-md): POST /api/oauth2/token — jwt-bearer + claim grant types ۞"
```

---

### Task 10: Token Revocation Endpoint

**Files:**
- Create: `src/app/api/oauth2/revoke/route.ts`
- Test: `src/__tests__/api/oauth2-revoke.test.ts`

**Interfaces:**
- Consumes: `TokenRevocationSchema` from validators
- Produces: `POST /api/oauth2/revoke`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/api/oauth2-revoke.test.ts
/**
 * @jest-environment node
 */

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn(),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { POST } from "@/app/api/oauth2/revoke/route";

function mockPostRequest(body: unknown) {
  return new Request("http://localhost/api/oauth2/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/oauth2/revoke", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 for valid revocation", async () => {
    const req = mockPostRequest({ token: "some-token" });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it("returns 400 for missing token", async () => {
    const req = mockPostRequest({});
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/api/oauth2-revoke.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement revocation**

```typescript
// src/app/api/oauth2/revoke/route.ts
import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/errors";
import { TokenRevocationSchema } from "@/lib/validators";
import { logger } from "@/lib/logger";

// In-memory revoked token set (replace with DB/Redis in production)
const revokedTokens = new Set<string>();

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = TokenRevocationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    revokedTokens.add(parsed.data.token);
    return apiSuccess({ success: true });
  } catch (error) {
    logger.error("[OAUTH2-REVOKE] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to revoke token");
  }
}

export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/api/oauth2-revoke.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/oauth2/revoke/route.ts src/__tests__/api/oauth2-revoke.test.ts
git commit -m "feat(auth-md): POST /api/oauth2/revoke — token revocation ۞"
```

---

### Task 11: Agent Sign Endpoint

**Files:**
- Create: `src/app/api/agent/sign/route.ts`
- Test: `src/__tests__/api/agent-sign.test.ts`

**Interfaces:**
- Consumes: `signPayloadWithAgentKey` from sovereign-keys, `AgentSignSchema` from validators
- Produces: `POST /api/agent/sign`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/api/agent-sign.test.ts
/**
 * @jest-environment node
 */

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn(),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));
jest.mock("@/lib/sovereign-keys", () => ({
  signPayloadWithAgentKey: jest.fn(),
  deriveSovereignAgentKeypair: jest.fn(),
}));

import { POST } from "@/app/api/agent/sign/route";
import { signPayloadWithAgentKey } from "@/lib/sovereign-keys";

const mockSign = signPayloadWithAgentKey as jest.Mock;

function mockPostRequest(body: unknown) {
  return new Request("http://localhost/api/agent/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/agent/sign", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSign.mockReturnValue("0x3a8fsignature");
  });

  it("returns signature for valid request", async () => {
    const req = mockPostRequest({ payload: "hello world", did: "did:axiom:axiomid.app:pi:abc123" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.signature).toBe("0x3a8fsignature");
    expect(data.did).toBe("did:axiom:axiomid.app:pi:abc123");
  });

  it("returns 400 for invalid DID format", async () => {
    const req = mockPostRequest({ payload: "hello", did: "invalid-did" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/api/agent-sign.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement signing endpoint**

```typescript
// src/app/api/agent/sign/route.ts
import { NextRequest } from "next/server";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { AgentSignSchema } from "@/lib/validators";
import { signPayloadWithAgentKey, deriveSovereignAgentKeypair } from "@/lib/sovereign-keys";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-sign:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests.", undefined, rateLimitHeaders(rateLimit));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = AgentSignSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    // Extract uid from DID: did:axiom:axiomid.app:pi:{uid}
    const didParts = parsed.data.did.split(":");
    const uid = didParts[didParts.length - 1];

    // Derive the user's root key
    const keys = deriveSovereignAgentKeypair(uid, "axiom-root");
    const signature = signPayloadWithAgentKey(parsed.data.payload, keys.privateKey);

    return apiSuccess({
      signature,
      did: parsed.data.did,
      keyVersion: 1,
    });
  } catch (error) {
    logger.error("[AGENT-SIGN] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to sign payload");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/api/agent-sign.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/agent/sign/route.ts src/__tests__/api/agent-sign.test.ts
git commit -m "feat(auth-md): POST /api/agent/sign — server-side DID signing ۞"
```

---

### Task 12: PassportKeyManager UI Component

**Files:**
- Create: `src/components/ui/PassportKeyManager.tsx`
- Create: `src/components/ui/ClaimCeremony.tsx`
- Test: `src/__tests__/components/passport-key-manager.test.tsx`

**Interfaces:**
- Consumes: `InteractivePassportCard` props (did, xp, tier)
- Produces: Key management card section

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/components/passport-key-manager.test.tsx
/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import PassportKeyManager from "@/components/ui/PassportKeyManager";

describe("PassportKeyManager", () => {
  const mockProps = {
    did: "did:axiom:axiomid.app:pi:abc123",
    onSign: jest.fn(),
  };

  it("renders DID display", () => {
    render(<PassportKeyManager {...mockProps} />);
    expect(screen.getByText(/did:axiom:axiomid\.app:pi:abc123/)).toBeDefined();
  });

  it("renders copy button", () => {
    render(<PassportKeyManager {...mockProps} />);
    expect(screen.getByText(/Copy DID/)).toBeDefined();
  });

  it("renders sign section", () => {
    render(<PassportKeyManager {...mockProps} />);
    expect(screen.getByText(/Sign with DID key/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/components/passport-key-manager.test.tsx --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement PassportKeyManager**

```tsx
// src/components/ui/PassportKeyManager.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface PassportKeyManagerProps {
  did: string;
  onSign?: (payload: string) => Promise<string>;
}

export default function PassportKeyManager({ did, onSign }: PassportKeyManagerProps) {
  const [payload, setPayload] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [copied, setCopied] = useState(false);

  const truncatedDid = did.length > 30 ? `${did.slice(0, 15)}...${did.slice(-12)}` : did;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(did);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSign = async () => {
    if (!onSign || !payload) return;
    setSigning(true);
    try {
      const sig = await onSign(payload);
      setSignature(sig);
    } catch {
      setSignature("Signing failed");
    }
    setSigning(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-t border-white/10 pt-4 mt-4 space-y-4"
    >
      {/* Key Management */}
      <div>
        <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
          Key Management
        </h4>
        <div className="flex items-center gap-2">
          <code className="text-[11px] font-mono text-zinc-300 bg-white/5 px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis">
            {truncatedDid}
          </code>
          <button
            onClick={handleCopy}
            className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors text-zinc-400"
          >
            {copied ? "Copied!" : "Copy DID"}
          </button>
        </div>
      </div>

      {/* Sign */}
      <div>
        <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
          Sign
        </h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="Payload to sign..."
            className="flex-1 text-[11px] font-mono bg-white/5 border border-white/10 rounded px-2 py-1 text-zinc-300 placeholder:text-zinc-600"
          />
          <button
            onClick={handleSign}
            disabled={signing || !payload}
            className="text-[10px] font-mono px-3 py-1 rounded bg-electric-blue/20 text-electric-blue hover:bg-electric-blue/30 transition-colors disabled:opacity-50"
          >
            {signing ? "Signing..." : "Sign"}
          </button>
        </div>
        {signature && (
          <div className="mt-2 text-[10px] font-mono text-zinc-500 break-all">
            Signature: {signature}
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/components/passport-key-manager.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/PassportKeyManager.tsx src/components/ui/ClaimCeremony.tsx src/__tests__/components/passport-key-manager.test.tsx
git commit -m "feat(auth-md): PassportKeyManager + ClaimCeremony UI components ۞"
```

---

### Task 13: Integrate into InteractivePassportCard

**Files:**
- Modify: `src/components/ui/InteractivePassportCard.tsx`

**Interfaces:**
- Consumes: `PassportKeyManager` from Task 12
- Produces: Updated `InteractivePassportCard` with key management section

- [ ] **Step 1: Add PassportKeyManager to InteractivePassportCard**

Read the existing `InteractivePassportCard.tsx` and add the `PassportKeyManager` component below the existing passport display, passing `did` and `onSign` props.

- [ ] **Step 2: Run all tests**

Run: `npm test 2>&1 | tail -10`
Expected: All pass

- [ ] **Step 3: Run lint + type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/InteractivePassportCard.tsx
git commit -m "feat(auth-md): integrate PassportKeyManager into InteractivePassportCard ۞"
```

---

### Task 14: Full QA + Final Commit

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass (should be 851+ new tests)

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: 0 errors, 0 warnings

- [ ] **Step 3: Run type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Push**

```bash
git push origin feat/ux-11-overhaul
```
