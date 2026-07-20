#!/usr/bin/env bash
# PAI Enterprise Setup Script — GitHub Enterprise "Pai-Bye"
# Run this after adjusting your token lifetime at:
# https://github.com/settings/personal-access-tokens/17118128
#
# The token lifetime must be ≤ 366 days to access Enterprise APIs.

set -euo pipefail

ENTERPRISE="Pai-Bye"
ORG_SLUG="pai-list"

echo "🚀 PAI Enterprise Setup"
echo "========================"
echo ""

# 1. Verify enterprise access
echo "1. Verifying enterprise access..."
if ! gh api /enterprises/$ENTERPRISE >/dev/null 2>&1; then
  echo "❌ Cannot access enterprise '$ENTERPRISE'"
  echo "   Fix: Go to https://github.com/settings/personal-access-tokens/17118128"
  echo "   Set token lifetime to ≤ 366 days"
  echo "   Ensure token has 'admin:enterprise' scope"
  exit 1
fi
echo "✅ Enterprise '$ENTERPRISE' accessible"

# 2. Create pai-list organization under enterprise
echo ""
echo "2. Creating organization '$ORG_SLUG'..."
if gh api /orgs/$ORG_SLUG >/dev/null 2>&1; then
  echo "✅ Organization '$ORG_SLUG' already exists"
else
  gh api --method POST /enterprises/$ENTERPRISE/organizations \
    -f login="$ORG_SLUG" \
    -f billing_email="mohamed@pai.build" \
    -f description="PAI — Pi Agentic Infrastructure. The Agent Economy Operating System." \
    -f plan="free" 2>/dev/null || {
    echo "⚠️  Could not create org via API. Create manually at:"
    echo "   https://github.com/organizations/new"
    echo "   Choose: Pai-Bye enterprise → pai-list"
  }
  echo "✅ Organization '$ORG_SLUG' created (or needs manual creation)"
fi

# 3. Create core repos
echo ""
echo "3. Creating core repositories..."
REPOS=(
  "atom:THE ATOM — Immutable PaiSkill ABI (50 lines, frozen forever)"
  "skills:PAI Skills Registry — 50+ skills (verify, trust, did, pay, wallet, browser)"
  "agent-kit:PAI Agent Runtime — @pai/core, adapters, ACP, test harness"
  "cli:PAI Developer CLI — pai create, deploy, skills, verify"
  "mcp:PAI MCP Server — any LLM gets Pi Network powers"
  "docs:PAI Documentation — VitePress"
  "pai-website:PAI Marketing Site — pai.build"
  "pi-startkit:Pi StartKit — Agent StarterKit 2026 (Free, MIT)"
)

for repo_spec in "${REPOS[@]}"; do
  IFS=':' read -r name desc <<< "$repo_spec"
  if gh api /repos/$ORG_SLUG/$name >/dev/null 2>&1; then
    echo "  ✅ $ORG_SLUG/$name (exists)"
  else
    gh repo create "$ORG_SLUG/$name" --public --description "$desc" 2>/dev/null && \
      echo "  ✅ $ORG_SLUG/$name (created)" || \
      echo "  ⚠️  $ORG_SLUG/$name (create manually)"
  fi
done

# 4. Enable Enterprise features (free tier for 28 days)
echo ""
echo "4. Enterprise features to leverage (28-day trial):"
echo "   - GitHub Advanced Security (code scanning, secret scanning)"
echo "   - Copilot Enterprise (AI coding assistant)"
echo "   - Actions (CI/CD minutes)"
echo "   - Packages (npm registry)"
echo "   - SAML SSO (Zero Trust Access)"
echo ""
echo "   Configure at: https://github.com/enterprises/$ENTERPRISE/settings"

# 5. Fork AxiomID into enterprise
echo ""
echo "5. Forking AxiomID into enterprise..."
if gh api /repos/$ORG_SLUG/AxiomID >/dev/null 2>&1; then
  echo "  ✅ $ORG_SLUG/AxiomID (exists)"
else
  gh repo fork Moeabdelaziz007/AxiomID --org $ORG_SLUG 2>/dev/null && \
    echo "  ✅ $ORG_SLUG/AxiomID (forked)" || \
    echo "  ⚠️  Fork manually at: https://github.com/Moeabdelaziz007/AxiomID/fork"
fi

echo ""
echo "✅ PAI Enterprise setup complete!"
echo ""
echo "Next steps:"
echo "  1. Enable Advanced Security on all repos"
echo "  2. Enable Copilot Enterprise for your account"
echo "  3. Set up Actions CI/CD pipelines"
echo "  4. Configure SAML SSO (Cloudflare Zero Trust)"
echo "  5. Push PAI packages to npm registry"
