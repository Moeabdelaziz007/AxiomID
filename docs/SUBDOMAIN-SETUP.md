# Subdomain DNS Configuration

## Wildcard DNS Setup

To enable `*.axiomid.app` subdomains, add these DNS records:

### Cloudflare DNS (Recommended)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `*` | `cname.vercel-dns.com` | DNS only (gray cloud) |

### Vercel Dashboard

1. Go to Project Settings → Domains
2. Add `*.axiomid.app`
3. Vercel will auto-configure the wildcard

### Verification

```bash
# Test subdomain resolution
dig amrikyy.axiomid.app +short
# Should return Vercel's IP

# Test from browser
open https://amrikyy.axiomid.app
# Should show passport page (or 404 if user doesn't exist)
```

## Reserved Subdomains

These subdomains are reserved and cannot be claimed:

```
www, api, mail, app, admin, dashboard,
docs, blog, status, cdn, assets, static
```

## How It Works

1. User visits `amrikyy.axiomid.app`
2. Next.js middleware extracts `amrikyy` from host header
3. Middleware rewrites to `/passport/amrikyy`
4. Passport viewer fetches user by `piUsername`, `walletAddress`, or `did`
5. If found → renders passport page
6. If not found → shows 404

## Implementation

- **Middleware:** `src/middleware.ts` (lines 103-125)
- **Prisma:** `User.subdomain` + `UserAgent.subdomain` (unique VARCHAR(50))
- **Passport viewer:** `src/app/passport/[slug]/page.tsx` (existing, no changes needed)
