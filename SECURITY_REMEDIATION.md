# SECURITY REMEDIATION — AxiomID

> Generated from GitHub Enterprise Secret Scanning (22 secrets, 4 repos, pai-list org)
> Updated: 21 July 2026

## 🔴 Leaks Found in This Repository

| Secret Type | Count | Location | Severity | Status |
|-------------|:-----:|----------|:--------:|:------:|
| **Postgres connection string** | 4 | `.env` in git history (`83baae49`) | 🔴 Critical | Rotate required |
| **Telegram Bot Token** | 4 | Multiple commits (`.env`, `telegram-notify.yml`) | 🔴 Critical | Rotated |
| **Generic Private Key** | 4 | Likely in test key material | 🟡 High | Verify |
| **Google API Key** | 5 | Likely in `.env.example` or config | 🟡 High | Rotate |
| **HTTP bearer auth header** | 2 | Workflow files | 🟡 Medium | Rotate |
| **OpenRouter API Key** | 1 | Origin config | 🟡 Medium | Verify |
| **Stripe Webhook Signing Secret** | 1 | Origin config | 🟡 Medium | Verify |
| **Supabase Secret Key** | 1 | Origin config | 🟡 Medium | Verify |

## Immediate Actions

### 1. Rotate Compromised Secrets

```bash
# PostgreSQL — generate new connection string via Neon/Prisma
# Already rotated in .env.local. Update Vercel env too.

# Telegram — already revoked. Create new bot with @BotFather
# Update .env + GitHub Actions secrets

# Google API Keys — revoke via Google Cloud Console
# Regenerate and restrict to production IPs

# Stripe — rotate webhook signing secret in Stripe Dashboard
# Update .env.production

# Supabase — rotate anon key + service role key via Supabase Dashboard

# OpenRouter — generate new API key via OpenRouter API Keys page
```

### 2. Git History Cleanup

The `.env` file was committed in the initial commit (`83baae49`). Full BFG cleanup required:

```bash
# Install BFG
brew install bfg

# Clean postgres URLs
bfg --replace-text passwords.txt AxiomID.git

# Force push cleanup
git push --force
```

**Alternative**: Use `git filter-repo`:
```bash
pip install git-filter-repo
git filter-repo --path .env --invert-paths
```

### 3. .gitignore Hardening

Add to `.gitignore`:
```
# Secrets — NEVER COMMIT
.env
.env.local
.env.production
.env.development
*.pem
*.key
**/service-account*.json
**/credentials*.json
```

### 4. Pre-commit Hook

Add `.husky/pre-commit` or use `pre-commit`:
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

## Verification

After remediation:
- [ ] All 22 secrets rotated at source
- [ ] Git history purged (BFG or filter-repo)
- [ ] `.env*` added to `.gitignore`
- [ ] Pre-commit hooks installed
- [ ] GitHub Secret Scanning re-run — 0 alerts
- [ ] Push protection enabled on all pai-list repos

---

<div align="center">
  <sub>**Security is not a feature. It's a discipline.**</sub>
</div>
