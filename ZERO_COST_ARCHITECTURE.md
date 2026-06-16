# Zero-Cost Architecture: Ghost.build + Vercel + Cloudflare

## 🎯 Strategy: Platform Arbitrage

Each platform has different free tier strengths. We exploit each for what it does best.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ZERO-COST ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   VERCEL    │    │  CLOUDFLARE │    │ GHOST.BUILD │        │
│  │   (Free)    │    │   (Free)    │    │   (Free)    │        │
│  ├─────────────┤    ├─────────────┤    ├─────────────┤        │
│  │ Frontend    │    │ Backend API │    │ PostgreSQL  │        │
│  │ SSR/SSG     │    │ Workers     │    │ Database    │        │
│  │ Edge Funcs  │    │ D1 (SQLite) │    │ TimescaleDB │        │
│  │ Cron Jobs   │    │ KV Store    │    │ 666MB free  │        │
│  │ Analytics   │    │ R2 Storage  │    │             │        │
│  │ Speed       │    │ CDN + WAF   │    │             │        │
│  │ Insights    │    │ Vectorize   │    │             │        │
│  │             │    │ AI Gateway  │    │             │        │
│  │             │    │ Queues      │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Free Tier Comparison

| Service | Vercel Free | Cloudflare Free | Ghost.build Free |
|---------|-------------|-----------------|------------------|
| **Compute** | 100GB bandwidth | 100K req/day | Always-on DB |
| **Storage** | 4.5MB payload | 10GB R2 + 1M ops | 666MB PostgreSQL |
| **Database** | ❌ None | D1: 5GB SQLite | ✅ PostgreSQL |
| **Functions** | 100K invocations | 10ms CPU time | N/A |
| **CDN** | Global edge | Global edge + WAF | N/A |
| **Analytics** | Web Analytics | Basic analytics | N/A |
| **AI/ML** | AI SDK | 10K embeddings/day | N/A |

## 🏗️ Optimal Workload Distribution

### **Vercel Handles:**
```yaml
Frontend:
  - Next.js SSR/SSG pages
  - Static assets (JS, CSS, images)
  - ISR (Incremental Static Regeneration)

Serverless Functions:
  - API routes (lightweight)
  - Auth callbacks
  - Webhook handlers
  - Cron jobs (1/day on Hobby)

Analytics:
  - Web Analytics (privacy-friendly)
  - Speed Insights (Core Web Vitals)
```

### **Cloudflare Handles:**
```yaml
Backend API:
  - Worker: axiomid-backend
  - Heavy compute (not on Vercel)
  - Long-running tasks (>30s)

Edge Storage:
  - D1: Session data, caching (SQLite)
  - KV: Feature flags, config (global)
  - R2: File uploads, avatars (S3-compatible)

Intelligence:
  - Vectorize: Semantic search (embeddings)
  - AI Gateway: LLM routing (free 100K logs)
  - Workers AI: Embeddings (10K/day free)

Queue System:
  - Harvest Queue: Background jobs
  - Event processing
  - Async tasks

Security:
  - CDN: Global caching
  - WAF: Bot protection
  - DDoS: Automatic mitigation
```

### **Ghost.build Handles:**
```yaml
Primary Database:
  - Users table (PostgreSQL)
  - Agents, Stamps, Payments
  - All relational data
  - ACID transactions
  - Complex queries

TimescaleDB Features:
  - Time-series for agent logs
  - Hypertables for metrics
  - Continuous aggregates
  - Compression for old data
```

## 🔗 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         REQUEST FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User → Vercel Edge → Cloudflare CDN → Cloudflare Worker       │
│    │                                              │             │
│    │                                              ▼             │
│    │                                    ┌─────────────────┐    │
│    │                                    │  Cloudflare D1  │    │
│    │                                    │  (Session/Cache)│    │
│    │                                    └─────────────────┘    │
│    │                                              │             │
│    │                                              ▼             │
│    │                                    ┌─────────────────┐    │
│    │                                    │   Ghost.build   │    │
│    │                                    │  (PostgreSQL)   │    │
│    │                                    └─────────────────┘    │
│    │                                              │             │
│    ▼                                              ▼             │
│  Vercel Response ←────────────────────────────────────────────  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 💡 Cost Optimization Tricks

### 1. **Edge Caching (Cloudflare)**
```javascript
// Cache API responses at edge
caching: {
  tier: 'full',
  cacheEverything: true,
  cacheTtl: 300 // 5 minutes
}
```

### 2. **Static Generation (Vercel)**
```javascript
// Pre-render pages at build time
export const revalidate = 3600; // Revalidate every hour
```

### 3. **Connection Pooling (Ghost.build)**
```javascript
// Use connection pooler for serverless
DATABASE_URL="postgresql://...?pgbouncer=true"
```

### 4. **KV Caching (Cloudflare)**
```javascript
// Cache expensive queries
await KV.put(`user:${userId}`, userData, { expirationTtl: 3600 });
```

### 5. **R2 for Static Assets**
```javascript
// Move images to R2 (free egress)
const imageUrl = `https://pub-${accountId}.r2.dev/avatars/${userId}.jpg`;
```

## 📈 Monthly Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Vercel Hobby | $0 | 100GB bandwidth |
| Cloudflare Free | $0 | 100K req/day |
| Ghost.build Free | $0 | 666MB PostgreSQL |
| **Total** | **$0** | Fully functional app |

## 🚀 Deployment Checklist

### Vercel
- [ ] Connect GitHub repo
- [ ] Set environment variables
- [ ] Enable Web Analytics
- [ ] Enable Speed Insights
- [ ] Configure cron (daily)

### Cloudflare
- [ ] Create Worker (axiomid-backend)
- [ ] Create D1 database
- [ ] Create KV namespace
- [ ] Create R2 bucket
- [ ] Create Vectorize index
- [ ] Create AI Gateway
- [ ] Set secrets (API keys)

### Ghost.build
- [x] Database created (axiomid-db)
- [x] Schema deployed
- [ ] Enable connection pooling
- [ ] Set up backups

## 🔐 Security Layers

```
┌─────────────────────────────────────────┐
│  Layer 1: Cloudflare WAF + DDoS         │
├─────────────────────────────────────────┤
│  Layer 2: Vercel Edge Auth              │
├─────────────────────────────────────────┤
│  Layer 3: Cloudflare Worker Auth        │
├─────────────────────────────────────────┤
│  Layer 4: Ghost.build Row-Level Security│
└─────────────────────────────────────────┘
```

## 📊 Monitoring Stack

| Metric | Tool | Cost |
|--------|------|------|
| Uptime | Cloudflare Health Checks | Free |
| Performance | Vercel Speed Insights | Free |
| Analytics | Vercel Web Analytics | Free |
| Logs | Cloudflare Workers Logs | Free |
| Errors | Sentry (free tier) | Free |

## 🎯 Summary

**Ghost.build** = Primary database (PostgreSQL, ACID, relational)
**Vercel** = Frontend + light API + analytics
**Cloudflare** = Heavy compute + edge storage + CDN + security

**Result**: Production-grade app for $0/month
