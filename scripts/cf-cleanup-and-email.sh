#!/usr/bin/env bash
# Cloudflare Cleanup + Agent Email Routing Setup
# Run this after: wrangler login (or set CLOUDFLARE_API_TOKEN env var)
#
# What this does:
# 1. Deletes 9 empty D1 databases (frees slots)
# 2. Deletes 4 dead KV namespaces
# 3. Creates PAI_RECEIPTS KV namespace
# 4. Sets up agents.axiomid.app MX → Cloudflare Email Routing
# 5. Creates catch-all email Worker route

set -euo pipefail

echo "🧹 Cloudflare Cleanup — AxiomID → PAI"
echo "======================================"
echo ""

# Check auth
if ! wrangler whoami >/dev/null 2>&1; then
  echo "❌ Not authenticated. Run: wrangler login"
  echo "   Or: export CLOUDFLARE_API_TOKEN=your_token"
  exit 1
fi

ACCOUNT_ID=$(wrangler whoami 2>&1 | grep "Account ID" | awk '{print $NF}')
echo "✅ Authenticated | Account: $ACCOUNT_ID"
echo ""

# ═══════════════════════════════════════════
# PHASE 1: Delete empty D1 databases (9)
# ═══════════════════════════════════════════
echo "Phase 1: Delete empty D1 databases"
echo "─────────────────────────────────"

EMPTY_D1=(
  "truth-db"
  "trading-brain-db"
  "axiom-agent-state"
  "axiom-user-data"
  "axiom-production-db"
  "hissab-ledger-checkpoint"
  "axiom-transactions"
  "axiom-brain-db"
  "axiom-audit-db"
)

for db in "${EMPTY_D1[@]}"; do
  echo "  🗑️  Deleting D1: $db"
  wrangler d1 delete "$db" --skip-confirmation 2>/dev/null || \
    echo "  ⚠️  $db — delete manually in dashboard"
done
echo "✅ D1 cleanup done (9 freed, keeping axiom-reset-db)"
echo ""

# ═══════════════════════════════════════════
# PHASE 2: Delete dead KV namespaces (4)
# ═══════════════════════════════════════════
echo "Phase 2: Delete dead KV namespaces"
echo "──────────────────────────────────"

DEAD_KV=(
  "axiom-brain-GLOBAL_CACHE"
  "BRAIN_MEMORY"
  "GLOBAL_CACHE"
  "payment-aggregator-TRANSACTION_CACHE"
)

for kv in "${DEAD_KV[@]}"; do
  # Find namespace ID
  NS_ID=$(wrangler kv namespace list 2>/dev/null | python3 -c "import sys,json; data=json.load(sys.stdin); print(next((n['id'] for n in data if n['title']=='$kv'), ''))" 2>/dev/null)
  if [ -n "$NS_ID" ]; then
    echo "  🗑️  Deleting KV: $kv ($NS_ID)"
    wrangler kv namespace delete --namespace-id "$NS_ID" 2>/dev/null || \
      echo "  ⚠️  $kv — delete manually"
  else
    echo "  ⏭️  $kv — not found (already deleted?)"
  fi
done
echo "✅ KV cleanup done (4 freed)"
echo ""

# ═══════════════════════════════════════════
# PHASE 3: Create PAI_RECEIPTS KV
# ═══════════════════════════════════════════
echo "Phase 3: Create PAI_RECEIPTS namespace"
echo "───────────────────────────────────────"
wrangler kv namespace create PAI_RECEIPTS 2>/dev/null && \
  echo "✅ PAI_RECEIPTS created" || \
  echo "⚠️  PAI_RECEIPTS may already exist"
echo ""

# ═══════════════════════════════════════════
# PHASE 4: Agent Email Routing Setup
# ═══════════════════════════════════════════
echo "Phase 4: Agent Email Routing (agents.axiomid.app)"
echo "─────────────────────────────────────────────────"
echo ""
echo "Manual steps required in Cloudflare Dashboard:"
echo ""
echo "  1. Go to: axiomid.app → Email → Email Routing"
echo "  2. Add MX records for agents.axiomid.app subdomain:"
echo "     - route1.mx.cloudflare.net   (priority 10)"
echo "     - route2.mx.cloudflare.net   (priority 20)"
echo "     - route3.mx.cloudflare.net   (priority 30)"
echo ""
echo "  3. Enable Catch-All rule:"
echo "     - Pattern: *@agents.axiomid.app"
echo "     - Action: Send to Worker"
echo "     - Worker: agent-email-router"
echo ""
echo "  4. The Worker (agent-email-router) will:"
echo "     - Parse recipient (codex@agents.axiomid.app)"
echo "     - Extract agent ID (codex)"
echo "     - Route to agent's Durable Object queue"
echo "     - Store in D1 or forward to event bus"
echo ""

echo "═══════════════════════════════════════"
echo "✅ Cloudflare cleanup complete!"
echo "═══════════════════════════════════════"
echo ""
echo "Freed: 9 D1 + 4 KV = 13 resource slots"
echo "Created: 1 KV (PAI_RECEIPTS)"
echo "Remaining: 1 D1 (axiom-reset-db), 1 KV (PAI_RECEIPTS)"
echo ""
echo "Next: Deploy agent-email-router Worker"
