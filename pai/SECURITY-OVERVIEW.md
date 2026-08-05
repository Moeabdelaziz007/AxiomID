# SECURITY OVERVIEW — pai-list Organization

> Generated from GitHub Enterprise Secret Scanning
> Organization: pai-list (People, Agents, Intelligent — Build Your Economy)
> Date: 21 July 2026

## Executive Summary

GitHub Advanced Security scanned all 23 repositories in the pai-list ecosystem and detected **22 secret leaks across 4 repositories**.

| Metric | Value |
|--------|:-----:|
| Total secrets detected | 22 |
| Affected repositories | 4 of 23 |
| Preventable with push protection | 2 |
| Provider patterns (API keys) | 12 (55%) |
| Generic patterns (passwords, keys) | 10 (45%) |
| Public leaks | 22 |

## Secret Breakdown

### By Type

| Secret Type | Count | Repos Affected | Severity |
|-------------|:-----:|:--------------:|:--------:|
| Google API Key | 5 | 2 | 🟡 High |
| Generic Private Key | 4 | 2 | 🟡 High |
| Postgres connection string | 4 | 2 | 🔴 Critical |
| Telegram Bot Token | 4 | 1 | 🔴 Critical |
| HTTP bearer authentication header | 2 | 1 | 🟡 Medium |
| OpenRouter API Key | 1 | 1 | 🟡 Medium |
| Stripe Webhook Signing Secret | 1 | 1 | 🟡 Medium |
| Supabase Secret Key | 1 | 1 | 🟡 Medium |

### By Location

| Location | % of Leaks |
|----------|:----------:|
| Code (git history) | 100% (22) |
| Issues | Not scanned |
| Wikis | Not scanned |
| Pull Requests | Not scanned |
| Action logs | Not scanned |

## Affected Repositories

<!-- Each repo has a detailed remediation document -->

| Repository | Leaks | Status | Doc |
|------------|:-----:|:------:|:---:|
| `AxiomID` | 8+ types | 🔴 Active | [SECURITY_REMEDIATION.md](https://github.com/pai-list/AxiomID/blob/main/SECURITY_REMEDIATION.md) |
| `Amrikyy-Agent` | TBD | 🟡 Investigating | TODO |
| `AlphaAxiom` | TBD | 🟡 Investigating | TODO |
| `PiWorker` | TBD | 🟡 Investigating | TODO |

## Remediation Status

| Action | Status | Owner |
|--------|:------:|-------|
| Rotate Google API keys | ⬜ Pending | @Moeabdelaziz007 |
| Rotate Postgres credentials | ⬜ Pending | @Moeabdelaziz007 |
| Rotate Telegram Bot Token | ✅ Completed | @Moeabdelaziz007 |
| Rotate Stripe webhook secret | ⬜ Pending | @Moeabdelaziz007 |
| Rotate Supabase keys | ⬜ Pending | @Moeabdelaziz007 |
| Rotate OpenRouter API key | ⬜ Pending | @Moeabdelaziz007 |
| Purge git history (BFG) | ⬜ Pending | @Moeabdelaziz007 |
| Enable push protection | ⬜ Pending | @Moeabdelaziz007 |
| Add pre-commit gitleaks hook | ⬜ Pending | @Moeabdelaziz007 |

## Repositories Scanned

### pai-list (13)

```
├── 🟢 AxiomID              ── 🔴 Leaks detected
├── 🟢 pai-website           ── ✅ Clean
├── 🟢 AlphaAxiom            ── 🟡 Investigating
├── 🟢 AlphaEdge             ── ✅ Clean
├── 🟢 PiWorker              ── 🟡 Investigating
├── 🟢 openidentity.md       ── ✅ Clean
├── 🔴 pai-mcp               ── Empty (no leaks)
├── 🔴 pai-cli               ── Empty (no leaks)
├── 🔴 pai-skills            ── Empty (no leaks)
├── 🔴 pai-agent-kit         ── Empty (no leaks)
├── 🔴 pai-startkit          ── Empty (no leaks)
├── 🔴 pai-atom              ── Empty (no leaks)
├── 🔴 axiomid-piverify      ── Empty (no leaks)
```

### Personal repos with content (30+ scanned, affected repos in red)

See individual SECURITY_REMEDIATION.md files.

---

<div align="center">
  <sub>This document auto-generated from GitHub Enterprise Secret Scanning data.</sub>
  <br>
  <sub>Last updated: 21 July 2026</sub>
</div>
