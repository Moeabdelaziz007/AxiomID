#!/usr/bin/env bash
# agent-onboard.sh — One-command AI agent onboarding
# Run from: /Users/cryptojoker710/Desktop/pai-universe

set -euo pipefail

BASE="/Users/cryptojoker710/Desktop/pai-universe"
TASK="${1:-}"

echo "🤖 PAI Universe — Agent Onboarding"
echo "Task: ${TASK:-"General exploration"}"
echo ""

# 1. Quick health check (lightweight - just check key files exist)
echo "🔍 Quick health check..."
./scripts/sync-all.sh 2>&1 | tail -10

# 2. Generate current context
CONTEXT_FILE="$BASE/.pai-universe/agent-context-$(date +%Y%m%d-%H%M%S).md"
cat > "$CONTEXT_FILE" <<EOF
# Agent Context — $(date)

**Task:** ${TASK:-"General exploration"}

## Current Universe State
EOF

# Add repo manifest summary
if [[ -f "$BASE/.pai-universe/repo-manifest.json" ]]; then
    jq -r '.layers | to_entries[] | "### \(.key)\n\(.value | map("- \(.name) (\(.status)): \(.description)") | join("\n"))\n"' "$BASE/.pai-universe/repo-manifest.json" >> "$CONTEXT_FILE"
fi

cat >> "$CONTEXT_FILE" <<EOF

## Key Files to Read First
1. \`AGENTS.md\` — SOUL Protocol + Navigation
2. \`CLAUDE.md\` — Tool preferences + patterns
3. \`ARCHITECTURE.md\` — 7-layer diagram + data flows
4. \`FREENET_INTEGRATION_PLAN.md\` — Freenet/Hyphanet integration
5. \`.pai-universe/agent-entrypoint.md\` — This file

## Quick Commands
\`\`\`bash
# Sync all repos
./scripts/sync-all.sh

# Health check
./scripts/health-check.sh

# Stack validation
./scripts/validate-stack.sh

# Generate docs
./scripts/generate-docs.sh

# Update manifest
./scripts/generate-manifest.sh
\`\`\`

## Relevant Repos for Task: ${TASK:-"All"}
EOF

# Suggest relevant repos based on task keywords
case "${TASK,,}" in
    *identity*|*did*|*kyc*|*passport*|*trustchain*)
        echo "- layer-1-identity/AxiomID" >> "$CONTEXT_FILE"
        echo "- layer-1-identity/axiomid-piverify" >> "$CONTEXT_FILE"
        ;;
    *agent*|*runtime*|*sdk*|*durable*|*vectorize*)
        echo "- layer-3-agent-runtime/pai-agent-kit" >> "$CONTEXT_FILE"
        echo "- infrastructure/hermes-agent" >> "$CONTEXT_FILE"
        ;;
    *mcp*|*gateway*|*tool*|*function*)
        echo "- layer-4-mcp-gateway/pai-mcp" >> "$CONTEXT_FILE"
        ;;
    *memory*|*embedding*|*vector*|*rag*|*episodic*|*semantic*)
        echo "- layer-5-memory/pai-memory" >> "$CONTEXT_FILE"
        ;;
    *discovery*|*adp*|*signal*|*registry*)
        echo "- layer-6-discovery/ADP" >> "$CONTEXT_FILE"
        ;;
    *workspace*|*gspace*|*collab*|*team*)
        echo "- layer-7-workspace/PAI-Gspace" >> "$CONTEXT_FILE"
        ;;
    *cli*|*command*)
        echo "- layer-7-workspace/pai-cli" >> "$CONTEXT_FILE"
        ;;
    *doc*|*documentation*)
        echo "- layer-7-workspace/pai-docs" >> "$CONTEXT_FILE"
        ;;
    *design*|*component*|*ui*|*atom*)
        echo "- infrastructure/pai-atom" >> "$CONTEXT_FILE"
        ;;
    *skill*|*marketplace*|*registry*)
        echo "- infrastructure/pai-skills" >> "$CONTEXT_FILE"
        ;;
    *crawler*|*scrape*|*web*)
        echo "- infrastructure/hermes-crawlers" >> "$CONTEXT_FILE"
        ;;
    *vision*|*screenshot*|*macos*)
        echo "- infrastructure/hermes-vision" >> "$CONTEXT_FILE"
        ;;
    *pi*|*worker*|*edge*)
        echo "- infrastructure/pi-worker" >> "$CONTEXT_FILE"
        ;;
    *freenet*|*hyphanet*|*censorship*|*decentralized*)
        echo "- FREENET_INTEGRATION_PLAN.md (read first)" >> "$CONTEXT_FILE"
        ;;
    *)
        echo "- All layers — start with AGENTS.md and ARCHITECTURE.md" >> "$CONTEXT_FILE"
        ;;
esac

# 3. Create symlink to latest context
ln -sf "$CONTEXT_FILE" "$BASE/.pai-universe/agent-entrypoint.md"

echo ""
echo "✅ Agent onboarded!"
echo "📄 Context: $CONTEXT_FILE"
echo "🔗 Entry point: $BASE/.pai-universe/agent-entrypoint.md"
echo ""
echo "Next steps:"
echo "  1. Read .pai-universe/agent-entrypoint.md"
echo "  2. Read AGENTS.md (SOUL Protocol)"
echo "  3. Read CLAUDE.md (tool preferences)"
echo "  4. Navigate to relevant layer/repo"