#!/usr/bin/env bash
# validate-cross-layer.sh — Validate cross-layer integration points
# Run from: /Users/cryptojoker710/Desktop/pai-universe

set -euo pipefail

BASE="/Users/cryptojoker710/Desktop/pai-universe"
REPORT_FILE="$BASE/.pai-universe/cross-layer-validation-$(date +%Y%m%d-%H%M%S).md"

echo "🔗 PAI Universe — Cross-Layer Validation"
echo "Report: $REPORT_FILE"
echo ""

cat > "$REPORT_FILE" <<EOF
# Cross-Layer Integration Validation — $(date)

## Integration Points Checked

EOF

check_integration() {
    local from_layer="$1"
    local to_layer="$2"
    local from_path="$3"
    local to_path="$4"
    local pattern="$5"
    local description="$6"
    
    echo "  🔍 $from_layer → $to_layer: $description"
    
    local matches=0
    if [[ -d "$from_path" ]]; then
        matches=$(grep -r "$pattern" "$from_path" --include="*.ts" --include="*.tsx" --include="*.json" 2>/dev/null | wc -l | xargs)
    fi
    
    if [[ $matches -gt 0 ]]; then
        echo "    ✅ Found $matches references"
        echo "- **$from_layer → $to_layer** ($description): ✅ $matches refs" >> "$REPORT_FILE"
    else
        echo "    ❌ No references found (expected: $pattern)"
        echo "- **$from_layer → $to_layer** ($description): ❌ Missing" >> "$REPORT_FILE"
    fi
}

# Layer 3 (Agent Kit) → Layer 2 (TrustChain/Identity)
check_integration "L3-AgentKit" "L2-TrustChain" \
    "$BASE/layer-3-agent-runtime/pai-agent-kit" \
    "$BASE/layer-1-identity/AxiomID" \
    "trustChain\|TrustChain\|trust_chain" \
    "TrustChain audit logging"

check_integration "L3-AgentKit" "L2-Identity" \
    "$BASE/layer-3-agent-runtime/pai-agent-kit" \
    "$BASE/layer-1-identity/AxiomID" \
    "@axiomid\|axiomid" \
    "Identity package imports"

# Layer 3 → Layer 4 (MCP Gateway)
check_integration "L3-AgentKit" "L4-MCP" \
    "$BASE/layer-3-agent-runtime/pai-agent-kit" \
    "$BASE/layer-4-mcp-gateway/pai-mcp" \
    "mcp\|MCP\|ModelContextProtocol" \
    "MCP client usage"

# Layer 3 → Layer 5 (Memory)
check_integration "L3-AgentKit" "L5-Memory" \
    "$BASE/layer-3-agent-runtime/pai-agent-kit" \
    "$BASE/layer-5-memory/pai-memory" \
    "pai-memory\|PAIMemory\|@pai/memory" \
    "Memory SDK usage"

# Layer 3 → Infra (Skills)
check_integration "L3-AgentKit" "Infra-Skills" \
    "$BASE/layer-3-agent-runtime/pai-agent-kit" \
    "$BASE/infrastructure/pai-skills" \
    "pai-skills\|@pai/skills\|SkillManifest" \
    "Skill registry/loading"

# Layer 4 (MCP) → Layer 2 (Auth)
check_integration "L4-MCP" "L2-Auth" \
    "$BASE/layer-4-mcp-gateway/pai-mcp" \
    "$BASE/layer-1-identity/AxiomID" \
    "axiomid\|AxiomID\|DID\|did:" \
    "Identity-based auth"

# Layer 4 → Layer 3 (Tool Execution)
check_integration "L4-MCP" "L3-Execution" \
    "$BASE/layer-4-mcp-gateway/pai-mcp" \
    "$BASE/layer-3-agent-runtime/pai-agent-kit" \
    "pai-agent-kit\|@pai/agent" \
    "Agent runtime invocation"

# Layer 4 → Layer 5 (Memory Resources)
check_integration "L4-MCP" "L5-Memory-Resources" \
    "$BASE/layer-4-mcp-gateway/pai-mcp" \
    "$BASE/layer-5-memory/pai-memory" \
    "memory\|pai-memory\|@pai/memory" \
    "Memory as MCP resources"

# Layer 5 (Memory) → Layer 2 (TrustChain Audit)
check_integration "L5-Memory" "L2-TrustChain-Audit" \
    "$BASE/layer-5-memory/pai-memory" \
    "$BASE/layer-1-identity/AxiomID" \
    "trustChain\|TrustChain\|trust_chain" \
    "Memory operations audited"

# Layer 6 (ADP) → Layer 2 (DID/VC Verify)
check_integration "L6-ADP" "L2-DID-VC" \
    "$BASE/layer-6-discovery/ADP" \
    "$BASE/layer-1-identity/AxiomID" \
    "did:\|verifiableCredential\|VerifiableCredential" \
    "Agent identity verification"

# Layer 6 → Layer 3 (Agent Cards)
check_integration "L6-ADP" "L3-AgentCards" \
    "$BASE/layer-6-discovery/ADP" \
    "$BASE/layer-3-agent-runtime/pai-agent-kit" \
    "AgentCard\|agent-card\|agentCard" \
    "Agent Card protocol"

# Layer 7 (Gspace) → Layer 2 (Auth)
check_integration "L7-Gspace" "L2-Auth" \
    "$BASE/layer-7-workspace/PAI-Gspace" \
    "$BASE/layer-1-identity/AxiomID" \
    "axiomid\|AxiomID\|next-auth\|Auth.js" \
    "User authentication"

# Layer 7 (Gspace) → Layer 6 (Discovery)
check_integration "L7-Gspace" "L6-Discovery" \
    "$BASE/layer-7-workspace/PAI-Gspace" \
    "$BASE/layer-6-discovery/ADP" \
    "ADP\|adp\|discovery" \
    "Agent discovery in workspace"

# Layer 7 (Gspace) → Layer 3 (Agent Mgmt)
check_integration "L7-Gspace" "L3-AgentMgmt" \
    "$BASE/layer-7-workspace/PAI-Gspace" \
    "$BASE/layer-3-agent-runtime/pai-agent-kit" \
    "pai-agent-kit\|@pai/agent" \
    "Agent deployment/management"

# Layer 7 (CLI) → Layer 3 (Deploy)
check_integration "L7-CLI" "L3-Deploy" \
    "$BASE/layer-7-workspace/pai-cli" \
    "$BASE/layer-3-agent-runtime/pai-agent-kit" \
    "deploy\|Deploy\|pai-agent" \
    "Agent deployment commands"

# Infra (Skills) → Layer 3 (Runtime)
check_integration "Infra-Skills" "L3-Runtime" \
    "$BASE/infrastructure/pai-skills" \
    "$BASE/layer-3-agent-runtime/pai-agent-kit" \
    "pai-agent-kit\|@pai/agent" \
    "Skill execution runtime"

# Infra (Pi Worker) → Layer 1 (Pi Network)
check_integration "Infra-PiWorker" "L1-PiNetwork" \
    "$BASE/infrastructure/pi-worker" \
    "" \
    "@pi-network\|pi-sdk\|PiNetwork" \
    "Pi Network SDK usage"

echo ""
echo "✅ Cross-layer validation complete. Report: $REPORT_FILE"
echo ""

# Summary
echo "## Summary" >> "$REPORT_FILE"
grep -c "✅" "$REPORT_FILE" | xargs -I{} echo "- **Passed:** {}" >> "$REPORT_FILE"
grep -c "❌" "$REPORT_FILE" | xargs -I{} echo "- **Failed:** {}" >> "$REPORT_FILE"