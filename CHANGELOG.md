# Changelog

All notable changes to the AxiomID project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-02-10

### 🚀 Creative Overhaul: The "Sophisticated Engineering Cyberpunk" Evolution

This release marks a massive pivot from a "Student Project" to a "Unicorn-Level Protocol". We have rebuilt the entire stack to prioritize **Identity as an Asset**.

#### ✨ Frontend (UI/UX)
-   **New Aesthetic:** "Sophisticated Engineering Cyberpunk".
    -   *Palette:* OLED Black (`#0a0a0a`), Neon Emerald (`#00ff41`), Electric Blue (`#00d4ff`).
    -   *Design Language:* Bento Grids, Glassmorphism, Terminal-style typography (`SF Mono`).
-   **New Landing Page (`page.tsx`):**
    -   Replaced the old linear layout with a dynamic **Bento Grid**.
    -   Added **3D Tilt Cards** for interaction.
    -   Implemented a **Digital Orb** visualization using `framer-motion` (replacing static text).
    -   Added "Scanline" and "Grid Background" effects for immersion.
-   **State Management:**
    -   Introduced `WalletContext` to handle global user state, replacing local storage hacks.
    -   Real-time XP and Tier progress tracking.

#### ⚡ Backend (Architecture)
-   **Database Migration:**
    -   Moved from client-side `localStorage` to **PostgreSQL** (via Prisma ORM).
    -   *Why?* To prevent gaming/cheating and prepare for the "Vault" feature.
-   **Schema Expansion:**
    -   Added `User` model (Wallet Address, XP, Tier).
    -   Added `Action` model (Proof of Work tracking).
    -   Added `Vault` model (Staking mechanism for "Proof of Time").
    -   Added `Integration` model (Meta-Aggregator logic).
-   **API Routes:**
    -   `POST /api/auth/connect`: Upsert user logic (Ghost Tier default).
    -   `POST /api/action/claim`: Server-side XP verification and Tier calculation.

#### 🧠 Strategy & Logic
-   **New Tier Logic:**
    -   **Ghost (0 XP):** Unverified.
    -   **Spark (100 XP):** Social Proof.
    -   **Pulse (500 XP):** Transaction History.
    -   **Axiom (1000 XP):** Skin in the Game (Staking).
-   **Gap Analysis:** Conducted deep dive into World Network & Gitcoin.
    -   *Conclusion:* We win on Privacy (No Orbs) and Financial Stake.

#### 🤝 The Consortium
-   Formalized the collaboration between Founder (Mohamed), Strategy (Gemini), Agent (Jules), and Platform (Google Antigravity).

---
*Built in the Agent-First Era using Google Antigravity.*
