#!/usr/bin/env bash
# generate-manifest.sh — Create repo-manifest.json for the universe
# Run from: /Users/cryptojoker710/Desktop/pai-universe

set -euo pipefail

BASE="/Users/cryptojoker710/Desktop/pai-universe"
MANIFEST="$BASE/.pai-universe/repo-manifest.json"

echo "📋 Generating repo manifest..."

# Start JSON
cat > "$MANIFEST" <<'EOF'
{
  "generated": "",
  "base": "/Users/cryptojoker710/Desktop/pai-universe",
  "total_repos": 0,
  "layers": {}
}
EOF

# Update timestamp
jq --arg ts "$(date -Iseconds)" '.generated = $ts' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"

add_repo() {
    local layer="$1"
    local name="$2"
    local path="$3"
    local desc="$4"
    local status="$5"
    local topics="$6"
    
    if [[ ! -d "$path" ]]; then
        echo "  ⚠️  Missing: $name at $path"
        return
    fi
    
    # Get git info
    local commit=""
    local branch=""
    local remote_url=""
    if [[ -d "$path/.git" ]]; then
        cd "$path"
        commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        branch=$(git branch --show-current 2>/dev/null || echo "unknown")
        remote_url=$(git remote get-url origin 2>/dev/null || echo "")
    fi
    
    # Get package.json info
    local version=""
    local pkg_name=""
    local deps=0
    local dev_deps=0
    if [[ -f "$path/package.json" ]]; then
        version=$(jq -r '.version // ""' "$path/package.json" 2>/dev/null || echo "")
        pkg_name=$(jq -r '.name // ""' "$path/package.json" 2>/dev/null || echo "")
        deps=$(jq '.dependencies | length' "$path/package.json" 2>/dev/null || echo 0)
        dev_deps=$(jq '.devDependencies | length' "$path/package.json" 2>/dev/null || echo 0)
    fi
    
    # Check if it's a monorepo
    local is_monorepo=false
    local packages=0
    if [[ -f "$path/pnpm-workspace.yaml" ]] || [[ -f "$path/turbo.json" ]]; then
        is_monorepo=true
        packages=$(find "$path/packages" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l | xargs)
    fi
    
    # Build topics array
    local topics_json="[]"
    if [[ -n "$topics" ]]; then
        topics_json=$(echo "$topics" | sed 's/,/","/g' | sed 's/^/["/' | sed 's/$/"]/')
    fi
    
    # Add to manifest using jq
    jq --arg layer "$layer" \
       --arg name "$name" \
       --arg path "$path" \
       --arg desc "$desc" \
       --arg status "$status" \
       --arg commit "$commit" \
       --arg branch "$branch" \
       --arg remote "$remote_url" \
       --arg version "$version" \
       --arg pkg_name "$pkg_name" \
       --argjson deps "$deps" \
       --argjson dev_deps "$dev_deps" \
       --argjson is_mono "$is_monorepo" \
       --argjson pkg_count "$packages" \
       --argjson topics "$topics_json" \
       '.layers[$layer] += [{
           "name": $name,
           "path": $path,
           "description": $desc,
           "status": $status,
           "git": {
               "commit": $commit,
               "branch": $branch,
               "remote": $remote
           },
           "package": {
               "name": $pkg_name,
               "version": $version,
               "dependencies": $deps,
               "devDependencies": $dev_deps,
               "isMonorepo": $is_mono,
               "packageCount": $pkg_count
           },
           "topics": $topics
       }] | .total_repos += 1' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"
}

# Initialize layers
jq '.layers = {
    "layer-1-identity": [],
    "layer-3-agent-runtime": [],
    "layer-4-mcp-gateway": [],
    "layer-5-memory": [],
    "layer-6-discovery": [],
    "layer-7-workspace": [],
    "infrastructure": [],
    "labs": [],
    "forks": []
}' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"

# Layer 1-2: Identity
add_repo "layer-1-identity" "AxiomID" "$BASE/layer-1-identity/AxiomID" \
    "Identity, TrustChain, DID, Passport" "🟢 Live" \
    "typescript,mcp,nextjs,cloudflare,web3,autonomous-agents,ai-agents,did,decentralized-identity,verifiable-credentials"

add_repo "layer-1-identity" "axiomid-piverify" "$BASE/layer-1-identity/axiomid-piverify" \
    "Pi KYC + Agent Verification" "🟡 Alpha" \
    "pi-network,kyc,verification"

