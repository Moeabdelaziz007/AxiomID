#!/bin/bash
# Loop: sub-50ms page-load
# Measures page load performance across all routes
# Usage: ./loops/sub-50ms.sh [--fix]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
RESULTS_FILE="/tmp/axiomid-perf-$(date +%s).json"

echo "🔍 Sub-50ms Page Load Loop"
echo "=========================="
echo ""

# Build the project first
cd "$PROJECT_DIR"
echo "📦 Building project..."
npm run build --silent 2>/dev/null || true

# Start dev server in background
echo "🚀 Starting dev server..."
npx next start -p 3999 &
SERVER_PID=$!
sleep 6

# Pages to test
PAGES=(
  "/"
  "/passport/axiomid"
  "/dashboard"
  "/dashboard/marketplace"
)

echo "📊 Measuring page loads..."
echo ""

TOTAL=0
PASSED=0

for page in "${PAGES[@]}"; do
  TOTAL=$((TOTAL + 1))
  
  # Warm-up request to prime cache / lazy compile
  curl -s -o /dev/null "http://localhost:3999$page" 2>/dev/null || true

  # Measure with curl using its internal timing variables
  CURL_OUT=$(curl -s -o /dev/null -w "%{http_code}:%{time_total}" "http://localhost:3999$page" 2>/dev/null || echo "000:0.000")
  HTTP_CODE=$(echo "$CURL_OUT" | cut -d':' -f1)
  TIME_SEC=$(echo "$CURL_OUT" | cut -d':' -f2)
  ELAPSED_MS=$(awk -v t="$TIME_SEC" 'BEGIN {print int(t*1000)}')
  
  if [ "$HTTP_CODE" = "200" ] && [ "$ELAPSED_MS" -lt 50 ]; then
    STATUS="✅"
    PASSED=$((PASSED + 1))
  elif [ "$HTTP_CODE" = "200" ]; then
    STATUS="⚠️"
  else
    STATUS="❌"
  fi
  
  printf "%s %-30s %s ms (HTTP %s)\n" "$STATUS" "$page" "$ELAPSED_MS" "$HTTP_CODE"
done

# Cleanup
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "📊 Results: $PASSED/$TOTAL pages under 50ms"

if [ "$PASSED" -eq "$TOTAL" ]; then
  echo "🎉 All pages pass the 50ms threshold!"
  exit 0
else
  echo "⚠️ Some pages need optimization"
  exit 1
fi
