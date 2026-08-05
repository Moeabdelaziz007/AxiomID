# AxiomID Packages

This monorepo contains the public npm packages for the
[AxiomID](https://axiomid.app) decentralized identity protocol.

| Package | Description |
| --- | --- |
| [`@axiomid/crypto`](./crypto) | Sovereign identity cryptography — Ed25519 key derivation, signing, verification. |
| [`@axiomid/sdk`](./sdk) | Official AxiomID SDK — verify passports, resolve DIDs, query trust scores, search skills. |

## How they relate

`@axiomid/crypto` is the low-level cryptography layer. It derives deterministic
Ed25519 keypairs from a user identifier and an agent ID using an HMAC-SHA256 seed.
The AxiomID backend uses it to sign passports and DID documents.

`@axiomid/sdk` is the high-level HTTP client. It talks to the AxiomID REST API
to verify passports, resolve DIDs, read trust scores, and search the skills
marketplace. It does not depend on `@axiomid/crypto` directly — consumers that
need to verify signatures on passports/DID documents client-side should install
both packages and use `@axiomid/crypto` for signature verification with the
public keys exposed via the SDK.

```
┌──────────────────────────────────────────────────────┐
│                   Consumer App                       │
│                                                      │
│   @axiomid/sdk ──── HTTP ───▶ AxiomID REST API       │
│                                                      │
│   @axiomid/crypto ─────────▶ Ed25519 sign / verify   │
│     (local, deterministic)                           │
└──────────────────────────────────────────────────────┘
```

## Installation

Both packages are published to npm:

```bash
npm install @axiomid/sdk      # HTTP client
npm install @axiomid/crypto   # cryptography (optional, for client-side sig verify)
```

## Building

Each package builds independently with TypeScript. From the repo root:

```bash
# Build a single package
cd packages/crypto && npm run build
cd packages/sdk && npm run build

# Type-check without emitting
cd packages/crypto && npm run type-check
cd packages/sdk && npm run type-check
```

Build output is written to each package's `dist/` directory (configured via
`outDir` in `tsconfig.json`). The `files` field in each `package.json` ships
`dist/`, `src/`, `README.md`, and `LICENSE` to npm.

## Testing

```bash
cd packages/crypto && npm test
cd packages/sdk && npm test
```

Tests use Jest with `ts-jest`.

## Publishing

Both packages are marked `"private": false` and are publishable. The publish
workflow is managed centrally from the repository root — do not run
`npm publish` from inside a package without coordinating.

## License

MIT © Mohamed Abdelaziz
