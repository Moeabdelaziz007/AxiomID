#!/usr/bin/env bash
# validate-stack.sh — Comprehensive stack validation across all repos
# Checks: TypeScript config, dependencies, versions, rules, patterns
# Run from: /Users/cryptojoker710/Desktop/pai-universe

# Don't exit on error - we want to check all repos
set -uo pipefail

BASE="/Users/cryptojoker710/Desktop/pai-universe"
REPORT_FILE="$BASE/.pai-universe/stack-validation-$(date +%Y%m%d-%H%M%S).md"

echo "🔍 PAI Universe — Stack Validation"
echo "Report: $REPORT_FILE"
echo ""

cat > "$REPORT_FILE" <<EOF
# Stack Validation Report — $(date)

## Checks Performed
- TypeScript strict mode compliance
- Dependency version consistency
- Pi SDK usage patterns (browser-only, sandbox detection)
- TrustChain integration
- SOUL Protocol adherence
- Vercel/Cloudflare deployment configs
- Monorepo structure (turbo, pnpm workspaces)
- Test configuration
- Lint/format configuration

---

EOF

check_tsconfig() {
    local path="$1"
    local name="$2"
    
    if [[ ! -f "$path/tsconfig.json" ]]; then
        echo "  ❌ $name: NO tsconfig.json"
        echo "- **$name**: ❌ Missing tsconfig.json" >> "$REPORT_FILE"
        return
    fi
    
    local tsconfig_content=$(cat "$path/tsconfig.json" 2>/dev/null)
    local strict=$(echo "$tsconfig_content" | jq -r '.compilerOptions.strict // false' 2>/dev/null || echo "false")
    local no_any=$(echo "$tsconfig_content" | jq -r '.compilerOptions.noImplicitAny // false' 2>/dev/null || echo "false")
    local strict_null=$(echo "$tsconfig_content" | jq -r '.compilerOptions.strictNullChecks // false' 2>/dev/null || echo "false")
    local no_unused=$(echo "$tsconfig_content" | jq -r '.compilerOptions.noUnusedLocals // false' 2>/dev/null || echo "false")
    local target=$(echo "$tsconfig_content" | jq -r '.compilerOptions.target // "unknown"' 2>/dev/null || echo "unknown")
    local module=$(echo "$tsconfig_content" | jq -r '.compilerOptions.module // "unknown"' 2>/dev/null || echo "unknown")
    local module_res=$(echo "$tsconfig_content" | jq -r '.compilerOptions.moduleResolution // "unknown"' 2>/dev/null || echo "unknown")
    
    local issues=0
    [[ "$strict" != "true" ]] && { echo "  ⚠️  $name: strict=false"; ((issues++)); }
    
    # If strict: true, all strict sub-options are implicitly enabled
    if [[ "$strict" == "true" ]]; then
        no_any="true"
        strict_null="true"
    fi
    
    [[ "$no_any" != "true" ]] && { echo "  ⚠️  $name: noImplicitAny=false"; ((issues++)); }
    [[ "$strict_null" != "true" ]] && { echo "  ⚠️  $name: strictNullChecks=false"; ((issues++)); }
    [[ "$no_unused" != "true" ]] && { echo "  ℹ️  $name: noUnusedLocals=false (optional)"; ((issues++)); }
    
    if [[ $issues -eq 0 ]]; then
        echo "  ✅ $name: TypeScript strict compliant"
        echo "- **$name**: ✅ Strict mode compliant (target: $target, module: $module)" >> "$REPORT_FILE"
    else
        echo "- **$name**: ⚠️ $issues TypeScript strict items (some optional)" >> "$REPORT_FILE"
    fi
}

