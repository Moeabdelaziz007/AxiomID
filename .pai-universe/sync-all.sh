#!/usr/bin/env bash
# sync-all.sh — Pull latest changes for all repos in the universe
# Run from: /Users/cryptojoker710/Desktop/pai-universe

set -euo pipefail

BASE="/Users/cryptojoker710/Desktop/pai-universe"

echo "🔄 Syncing all repos in PAI Universe..."
echo ""

sync_repo() {
    local path="$1"
    local name="$2"
    
    if [[ ! -d "$path/.git" ]]; then
        echo "  ⏭️  $name: not a git repo"
        return
    fi
    
    cd "$path"
    
    # Check for uncommitted changes
    if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
        echo "  ⚠️  $name: has uncommitted changes, skipping pull"
        return
    fi
    
    # Get current branch
    local branch=$(git branch --show-current 2>/dev/null || echo "main")
    
    # Fetch and pull
    echo "  📥 $name ($branch)..."
    if git fetch origin "$branch" 2>/dev/null && git pull --ff-only origin "$branch" 2>/dev/null; then
        local new_commit=$(git rev-parse --short HEAD)
        echo "     ✅ Updated to $new_commit"
    else
        echo "     ⚠️  Could not fast-forward (may need manual merge)"
    fi
}

# Layer 1-2: Identity
sync_repo "$BASE/layer-1-identity/AxiomID" "AxiomID"
sync_repo "$BASE/layer-1-identity/axiomid-piverify" "axiomid-piverify"

# Layer 3: Agent Runtime
sync_repo "$BASE/layer-3-agent-runtime/pai-agent-kit" "pai-agent-kit"

# Layer 4: MCP Gateway
sync_repo "$BASE/layer-4-mcp-gateway/pai-mcp" "pai-mcp"

# Layer 5: Memory
sync_repo "$BASE/layer-5-memory/pai-memory" "pai-memory"

# Layer 6: Discovery
sync_repo "$BASE/layer-6-discovery/ADP" "ADP"

# Layer 7: Workspace
sync_repo "$BASE/layer-7-workspace/PAI-Gspace" "PAI-Gspace"
sync_repo "$BASE/layer-7-workspace/pai-cli" "pai-cli"
sync_repo "$BASE/layer-7-workspace/pai-docs" "pai-docs"
sync_repo "$BASE/layer-7-workspace/pai-website" "pai-website"

# Infrastructure
sync_repo "$BASE/infrastructure/pai-atom" "pai-atom"
sync_repo "$BASE/infrastructure/pai-skills" "pai-skills"
sync_repo "$BASE/infrastructure/hermes-agent" "hermes-agent"
sync_repo "$BASE/infrastructure/hermes-crawlers" "hermes-crawlers"
sync_repo "$BASE/infrastructure/hermes-vision" "hermes-vision"
sync_repo "$BASE/infrastructure/pi-worker" "pi-worker"
sync_repo "$BASE/infrastructure/pai-migration" "pai-migration"
sync_repo "$BASE/infrastructure/pai-edge" "pai-edge"

# Labs
sync_repo "$BASE/labs/AlphaAxiom" "AlphaAxiom"
sync_repo "$BASE/labs/clawhub-ar" "clawhub-ar"

# Forks
for fork in "$BASE/forks"/*; do
    if [[ -d "$fork/.git" ]]; then
        sync_repo "$fork" "forks/$(basename "$fork")"
    fi
done

echo ""
echo "✅ Sync complete!"
echo ""
echo "💡 Next steps:"
echo "   ./scripts/health-check.sh   # Verify builds"
echo "   ./scripts/generate-manifest.sh  # Update manifest"