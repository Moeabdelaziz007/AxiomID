#!/usr/bin/env bash
# generate-docs.sh — Auto-generate documentation for all repos
# Run from: /Users/cryptojoker710/Desktop/pai-universe

set -euo pipefail

BASE="/Users/cryptojoker710/Desktop/pai-universe"
DOCS_OUTPUT="$BASE/pai-docs/generated"

echo "📚 Generating documentation for all repos..."
mkdir -p "$DOCS_OUTPUT"

generate_repo_docs() {
    local path="$1"
    local name="$2"
    
    if [[ ! -d "$path" ]]; then
        echo "  ⏭️  $name: not found"
        return
    fi
    
    if [[ ! -f "$path/package.json" ]]; then
        echo "  ⏭️  $name: no package.json"
        return
    fi
    
    echo "  📝 $name..."
    cd "$path"
    
    # Generate TypeDoc API reference
    if command -v npx >/dev/null 2>&1 && [[ -f "tsconfig.json" ]]; then
        npx typedoc --out "$DOCS_OUTPUT/$name" --entryPoints src --excludePrivate --excludeProtected 2>/dev/null || echo "    ⚠️  typedoc failed"
    fi
    
    # Generate dependency graph
    if command -v npx >/dev/null 2>&1; then
        npx madge --image "$DOCS_OUTPUT/$name-deps.svg" --ts-config tsconfig.json src 2>/dev/null || true
    fi
    
    # Extract README sections for central docs
    if [[ -f "README.md" ]]; then
        cp "README.md" "$DOCS_OUTPUT/$name-README.md"
    fi
}

# Layer 1-2: Identity
generate_repo_docs "$BASE/layer-1-identity/AxiomID" "AxiomID"
generate_repo_docs "$BASE/layer-1-identity/axiomid-piverify" "axiomid-piverify"

# Layer 3: Agent Runtime
generate_repo_docs "$BASE/layer-3-agent-runtime/pai-agent-kit" "pai-agent-kit"

# Layer 4: MCP Gateway
generate_repo_docs "$BASE/layer-4-mcp-gateway/pai-mcp" "pai-mcp"

# Layer 5: Memory
generate_repo_docs "$BASE/layer-5-memory/pai-memory" "pai-memory"

# Layer 6: Discovery
generate_repo_docs "$BASE/layer-6-discovery/ADP" "ADP"

# Layer 7: Workspace
generate_repo_docs "$BASE/layer-7-workspace/PAI-Gspace" "PAI-Gspace"
generate_repo_docs "$BASE/layer-7-workspace/pai-cli" "pai-cli"
generate_repo_docs "$BASE/layer-7-workspace/pai-docs" "pai-docs"
generate_repo_docs "$BASE/layer-7-workspace/pai-website" "pai-website"

# Infrastructure
generate_repo_docs "$BASE/infrastructure/pai-atom" "pai-atom"
generate_repo_docs "$BASE/infrastructure/pai-skills" "pai-skills"
generate_repo_docs "$BASE/infrastructure/hermes-agent" "hermes-agent"
generate_repo_docs "$BASE/infrastructure/hermes-crawlers" "hermes-crawlers"
generate_repo_docs "$BASE/infrastructure/pi-worker" "pi-worker"
generate_repo_docs "$BASE/infrastructure/pai-migration" "pai-migration"
generate_repo_docs "$BASE/infrastructure/pai-edge" "pai-edge"

# Labs
generate_repo_docs "$BASE/labs/AlphaAxiom" "AlphaAxiom"
generate_repo_docs "$BASE/labs/clawhub-ar" "clawhub-ar"

# Generate central index
cat > "$DOCS_OUTPUT/index.md" <<'EOF'
# PAI Universe — Generated Documentation

Auto-generated on: $(date)

## Repositories

EOF

for dir in "$DOCS_OUTPUT"/*/; do
    [[ -d "$dir" ]] && echo "- [$(basename "$dir")](./$(basename "$dir"))" >> "$DOCS_OUTPUT/index.md"
done

echo ""
echo "✅ Documentation generated in: $DOCS_OUTPUT"
echo "📄 Index: $DOCS_OUTPUT/index.md"