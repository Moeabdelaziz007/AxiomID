#!/usr/bin/env bash
# ADP Signaling Server - Local Development Setup
# Run with: ./scripts/adp-signaling-dev.sh

set -euo pipefail

BASE_DIR="/Users/cryptojoker710/Desktop/pai-universe/layer-6-discovery/ADP"
cd "$BASE_DIR"

echo "🚀 ADP Signaling Server - Local Development"
echo "============================================"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📦 Installing Wrangler..."
    pnpm install -g wrangler@latest
fi

# Check if .dev.vars exists
if [ ! -f ".dev.vars" ]; then
    echo "⚙️  Creating .dev.vars from template..."
    cat > .dev.vars << 'EOF'
# ADP Signaling Local Development Variables
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

# Local D1 database (will be created automatically)
DB_NAME=adp-registry-local

# KV namespace for sessions
SESSIONS_KV=adp-sessions-local

# R2 bucket for artifacts
ARTIFACTS_BUCKET=adp-artifacts-local

# Vectorize index for memory
MEMORY_INDEX=adp-memory-local

# Protocol version
PROTOCOL_VERSION=adp-v1

# Max agents per room
MAX_AGENTS_PER_ROOM=100

# Session TTL (seconds)
SESSION_TTL=3600
EOF
    echo "📝 Created .dev.vars - please edit with your Cloudflare credentials"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Create local D1 database if needed
echo "🗄️  Setting up local D1 database..."
wrangler d1 create adp-registry-local --local 2>/dev/null || true

# Run migrations
echo "🔄 Running migrations..."
wrangler d1 migrations apply adp-registry-local --local 2>/dev/null || true

# Create KV namespace
echo "🔐 Setting up KV namespace..."
wrangler kv:namespace create "SESSIONS" --local 2>/dev/null || true

# Create R2 bucket
echo "🪣 Setting up R2 bucket..."
wrangler r2 bucket create adp-artifacts-local --local 2>/dev/null || true

# Create Vectorize index
echo "🧠 Setting up Vectorize index..."
wrangler vectorize create adp-memory-local --dimensions=768 --metric=cosine --local 2>/dev/null || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the dev server:"
echo "  cd $BASE_DIR"
echo "  pnpm dev"
echo ""
echo "Or with custom port:"
echo "  pnpm dev --port 8787"
echo ""
echo "The signaling server will be available at:"
echo "  WebSocket: ws://localhost:8787/ws"
echo "  Health:    http://localhost:8787/health"
echo ""
echo "For production deploy:"
echo "  pnpm deploy"