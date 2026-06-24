# Contributing to AxiomID

Thank you for your interest in contributing to AxiomID!

## Quick Start

1. Fork the repo
2. Clone: `git clone https://github.com/YOUR_USERNAME/AxiomID.git`
3. Install: `npm ci`
4. Copy env: `cp .env.example .env.local`
5. Generate Prisma: `npx prisma generate`
6. Run: `npm run dev`

## Development Guidelines

- **TypeScript** — strict mode, no `any`
- **Tailwind CSS** — use CSS variables from `globals.css`
- **Tests** — add tests for new features (`src/__tests__/`)
- **i18n** — all user-facing text must use `useLanguage()` hook
- **Commits** — follow conventional commits (`feat:`, `fix:`, `docs:`)

## Pull Request Process

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Write tests
3. Run `npx tsc --noEmit && npm run lint && npm test`
4. Open PR against `main`
5. Wait for CI checks to pass

## Architecture

See the [docs page](https://axiomid.app/docs) for full architecture overview.

## Code of Conduct

Be respectful. We follow the [Contributor Covenant](https://www.contributor-covenant.org).
