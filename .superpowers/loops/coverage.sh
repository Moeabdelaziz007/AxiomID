#!/bin/bash
# Loop: 100% test coverage
# Measures test coverage and identifies gaps
# Usage: ./loops/coverage.sh [--fix]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "🔍 100% Test Coverage Loop"
echo "=========================="
echo ""

cd "$PROJECT_DIR"

# Run coverage once and capture output for both display and parsing
echo "📊 Running test coverage..."
COVERAGE_OUTPUT=$(npx jest --coverage --silent 2>&1)

# Display last 20 lines of output
echo "$COVERAGE_OUTPUT" | tail -20

# Parse coverage percentage
COVERAGE_PCT=$(echo "$COVERAGE_OUTPUT" | grep "Lines" | head -1 | grep -oE '[0-9]+\.[0-9]+' | head -1)

echo ""
echo "📈 Current coverage: ${COVERAGE_PCT:-0}%"

# Identify uncovered files
echo ""
echo "📁 Files needing coverage:"
echo "$COVERAGE_OUTPUT" | grep -E "^\s*\│" | grep -v "100" | head -10

# Check if we hit 100%
if [ "$(echo "${COVERAGE_PCT:-0} >= 100" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
  echo ""
  echo "🎉 100% coverage achieved!"
  exit 0
else
  echo ""
  echo "⚠️ Coverage below 100% — identify gaps and add tests"
  exit 1
fi