check_pi_sdk_usage() {
    local path="$1"
    local name="$2"
    
    # Search for Pi SDK imports
    local pi_imports=$(grep -r "@pi-network/sdk\|from 'pi-sdk'\|from \"pi-sdk\"" "$path" --include="*.ts" --include="*.tsx" 2>/dev/null | head -20)
    
    if [[ -z "$pi_imports" ]]; then
        echo "  ℹ️  $name: No Pi SDK usage found"
        return
    fi
    
    echo "  🔍 $name: Checking Pi SDK patterns..."
    
    # Check for browser guard
    local browser_guards=$(grep -r "typeof window !== 'undefined'\|typeof window === 'undefined'" "$path" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | xargs)
    
    # Check for hardcoded sandbox
    local hardcoded_sandbox=$(grep -r "sandbox:\s*true\|sandbox:\s*false" "$path" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "determineSandboxMode\|isSandbox" | head -5)
    
    # Check for determineSandboxMode
    local sandbox_detection=$(grep -r "determineSandboxMode" "$path" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | xargs)
    
    local issues=0
    
    if [[ -n "$hardcoded_sandbox" ]]; then
        echo "    ❌ $name: Hardcoded sandbox values found:"
        echo "$hardcoded_sandbox" | sed 's/^/       /'
        ((issues++))
    fi
    
    if [[ "$sandbox_detection" -eq 0 ]]; then
        echo "    ⚠️  $name: No determineSandboxMode() usage detected"
        ((issues++))
    fi
    
    if [[ "$browser_guards" -eq 0 ]]; then
        echo "    ⚠️  $name: No browser environment guards (typeof window)"
        ((issues++))
    fi
    
    if [[ $issues -eq 0 ]]; then
        echo "    ✅ $name: Pi SDK patterns compliant"
    fi
    
    echo "- **$name**: Pi SDK imports: $(echo "$pi_imports" | wc -l | xargs), Browser guards: $browser_guards, Sandbox detection: $sandbox_detection, Hardcoded sandbox: $issues" >> "$REPORT_FILE"
}

check_trustchain_integration() {
    local path="$1"
    local name="$2"
    
    local trustchain_imports=$(grep -r "trustChain\|TrustChain\|trust_chain" "$path" --include="*.ts" --include="*.tsx" 2>/dev/null | head -10)
    local append_calls=$(grep -r "\.append(" "$path" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -i trust | head -5)
    
    if [[ -z "$trustchain_imports" ]]; then
        echo "  ℹ️  $name: No TrustChain integration"
        return
    fi
    
    echo "  🔗 $name: TrustChain integration found"
    echo "- **$name**: TrustChain imports: $(echo "$trustchain_imports" | wc -l | xargs), Append calls: $(echo "$append_calls" | wc -l | xargs)" >> "$REPORT_FILE"
}

check_soul_protocol() {
    local path="$1"
    local name="$2"
    
    local soul_files=$(find "$path" -name "SOUL.md" -o -name "soul.md" 2>/dev/null | head -5)
    local ag_files=$(find "$path" -name "AGENTS.md" 2>/dev/null | head -5)
    
    local has_soul=false
    local has_agents=false
    
    [[ -n "$soul_files" ]] && has_soul=true
    [[ -n "$ag_files" ]] && has_agents=true
    
    if $has_soul || $has_agents; then
        echo "  🕊️  $name: SOUL Protocol files present"
        $has_soul && echo "    - SOUL.md: $soul_files"
        $has_agents && echo "    - AGENTS.md: $ag_files"
    else
        echo "  ⚠️  $name: Missing SOUL Protocol files (SOUL.md, AGENTS.md)"
    fi
    
    echo "- **$name**: SOUL.md: $has_soul, AGENTS.md: $has_agents" >> "$REPORT_FILE"
}

check_deployment_config() {
    local path="$1"
    local name="$2"
    
    local vercel_json=$(find "$path" -name "vercel.json" 2>/dev/null | head -1 || true)
    local wrangler=$(find "$path" -name "wrangler.jsonc" -o -name "wrangler.toml" -o -name "wrangler.json" 2>/dev/null | head -1 || true)
    local dockerfile=$(find "$path" -name "Dockerfile" 2>/dev/null | head -1)
    local github_actions=$(find "$path/.github/workflows" -name "*.yml" -o -name "*.yaml" 2>/dev/null | head -5)
    
    echo "  🚀 $name: Deployment configs:"
    [[ -n "$vercel_json" ]] && echo "    - vercel.json: ✅"
    [[ -n "$wrangler" ]] && echo "    - wrangler: ✅ ($(basename "$wrangler"))"
    [[ -n "$dockerfile" ]] && echo "    - Dockerfile: ✅"
    [[ -n "$github_actions" ]] && echo "    - GitHub Actions: $(echo "$github_actions" | wc -l | xargs) workflows"
    
    echo "- **$name**: Vercel: $( [[ -n "$vercel_json" ]] && echo "yes" || echo "no" ), Cloudflare: $( [[ -n "$wrangler" ]] && echo "yes" || echo "no" ), Docker: $( [[ -n "$dockerfile" ]] && echo "yes" || echo "no" ), GH Actions: $(echo "$github_actions" | wc -l | xargs)" >> "$REPORT_FILE"
}