# Layer 3: Agent Runtime
add_repo "layer-3-agent-runtime" "pai-agent-kit" "$BASE/layer-3-agent-runtime/pai-agent-kit" \
    "Agent SDK, Durable Objects, Vectorize, R2" "🟡 Alpha" \
    "typescript,agents,sdk,durable-objects,vectorize,r2,cloudflare"

# Layer 4: MCP Gateway
add_repo "layer-4-mcp-gateway" "pai-mcp" "$BASE/layer-4-mcp-gateway/pai-mcp" \
    "Unified MCP Gateway" "🟡 Alpha" \
    "mcp,gateway,typescript"

# Layer 5: Memory
add_repo "layer-5-memory" "pai-memory" "$BASE/layer-5-memory/pai-memory" \
    "7-Layer Memory Architecture" "🟡 Alpha" \
    "typescript,memory,pgvector,embeddings,rag"

# Layer 6: Discovery
add_repo "layer-6-discovery" "ADP" "$BASE/layer-6-discovery/ADP" \
    "Agent Discovery Protocol" "🟡 Alpha" \
    "typescript,discovery,signaling,webrtc,agents"

# Layer 7: Workspace
add_repo "layer-7-workspace" "PAI-Gspace" "$BASE/layer-7-workspace/PAI-Gspace" \
    "Global Workspace — Monitor, Collab, Teams" "🆕 Init" \
    "typescript,workspace,collaboration,teams"

add_repo "layer-7-workspace" "pai-cli" "$BASE/layer-7-workspace/pai-cli" \
    "Developer CLI" "🟡 Alpha" \
    "typescript,cli,developer-tools"

add_repo "layer-7-workspace" "pai-docs" "$BASE/layer-7-workspace/pai-docs" \
    "Documentation Site (Next.js)" "📚" \
    "typescript,nextjs,documentation"

add_repo "layer-7-workspace" "pai-website" "$BASE/layer-7-workspace/pai-website" \
    "Marketing Website" "🌐" \
    "typescript,nextjs,website,marketing"

# Infrastructure
add_repo "infrastructure" "pai-atom" "$BASE/infrastructure/pai-atom" \
    "Design Primitives & Components" "🟡 Alpha" \
    "typescript,design-system,components,react"

add_repo "infrastructure" "pai-skills" "$BASE/infrastructure/pai-skills" \
    "Skill Registry & Marketplace" "🟡 Alpha" \
    "typescript,skills,registry,marketplace,monorepo"

add_repo "infrastructure" "hermes-agent" "$BASE/infrastructure/hermes-agent" \
    "Hermes Agent Core" "🟡 Alpha" \
    "typescript,agent,hermes,ai"

add_repo "infrastructure" "hermes-crawlers" "$BASE/infrastructure/hermes-crawlers" \
    "Web Crawlers for Hermes" "🟡 Alpha" \
    "typescript,crawler,hermes,web"

add_repo "infrastructure" "hermes-vision" "$BASE/infrastructure/hermes-vision" \
    "macOS CLI + MCP Screenshots (Swift)" "🟡 Alpha" \
    "swift,macos,mcp,screenshots,vision,cli"

add_repo "infrastructure" "pi-worker" "$BASE/infrastructure/pi-worker" \
    "Pi Network Edge Workers" "🟡 Alpha" \
    "typescript,pi-network,cloudflare-workers,edge"

add_repo "infrastructure" "pai-migration" "$BASE/infrastructure/pai-migration" \
    "Migration Tools" "🔄" \
    "typescript,migration,tools"

add_repo "infrastructure" "pai-edge" "$BASE/infrastructure/pai-edge" \
    "Edge Utilities" "🌐" \
    "typescript,edge,utilities"

# Labs
add_repo "labs" "AlphaAxiom" "$BASE/labs/AlphaAxiom" \
    "Research Sandbox" "🔬 Lab" \
    "research,sandbox,experimental"

add_repo "labs" "clawhub-ar" "$BASE/labs/clawhub-ar" \
    "Skill Registry for OpenClaw" "🔬 Lab" \
    "typescript,skills,registry,openclaw"

# Forks
for fork in "$BASE/forks"/*; do
    if [[ -d "$fork" ]]; then
        fname=$(basename "$fork")
        add_repo "forks" "$fname" "$fork" \
            "Forked repository: $fname" "🍴" \
            "fork"
    fi
done

# Pretty print final manifest
jq '.' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"

echo ""
echo "✅ Manifest generated: $MANIFEST"
echo ""
echo "Summary:"
jq -r '.layers | to_entries[] | "  \(.key): \(.value | length) repos"' "$MANIFEST"
echo "  Total: $(jq -r '.total_repos' "$MANIFEST") repos"