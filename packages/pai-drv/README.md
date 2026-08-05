# PAI-DRV — Google Drive on Cloudflare Free Tier

> File storage with R2 (10GB, zero egress) + D1 (metadata) + KV (sessions) + Workers (API)
>
> **Total cost: $0/month**

---

## Architecture

```
Browser (React SPA)
    ↓ /api/*
Worker (API + Auth)
    ├── D1 (metadata: files, folders, shares, sessions)
    ├── R2 (actual file blobs — zero egress)
    ├── KV (session tokens, cache)
    └── Images (thumbnail generation — optional)
```

---

## API Routes

| Method | Path | Purpose |
|:-------|:-----|:--------|
| POST | `/api/upload` | Upload file to R2 + D1 metadata |
| GET | `/api/files/:id` | Download file from R2 |
| GET | `/api/list/:folder` | List files + folders in directory |
| PATCH | `/api/files/:id` | Rename or move file |
| DELETE | `/api/files/:id` | Delete from R2 + D1 |
| POST | `/api/folders` | Create folder |
| POST | `/api/share/:id` | Generate public share link |
| GET | `/s/:token` | Public share view (no auth) |

---

## Deploy (3 commands after token)

```bash
# 1. Set your Cloudflare API token
export CLOUDFLARE_API_TOKEN="your-token-here"

# 2. Create infrastructure (one-time)
cd packages/pai-drv
npm run r2:create    # R2 bucket: pai-drv-storage
npm run kv:create    # KV namespace: SESSIONS
npm run db:create    # D1 database: pai-drv-metadata
npm run db:migrate   # Run schema.sql

# 3. Update wrangler.toml with the IDs from step 2, then deploy
npm run deploy
```

---

## Free Tier Limits

| Resource | Free Allowance | PAI-DRV Usage |
|:---------|:---------------|:--------------|
| R2 | 10GB storage, zero egress | File blobs |
| D1 | 5GB, 5M reads/day | File/folder metadata |
| Workers | 100K req/day | API requests |
| KV | Free plan | Session tokens |
| Images | Free transformations | Thumbnails (optional) |

---

## D1 Schema

3 tables: `files`, `folders`, `sessions` — see `schema.sql`.
