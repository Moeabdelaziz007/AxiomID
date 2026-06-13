# Deploying axiomid.app

This document is the source of truth for how the L0 authority surface
(`axiomid.app`) is built, deployed, and configured. It supersedes any
older guide checked into the repo.

## Architecture in one paragraph

The site is a Next.js 16 (App Router) application that ships as a Vercel
project. Pi Network is wired in two ways: the `public/validation-key.txt`
hash proves we control `axiomid.app` to the Pi Developer Portal (it is
public, not a secret), and `PI_API_KEY` / `PI_WALLET_PRIVATE_SEED` are
env vars read from `process.env.PI_API_KEY` in the server-side API routes (e.g. `src/app/api/pi/payment/approve/route.ts`) for any server-side Pi Platform API call. There is one CI workflow on
GitHub Actions (`ci.yml`) that runs type-check, lint and tests on every
PR and push to `main`. Vercel handles preview and production deploys
automatically when connected to the repository.

## One-time Vercel setup

1. Sign in at https://vercel.com with the GitHub account that owns this
   repository.
2. Create a new Vercel project from the repo. Accept the defaults; the
   build command and output directory in `vercel.json` already match.
3. In the project settings, attach the custom domain `axiomid.app`
   (apex) and `www.axiomid.app`. Vercel will print the DNS records to
   add at your registrar:
   - `A @ 76.76.21.21`
   - `CNAME www cname.vercel-dns.com`
   Vercel auto-provisions the TLS certificate once the records resolve.
4. In the project settings, open **Environment Variables** and add the
   keys listed in `.env.example` for the `Production` and `Preview`
   environments. The Pi values (`PI_API_KEY`, optional
   `PI_WALLET_PRIVATE_SEED`) come from the Pi Developer Portal.

## One-time GitHub setup

The deploy workflow expects three repository secrets. Add them under
**Settings -> Secrets and variables -> Actions**:

| Secret              | Where to find it                                                 |
| ------------------- | ---------------------------------------------------------------- |
| `VERCEL_TOKEN`      | https://vercel.com/account/tokens                                |
| `VERCEL_ORG_ID`     | `vercel.com/<org>/settings` or `.vercel/project.json` after link |
| `VERCEL_PROJECT_ID` | Project settings page, or `.vercel/project.json` after link      |

To grab the IDs locally:

```bash
npx vercel link    # interactive; writes .vercel/project.json
cat .vercel/project.json
```

`.vercel/` is gitignored, so the file stays off the repo.

## Pi Network domain claim

The Pi Developer Portal issues a hash that proves you control the
domain. That hash is committed to `public/validation-key.txt` and is
served at `https://axiomid.app/validation-key.txt`. The `vercel.json`
header rules force `Content-Type: text/plain` on that path so Pi's
validator does not see HTML. If you ever rotate the hash, replace the
contents of that file and redeploy; the URL must stay the same.

## Pi keys (runtime)

`PI_API_KEY` and `PI_WALLET_PRIVATE_SEED` are read via `process.env.PI_API_KEY`
directly in server-side API routes. The routes check for a missing key and
return an error, so a misconfigured Vercel environment surfaces the problem
immediately.

## Local development

```bash
cp .env.example .env.local
# fill in DATABASE_URL, PI_API_KEY, OAUTH_STATE_SECRET (sandbox key is fine)
npm ci
npm run dev
```

Set `NEXT_PUBLIC_PI_SANDBOX=true` for any non-production environment.

## Deploy commands (manual override)

CI handles deploys automatically, but you can also push from a
workstation:

```bash
npm run deploy:preview   # vercel
npm run deploy           # vercel --prod
```

Both commands require `VERCEL_TOKEN` to be exported locally.

## Troubleshooting

If the Pi Developer Portal cannot validate the domain, fetch
`https://axiomid.app/validation-key.txt` with `curl -I` and confirm the
status is `200` and the content-type is `text/plain`. A `308` means
something in `vercel.json` is redirecting the path; do not reintroduce
the legacy `routes` block or the apex-domain self-redirect that broke
this URL in earlier revisions.
