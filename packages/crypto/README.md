# @axiomid/crypto

> Sovereign identity cryptography for [AxiomID](https://axiomid.app).

Deterministic Ed25519 key derivation, signing, and verification for the AxiomID
decentralized identity protocol. Keys are derived from a user identifier and an
agent ID using an HMAC-SHA256 seed, so the same inputs always reproduce the same
keypair — no key storage required.

## Installation

```bash
npm install @axiomid/crypto
```

## Usage

```ts
import {
  deriveKeypair,
  signPayload,
  verifySignature,
  deriveUserRootKey,
  ROOT_AGENT_ID,
} from "@axiomid/crypto";

// 1. Derive a keypair deterministically.
//    `salt` must come from a server-side secret (e.g. process.env.SOVEREIGN_KEY_SALT).
const salt = process.env.SOVEREIGN_KEY_SALT!;
const kp = deriveKeypair("GA1234...", "my-agent", salt);
console.log(kp.publicKey);  // PEM-encoded SPKI public key
console.log(kp.privateKey); // PEM-encoded PKCS#8 private key

// 2. Sign a payload.
const signature = signPayload("hello world", kp.privateKey);

// 3. Verify the signature against the public key.
const valid = verifySignature("hello world", signature, kp.publicKey);
console.log(valid); // true

// 4. Derive a user's root keypair (convenience wrapper).
const root = deriveUserRootKey("pi-uid-123", salt);
// root uses ROOT_AGENT_ID internally as the agent id.
```

## API

### `deriveKeypair(stellarAddress, agentId, salt): Keypair`

Deterministically derives an Ed25519 keypair from an address and agent ID.

- **`stellarAddress`** `string` — A user wallet / blockchain address used as HMAC input.
- **`agentId`** `string` — An agent identifier string (e.g. `"my-agent"`).
- **`salt`** `string` — HMAC key material. Must be sourced from a server-side
  secret such as `process.env.SOVEREIGN_KEY_SALT`.
- **Returns** `Keypair` — PEM-encoded public and private keys.
- **Throws** `Error` if `salt` is empty or crypto operations fail.

The same `(stellarAddress, agentId, salt)` triple always produces the same
keypair. Derivation uses `HMAC-SHA256(salt, stellarAddress || agentId)` as the
Ed25519 seed.

### `signPayload(payload, privateKeyPem): string`

Signs a payload using an Ed25519 private key.

- **`payload`** `string` — The message to sign (UTF-8 encoded).
- **`privateKeyPem`** `string` — PEM-encoded PKCS#8 private key.
- **Returns** `string` — Hex-encoded signature.

### `verifySignature(payload, signatureHex, publicKeyPem): boolean`

Verifies an Ed25519 signature against a payload and public key.

- **`payload`** `string` — The original message (UTF-8 encoded).
- **`signatureHex`** `string` — Hex-encoded signature.
- **`publicKeyPem`** `string` — PEM-encoded SPKI public key.
- **Returns** `boolean` — `true` if the signature is valid, `false` otherwise
  (including on malformed input — errors are swallowed and returned as `false`).

### `deriveUserRootKey(piUid, salt): Keypair`

Convenience wrapper around `deriveKeypair` that uses `ROOT_AGENT_ID` as the
agent id. Derives the "root" keypair for a Pi Network user.

- **`piUid`** `string` — The user's Pi Network UID.
- **`salt`** `string` — HMAC key material.
- **Returns** `Keypair` — PEM-encoded keypair.

### `ROOT_AGENT_ID`

`string` — The reserved agent id used by `deriveUserRootKey`. Currently
`"axiom-root"`.

## Types

### `Keypair`

```ts
interface Keypair {
  publicKey: string;  // PEM-encoded SPKI public key
  privateKey: string; // PEM-encoded PKCS#8 private key
}
```

## Requirements

- Node.js `>= 20.0.0`
- The package uses Node's built-in `crypto` module — no native dependencies.

## Security notes

- `salt` is the root secret. Never commit it to source control or expose it to
  the client. Store it in a server-side environment variable.
- Never reuse a `salt` across different environments (mainnet/testnet).
- This module performs **deterministic key derivation**, not random key
  generation. Anyone with the `salt` can reproduce a user's keys.

## License

MIT © Mohamed Abdelaziz
