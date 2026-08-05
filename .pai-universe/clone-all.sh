#!/usr/bin/env bash
# clone-all.sh — Clone all 23 pai-list repos into layered structure
# Run from: /Users/cryptojoker710/Desktop/pai-universe

set -euo pipefail

BASE="/Users/cryptojoker710/Desktop/pai-universe"
ORG="pai-list"

echo "🌌 PAI Universe — Cloning all repos..."
echo "Base: $BASE"

# Layer 1-2: Identity
echo "📦 Layer 1-2: Identity..."
git clone --depth 1 "https://github.com/$ORG/axiomid-piverify.git" "$BASE/layer-1-identity/axiomid-piverify" 2>/dev/null || echo "  axiomid-piverify: already exists or failed"

# Layer 3: Agent Runtime
echo "📦 Layer 3: Agent Runtime..."
# pai-agent-kit already moved locally

# Layer 4: MCP Gateway
echo "📦 Layer 4: MCP Gateway..."
# pai-mcp already moved locally

# Layer 5: Memory
echo "📦 Layer 5: Memory..."
# pai-memory already moved locally

# Layer 6: Discovery
echo "📦 Layer 6: Discovery..."
git clone --depth 1 "https://github.com/$ORG/ADP.git" "$BASE/layer-6-discovery/ADP" 2>/dev/null || echo "  ADP: already exists or failed"

# Layer 7: Workspace
echo "📦 Layer 7: Workspace..."
git clone --depth 1 "https://github.com/$ORG/PAI-Gspace.git" "$BASE/layer-7-workspace/PAI-Gspace" 2>/dev/null || echo "  PAI-Gspace: already exists or failed"
# pai-cli, pai-docs, pai-website already moved locally

# Infrastructure
echo "📦 Infrastructure..."
git clone --depth 1 "https://github.com/$ORG/pi-worker.git" "$BASE/infrastructure/pi-worker" 2>/dev/null || echo "  pi-worker: already exists or failed"
git clone --depth 1 "https://github.com/$ORG/hermes-agent.git" "$BASE/infrastructure/hermes-agent" 2>/dev/null || echo "  hermes-agent: already exists or failed"
git clone --depth 1 "https://github.com/$ORG/hermes-crawlers.git" "$BASE/infrastructure/hermes-crawlers" 2>/dev/null || echo "  hermes-crawlers: already exists or failed"
git clone --depth 1 "https://github.com/$ORG/hermes-vision.git" "$BASE/infrastructure/hermes-vision" 2>/dev/null || echo "  hermes-vision: already exists or failed"
# pai-atom, pai-skills, pai-migration, pai-edge already moved locally

# Labs
echo "📦 Labs..."
git clone --depth 1 "https://github.com/$ORG/clawhub-ar.git" "$BASE/labs/clawhub-ar" 2>/dev/null || echo "  clawhub-ar: already exists or failed"
# AlphaAxiom already moved locally

# Forks
echo "📦 Forks..."
# Already moved from pai-forks

echo ""
echo "✅ Clone complete. Repo count:"
find "$BASE" -maxdepth 3 -name ".git" -type d | wc -l | xargs echo "  Total git repos:"
echo ""
echo "Next steps:"
echo "  1. Run ./scripts/sync-all.sh to pull latest"
echo "  2. Run ./scripts/health-check.sh to verify builds"
echo "  3. Run ./scripts/generate-manifest.sh to create repo map"