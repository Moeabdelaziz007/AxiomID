#!/usr/bin/env bash
# health-check.sh — Build, test, typecheck all repos in pai-universe
# Run from: /Users/cryptojoker710/Desktop/pai-universe

set -euo pipefail

BASE="/Users/cryptojoker710/Desktop/pai-universe"
REPORT_FILE="$BASE/.pai-universe/health-report-$(date +%Y%m%d-%H%M%S).md"

echo "🏥 PAI Universe — Health Check"
echo "Base: $BASE"
echo "Report: $REPORT_FILE"
echo ""

# Initialize report
cat > "$REPORT_FILE" <<EOF
# Health Check Report — $(date)

**Date:** $(date)
**Base:** $BASE

## Summary

| Repo | Build | Test | Typecheck | Lint | Status |
|------|-------|------|-----------|------|--------|
EOF

check_repo() {
    local path="$1"
    local name="$2"
    local pkg_manager="${3:-pnpm}"
    
    if [[ ! -d "$path" ]]; then
        echo "| $name | ⏭️ | ⏭️ | ⏭️ | ⏭️ | **Missing** |" >> "$REPORT_FILE"
        echo "  ⏭️  $name: directory not found"
        return
    fi
    
    if [[ ! -f "$path/package.json" ]]; then
        echo "| $name | ⏭️ | ⏭️ | ⏭️ | ⏭️ | **No package.json** |" >> "$REPORT_FILE"
        echo "  ⏭️  $name: no package.json (non-Node project)"
        return
    fi
    
    echo "  🔍 $name..."
    cd "$path"
    
    local build_status="❌"
    local test_status="❌"
    local typecheck_status="❌"
    local lint_status="❌"
    
    # Install deps if needed
    if [[ ! -d "node_modules" ]]; then
        echo "    📦 Installing deps..."
        $pkg_manager install --frozen-lockfile 2>&1 | tail -5
    fi
    
    # Build
    if $pkg_manager run build >/dev/null 2>&1; then
        build_status="✅"
    fi
    
    # Test
    if $pkg_manager run test >/dev/null 2>&1; then
        test_status="✅"
    fi
    
    # Typecheck
    if $pkg_manager run typecheck >/dev/null 2>&1; then
        typecheck_status="✅"
    elif $pkg_manager run tsc --noEmit >/dev/null 2>&1; then
        typecheck_status="✅"
    fi
    
    # Lint
    if $pkg_manager run lint >/dev/null 2>&1; then
        lint_status="✅"
    fi
    
    # Overall status
    local overall="🟢"
    [[ "$build_status" == "❌" ]] && overall="🔴"
    [[ "$test_status" == "❌" ]] && overall="🟡"
    [[ "$typecheck_status" == "❌" ]] && overall="🟡"
    
    echo "| $name | $build_status | $test_status | $typecheck_status | $lint_status | $overall |" >> "$REPORT_FILE"
    echo "    Build: $build_status | Test: $test_status | Typecheck: $typecheck_status | Lint: $lint_status"
}

# Layer 1-2: Identity
check_repo "$BASE/layer-1-identity/AxiomID" "AxiomID"
check_repo "$BASE/layer-1-identity/axiomid-piverify" "axiomid-piverify"

# Layer 3: Agent Runtime
check_repo "$BASE/layer-3-agent-runtime/pai-agent-kit" "pai-agent-kit"

# Layer 4: MCP Gateway
check_repo "$BASE/layer-4-mcp-gateway/pai-mcp" "pai-mcp"

# Layer 5: Memory
check_repo "$BASE/layer-5-memory/pai-memory" "pai-memory"

# Layer 6: Discovery
check_repo "$BASE/layer-6-discovery/ADP" "ADP"

# Layer 7: Workspace
check_repo "$BASE/layer-7-workspace/PAI-Gspace" "PAI-Gspace"
check_repo "$BASE/layer-7-workspace/pai-cli" "pai-cli"
check_repo "$BASE/layer-7-workspace/pai-docs" "pai-docs"
check_repo "$BASE/layer-7-workspace/pai-website" "pai-website"

# Infrastructure
check_repo "$BASE/infrastructure/pai-atom" "pai-atom"
check_repo "$BASE/infrastructure/pai-skills" "pai-skills"
check_repo "$BASE/infrastructure/hermes-agent" "hermes-agent"
check_repo "$BASE/infrastructure/hermes-crawlers" "hermes-crawlers"
# hermes-vision is Swift - skip Node checks
echo "| hermes-vision | ⏭️ | ⏭️ | ⏭️ | ⏭️ | **Swift** |" >> "$REPORT_FILE"
echo "  ⏭️  hermes-vision: Swift project (skipped)"
check_repo "$BASE/infrastructure/pi-worker" "pi-worker"
check_repo "$BASE/infrastructure/pai-migration" "pai-migration"
check_repo "$BASE/infrastructure/pai-edge" "pai-edge"

# Labs
check_repo "$BASE/labs/AlphaAxiom" "AlphaAxiom"
check_repo "$BASE/labs/clawhub-ar" "clawhub-ar"

# Forks
for fork in "$BASE/forks"/*; do
    if [[ -d "$fork" && -f "$fork/package.json" ]]; then
        check_repo "$fork" "forks/$(basename "$fork")"
    fi
done

# Finalize report
cat >> "$REPORT_FILE" <<EOF

## Legend
- ✅ Pass
- ❌ Fail
- ⏭️ Skipped / Not applicable
- 🟢 All checks pass
- 🟡 Some checks fail (non-blocking)
- 🔴 Build fails (blocking)

## Next Steps
1. Fix 🔴 repos first (build failures)
2. Address 🟡 repos (test/typecheck/lint)
3. Run \`./scripts/generate-docs.sh\` after fixes
4. Commit fixes with IQRA Chronicle format

EOF

echo ""
echo "✅ Health check complete. Report: $REPORT_FILE"
echo ""
echo "Summary:"
grep -E "^\|" "$REPORT_FILE" | tail -n +2 | head -n -1 | awk -F'|' '{print "  " $2 " " $7}'