check_monorepo_structure() {
    local path="$1"
    local name="$2"
    
    local pnpm_ws=$(find "$path" -name "pnpm-workspace.yaml" 2>/dev/null | head -1)
    local turbo_json=$(find "$path" -name "turbo.json" 2>/dev/null | head -1)
    local packages_dir=$(find "$path" -name "packages" -type d 2>/dev/null | head -1)
    
    if [[ -n "$pnpm_ws" || -n "$turbo_json" ]]; then
        local pkg_count=0
        [[ -n "$packages_dir" ]] && pkg_count=$(find "$packages_dir" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l | xargs)
        
        echo "  📦 $name: Monorepo detected (packages: $pkg_count)"
        [[ -n "$pnpm_ws" ]] && echo "    - pnpm-workspace.yaml: ✅"
        [[ -n "$turbo_json" ]] && echo "    - turbo.json: ✅"
        
        # Check package.json in each package
        if [[ -n "$packages_dir" ]]; then
            for pkg in "$packages_dir"/*/; do
                [[ -f "$pkg/package.json" ]] || echo "    ⚠️  Missing package.json in $(basename "$pkg")"
            done
        fi
        
        echo "- **$name**: Monorepo: yes, Packages: $pkg_count, pnpm-ws: $( [[ -n "$pnpm_ws" ]] && echo "yes" || echo "no" ), turbo: $( [[ -n "$turbo_json" ]] && echo "yes" || echo "no" )" >> "$REPORT_FILE"
    fi
}

check_test_config() {
    local path="$1"
    local name="$2"
    
    local jest_config=$(find "$path" -name "jest.config.*" 2>/dev/null | head -1)
    local vitest_config=$(find "$path" -name "vitest.config.*" 2>/dev/null | head -1)
    local playwright_config=$(find "$path" -name "playwright.config.*" 2>/dev/null | head -1)
    local test_files=$(find "$path" -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" 2>/dev/null | wc -l | xargs)
    
    if [[ $test_files -gt 0 || -n "$jest_config" || -n "$vitest_config" ]]; then
        echo "  🧪 $name: Test config found"
        [[ -n "$jest_config" ]] && echo "    - Jest: ✅"
        [[ -n "$vitest_config" ]] && echo "    - Vitest: ✅"
        [[ -n "$playwright_config" ]] && echo "    - Playwright: ✅"
        echo "    - Test files: $test_files"
    else
        echo "  ⚠️  $name: No test configuration found"
    fi
    
    echo "- **$name**: Test files: $test_files, Jest: $( [[ -n "$jest_config" ]] && echo "yes" || echo "no" ), Vitest: $( [[ -n "$vitest_config" ]] && echo "yes" || echo "no" ), Playwright: $( [[ -n "$playwright_config" ]] && echo "yes" || echo "no" )" >> "$REPORT_FILE"
}

check_lint_format() {
    local path="$1"
    local name="$2"
    
    local eslint=$(find "$path" -name "eslint.config.*" -o -name ".eslintrc.*" 2>/dev/null | head -1)
    local prettier=$(find "$path" -name "prettier.config.*" -o -name ".prettierrc*" 2>/dev/null | head -1)
    local lint_staged=$(find "$path" -name "lint-staged.config.*" -o -name ".lintstagedrc*" 2>/dev/null | head -1)
    local husky=$(find "$path" -name "husky" -type d 2>/dev/null | head -1)
    
    echo "  🎨 $name: Lint/Format:"
    [[ -n "$eslint" ]] && echo "    - ESLint: ✅"
    [[ -n "$prettier" ]] && echo "    - Prettier: ✅"
    [[ -n "$lint_staged" ]] && echo "    - lint-staged: ✅"
    [[ -n "$husky" ]] && echo "    - Husky: ✅"
    
    echo "- **$name**: ESLint: $( [[ -n "$eslint" ]] && echo "yes" || echo "no" ), Prettier: $( [[ -n "$prettier" ]] && echo "yes" || echo "no" ), lint-staged: $( [[ -n "$lint_staged" ]] && echo "yes" || echo "no" ), Husky: $( [[ -n "$husky" ]] && echo "yes" || echo "no" )" >> "$REPORT_FILE"
}

check_dependency_versions() {
    local path="$1"
    local name="$2"
    
    if [[ ! -f "$path/package.json" ]]; then
        return
    fi
    
    # Key dependencies to check for consistency
    local deps=("typescript" "next" "react" "react-dom" "@cloudflare/workers-types" "wrangler" "vitest" "jest" "eslint" "prettier" "pnpm" "turbo")
    
    echo "  📦 $name: Key dependency versions:"
    for dep in "${deps[@]}"; do
        local version=$(jq -r ".dependencies[\"$dep\"] // .devDependencies[\"$dep\"] // \"\"" "$path/package.json" 2>/dev/null)
        [[ -n "$version" ]] && echo "    - $dep: $version"
    done
}

# Main validation loop
validate_repo() {
    local path="$1"
    local name="$2"
    
    [[ ! -d "$path" ]] && return
    
    echo ""
    echo "=== $name ==="
    echo "## $name" >> "$REPORT_FILE"
    
    check_tsconfig "$path" "$name"
    check_pi_sdk_usage "$path" "$name"
    check_trustchain_integration "$path" "$name"
    check_soul_protocol "$path" "$name"
    check_deployment_config "$path" "$name"
    check_monorepo_structure "$path" "$name"
    check_test_config "$path" "$name"
    check_lint_format "$path" "$name"
    check_dependency_versions "$path" "$name"
    
    echo "" >> "$REPORT_FILE"
}

echo "Starting validation..."

# Layer 1-2: Identity
validate_repo "$BASE/layer-1-identity/AxiomID" "AxiomID"
validate_repo "$BASE/layer-1-identity/axiomid-piverify" "axiomid-piverify"

# Layer 3: Agent Runtime
validate_repo "$BASE/layer-3-agent-runtime/pai-agent-kit" "pai-agent-kit"

# Layer 4: MCP Gateway
validate_repo "$BASE/layer-4-mcp-gateway/pai-mcp" "pai-mcp"

# Layer 5: Memory
validate_repo "$BASE/layer-5-memory/pai-memory" "pai-memory"

# Layer 6: Discovery
validate_repo "$BASE/layer-6-discovery/ADP" "ADP"

# Layer 7: Workspace
validate_repo "$BASE/layer-7-workspace/PAI-Gspace" "PAI-Gspace"
validate_repo "$BASE/layer-7-workspace/pai-cli" "pai-cli"
validate_repo "$BASE/layer-7-workspace/pai-docs" "pai-docs"
validate_repo "$BASE/layer-7-workspace/pai-website" "pai-website"

# Infrastructure
validate_repo "$BASE/infrastructure/pai-atom" "pai-atom"
validate_repo "$BASE/infrastructure/pai-skills" "pai-skills"
validate_repo "$BASE/infrastructure/hermes-agent" "hermes-agent"
validate_repo "$BASE/infrastructure/hermes-crawlers" "hermes-crawlers"
validate_repo "$BASE/infrastructure/hermes-vision" "hermes-vision"
validate_repo "$BASE/infrastructure/pi-worker" "pi-worker"
validate_repo "$BASE/infrastructure/pai-migration" "pai-migration"
validate_repo "$BASE/infrastructure/pai-edge" "pai-edge"

# Labs
validate_repo "$BASE/labs/AlphaAxiom" "AlphaAxiom"
validate_repo "$BASE/labs/clawhub-ar" "clawhub-ar"

# Forks
for fork in "$BASE/forks"/*; do
    if [[ -d "$fork" ]]; then
        validate_repo "$fork" "forks/$(basename "$fork")"
    fi
done

# Summary
cat >> "$REPORT_FILE" <<EOF

---

## Summary & Recommendations

### Critical Issues (Fix Immediately)
- TypeScript strict mode violations
- Hardcoded Pi SDK sandbox values
- Missing TrustChain integration in identity/auth layers
- Missing SOUL Protocol files

### High Priority
- Inconsistent dependency versions across monorepos
- Missing test configurations
- Missing lint/format tooling

### Medium Priority
- Standardize deployment configs (vercel.json, wrangler.jsonc)
- Add missing AGENTS.md to all repos
- Ensure all monorepos use pnpm + turbo

### Cross-Repo Consistency
- TypeScript target: ES2022 / Module: NodeNext / ModuleResolution: Bundler
- Shared eslint config: @pai/eslint-config
- Shared tsconfig: @pai/tsconfig
- Shared prettier: @pai/prettier-config

EOF

echo ""
echo "✅ Validation complete. Report: $REPORT_FILE"
echo ""
echo "Quick summary:"
grep -E "^\- \*\*" "$REPORT_FILE" | head -30