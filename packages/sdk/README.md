# @axiomid/sdk

> Official [AxiomID](https://axiomid.app) SDK — Verify passports, resolve DIDs, query trust scores.

A thin TypeScript client for the AxiomID decentralized identity protocol. Use it
to verify user passports, resolve DIDs, read trust scores, and search the AxiomID
skills marketplace from any Node.js or browser application.

## Installation

```bash
npm install @axiomid/sdk
```

## Quick start

```ts
import { AxiomSDK, AxiomIDError } from "@axiomid/sdk";

const sdk = new AxiomSDK({
  network: "mainnet",        // "mainnet" | "testnet"
  apiKey: process.env.AXIOMID_API_KEY, // optional, required for some endpoints
});

async function main() {
  try {
    // Verify a user's passport by username/slug.
    const passport = await sdk.verifyPassport("alice");
    console.log(passport.did, passport.trustScore, passport.tier);

    // Resolve a DID document.
    const didDoc = await sdk.resolveDID(passport.did);
    console.log(didDoc.verificationMethod);

    // Read the trust score for a DID.
    const trust = await sdk.getTrustScore(passport.did);
    console.log(trust.score, trust.tier);

    // Check verifiable stamps.
    const stamps = await sdk.getStamps("alice");
    console.log(stamps.kycBound, stamps.walletAge);

    // Search the skills marketplace.
    const skills = await sdk.searchSkills("avatar");
    console.log(skills);
  } catch (err) {
    if (err instanceof AxiomIDError) {
      console.error(`AxiomID ${err.code} (${err.status}): ${err.message}`);
    } else {
      throw err;
    }
  }
}

main();
```

## API

### `class AxiomSDK`

The main client. Construct it once and reuse it.

#### `new AxiomSDK(config)`

- **`config.network`** `"mainnet" | "testnet"` — Which AxiomID environment to target.
- **`config.apiKey`** `string` (optional) — Bearer token sent as `Authorization`.
- **`config.baseUrl`** `string` (optional) — Override the default network URL.
  Defaults: `mainnet → https://axiomid.app`, `testnet → https://testnet.axiomid.app`.

#### `sdk.verifyPassport(slug): Promise<Passport>`

Verifies and returns a user's passport by their username/slug.

- **`slug`** `string` — The user's username.
- **Returns** `Promise<Passport>` — The verified passport object.
- **Throws** `AxiomIDError` on non-2xx responses.

#### `sdk.getStamps(slug): Promise<Stamps>`

Returns the verifiable stamps attached to a user's passport (e.g. `kycBound`,
`walletAge`). Internally fetches the passport and maps its `stamps[]` array into
a keyed `Stamps` object.

- **`slug`** `string` — The user's username.
- **Returns** `Promise<Stamps>`.

#### `sdk.resolveDID(did): Promise<DIDDocument>`

Resolves a DID to its DID document (W3C DID-core shaped).

- **`did`** `string` — The DID to resolve.
- **Returns** `Promise<DIDDocument>`.

#### `sdk.getTrustScore(did): Promise<TrustScore>`

Returns the trust score and tier for a DID.

- **`did`** `string` — The DID to score.
- **Returns** `Promise<TrustScore>`.

#### `sdk.searchSkills(query): Promise<Skill[]>`

Searches the AxiomID skills marketplace.

- **`query`** `string` — Free-text search query.
- **Returns** `Promise<Skill[]>` — Matching skills (may be empty).

## Types

### `Passport`

```ts
interface Passport {
  username: string;
  walletAddress: string;
  piWalletAddress: string;
  did: string;
  tier: string;
  xp: number;
  trustScore: number;
  kyaStatus: string;
  kycStatus: string;
  stamps: Stamp[];
  issuedDate: string;
  agentName: string | null;
  agentStatus: string | null;
  agentPublicKey: string | null;
}
```

### `Stamp`

```ts
interface Stamp {
  type: string;
  provider: string;
}
```

### `Stamps`

```ts
interface Stamps {
  kycBound: StampResult;
  walletAge: StampResult;
  [key: string]: StampResult;
}
```

### `StampResult`

```ts
interface StampResult {
  verified: boolean;
  days?: number;
  details?: Record<string, unknown>;
}
```

### `DIDDocument`

```ts
interface DIDDocument {
  "@context": string;
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
}
```

### `VerificationMethod`

```ts
interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase: string;
}
```

### `TrustScore`

```ts
interface TrustScore {
  did: string;
  score: number;
  tier: string;
  breakdown?: TrustBreakdown;
}
```

### `TrustBreakdown`

```ts
interface TrustBreakdown {
  kyc: number;
  walletAge: number;
  socialRecovery: number;
  agentActivity: number;
}
```

### `Skill`

```ts
interface Skill {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: string;
  pricePi: number;
  version: string;
  installCount: number;
  avgRating: number;
  ratingCount: number;
  authorId: string;
  createdAt: string;
}
```

### `SearchSkillsResponse`

```ts
interface SearchSkillsResponse {
  skills?: Skill[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

### `AxiomSDKConfig`

```ts
interface AxiomSDKConfig {
  network: "mainnet" | "testnet";
  apiKey?: string;
  baseUrl?: string;
}
```

## Error handling

All non-2xx responses and JSON parse failures throw an `AxiomIDError`:

```ts
class AxiomIDError extends Error {
  readonly code: string;   // e.g. "HTTP_404", "PARSE_ERROR"
  readonly status: number; // HTTP status code
  readonly name: "AxiomIDError";
}
```

Catch it with `instanceof`:

```ts
try {
  await sdk.verifyPassport("unknown-user");
} catch (err) {
  if (err instanceof AxiomIDError) {
    console.error(err.code, err.status, err.message);
  }
}
```

## Requirements

- Node.js `>= 20.0.0` (global `fetch` required) or a modern browser.

## License

MIT © Mohamed Abdelaziz
