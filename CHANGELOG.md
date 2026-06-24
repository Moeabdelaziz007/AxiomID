# Changelog

All notable changes to the AxiomID project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.5.0] - 2026-06-24

### Added

- Pi Browser native features (share, KYC consent, payments)
- Passport Export as Image + Mint as SBT + Share
- Truth RAG Pipeline (6236 Quran verses, Vectorize + Workers AI)
- @axiomid/sdk npm package (zero dependencies)
- @axiomid/crypto package (sovereign key management, MIT licensed)
- QuickStatsRow dashboard widget with SVG gauge + sparkline
- RecentActivity feed
- Skills Marketplace with purchase flow
- Onboarding wizard with bilingual support (en/ar)
- Pi E2E testing documentation
- CONTRIBUTING.md, CODE_OF_CONDUCT.md
- GitHub Discussions enabled
- GitHub Sponsors / FUNDING.yml

### Security

- Removed hardcoded sandbox token
- Restricted Pi dev token to localhost only
- Added .coderabbit.yaml security rules
- Rate limiter with Upstash Redis
- Timing-safe comparison for /api/embed
- Marketplace payment accepts "completed" status (was rejecting finalized payments)

### Fixed

- PWA network-first navigation + auto-reload on SW update
- OG passport route: Edge to Node.js runtime (1.06 MB exceeds Edge limit)
- Harvest queue error isolation + concurrency limit (Promise.allSettled + semaphore)
- CI: checkout@v7 to v4 compatibility
- installCount race condition (wrapped in Prisma $transaction)
- Onboarding "Congratulation" typo
- Onboarding alert() replaced with sonner toast

### Changed

- Landing page: hero reduced to 60vh, "Backed by Pi Network" badge
- StatsBar: zero-state motivational copy instead of "0+"
- Settings: sidebar nav with Profile/Accounts/Ledger/Settings tabs
- Dashboard: ErrorBoundary wrapper, tab badges
- Leaderboard: fixed response parsing, "Your Rank" sticky bar

---

## [1.0.0] - 2026-02-10

### 🚀 Creative Overhaul: The "Sophisticated Engineering Cyberpunk" Evolution

This release marks a massive pivot from a "Student Project" to a "Unicorn-Level Protocol". We have rebuilt the entire stack to prioritize **Identity as an Asset**.

#### ✨ Frontend (UI/UX)

- **New Aesthetic:** "Sophisticated Engineering Cyberpunk".
  - _Palette:_ OLED Black (`#0a0a0a`), Neon Emerald (`#00ff41`), Electric Blue (`#00d4ff`).
  - _Design Language:_ Bento Grids, Glassmorphism, Terminal-style typography (`SF Mono`).
- **New Landing Page (`page.tsx`):**
  - Replaced the old linear layout with a dynamic **Bento Grid**.
  - Added **3D Tilt Cards** for interaction.
  - Implemented a **Digital Orb** visualization using `framer-motion` (replacing static text).
  - Added "Scanline" and "Grid Background" effects for immersion.
- **State Management:**
  - Introduced `WalletContext` to handle global user state, replacing local storage hacks.
  - Real-time XP and Tier progress tracking.

#### ⚡ Backend (Architecture)

- **Database Migration:**
  - Moved from client-side `localStorage` to **PostgreSQL** (via Prisma ORM).
  - _Why?_ To prevent gaming/cheating and prepare for the "Vault" feature.
- **Schema Expansion:**
  - Added `User` model (Wallet Address, XP, Tier).
  - Added `Action` model (Proof of Work tracking).
  - Added `Stamp` model (Verifiable Credentials).
  - Added `XpLedger` model (XP transaction history).
  - Added `UserAgent` model (Autonomous agent management).
- **API Routes:**
  - `POST /api/auth/connect`: Upsert user logic (Visitor Tier default).
  - `POST /api/action/claim`: Server-side XP verification and Tier calculation.

#### 🧠 Strategy & Logic

- **New Tier Logic:**
  - **Visitor (0 XP):** Unverified.
  - **Citizen (100 XP):** Social Proof.
  - **Validator (500 XP):** Transaction History.
  - **Sovereign (1000 XP):** Skin in the Game (Staking).
- **Gap Analysis:** Conducted deep dive into World Network & Gitcoin.
  - _Conclusion:_ We win on Privacy (No Orbs) and Financial Stake.

#### 🤝 The Consortium

- Formalized the collaboration between Founder (Mohamed), Strategy (Gemini), Agent (Jules), and Platform (Google Antigravity).

---

_Built in the Agent-First Era using Google Antigravity._
