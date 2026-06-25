# Security Policy

## Supported Versions

We actively maintain security fixes for the following versions of AxiomID:

| Version | Supported |
|---|---|
| 0.1.x (current) | ✅ Active support |
| < 0.1.0 | ❌ No longer supported |

---

## Reporting a Vulnerability

AxiomID handles cryptographic identity, trust scores, and agent authorization for real users on the Pi Network. Security is not an afterthought — it is the core of the protocol.

**Please do NOT report security vulnerabilities via public GitHub Issues.**

### Private Reporting (Preferred)

Use GitHub’s built-in private vulnerability reporting:

1. Go to the [Security Advisories](https://github.com/Moeabdelaziz007/AxiomID/security/advisories) page
2. Click **“Report a vulnerability”**
3. Fill in the details — we will respond within **48 hours**

### Email

Alternatively, email us directly at:



Encrypt sensitive reports using our PGP key (available in this repository at SEC-KEY.asc or on request).

---

## What to Include in Your Report

To help us triage quickly, please include:

- **Description** — what is the vulnerability and where does it exist?
- **Impact** — what can an attacker do with it? (data exposure, trust score manipulation, unauthorized agent actions, etc.)
- **Steps to reproduce** — a minimal, clear reproduction path
- **Affected component** — frontend API, Cloudflare Workers backend, SDK, Soul System, trust engine, DID resolution, etc.
- **Suggested fix** — optional but appreciated

---

## Scope

### In Scope

| Component | Examples |
|---|---|
| Trust Score Engine | Score manipulation, hardcoded defaults, XP/credential spoofing |
| DID / Credential System | Forged VCs, DID spoofing, Ed25519 key misuse |
| Soul System | Gate bypass, unauthorized privileged actions |
| API Routes (`src/app/api/**`) | Auth bypass, missing Zod validation, IDOR |
| Cloudflare Workers Backend | Timing attacks, missing X-Shared-Secret, SQL injection in D1 |
| Agent Passport | Unauthorized badge/score modification |
| Pi Network Auth | Session fixation, token replay, SDK misuse |
| Secret Scanning | Hardcoded secrets, leaked API keys in commits |

### Out of Scope

- Vulnerabilities in third-party dependencies (report to the upstream maintainer)
- Issues already known and tracked in public GitHub Issues
- Social engineering attacks
- Denial of Service via excessive legitimate API calls
- Issues requiring physical access to the server

---

## Our Commitment

| Stage | Timeline |
|---|---|
| Initial acknowledgement | Within 48 hours |
| Triage and severity assessment | Within 5 business days |
| Fix or mitigation | Depends on severity (Critical: 7 days, High: 14 days, Medium: 30 days) |
| Public disclosure | After fix is deployed and reporter is credited (unless they prefer anonymity) |

We follow a **coordinated disclosure** model. Reporters who follow this policy responsibly will be credited in the security advisory and in our `CHANGELOG.md`.

---

## Severity Classification

We use the [CVSS v3.1](https://www.first.org/cvss/) scoring system:

| Severity | CVSS Score | Examples in AxiomID context |
|---|---|---|
| Critical | 9.0 – 10.0 | Trust score forgery, full auth bypass, DID hijacking |
| High | 7.0 – 8.9 | Soul System gate bypass, credential spoofing |
| Medium | 4.0 – 6.9 | Information disclosure, IDOR on passport data |
| Low | 0.1 – 3.9 | Minor info leaks, non-exploitable misconfigurations |

---

## Security Best Practices for Contributors

If you are contributing to AxiomID, please follow these rules (enforced by CodeRabbit and our CI):

- No `any` types in TypeScript
- All protected API routes must use requireAuth middleware
- All inputs must be validated with Zod schemas
- No secrets in code — use Vercel or Wrangler environment variables
- No `console.log` with sensitive data — use `logger.error()` in catch blocks
- All D1 queries must be parameterized — no string interpolation in SQL
- Ed25519 keys must never be logged or transmitted in plaintext

See `AGENTS.md` and `.coderabbit.yaml` for the full engineering covenant.

---

*AxiomID — Built with intention. Authorized by humans. Trusted by design.*
