# AxiomID — Comprehensive Frontend Audit Task for Manus AI

## Project Overview

**AxiomID** is a sovereign digital identity passport app built on Pi Network. Users connect their Pi wallet, verify identity (KYC), and deploy an AI agent passport on-chain.

**Tech Stack:** Next.js 16 + React 19 + Prisma 6 + Tailwind 4 + Framer Motion 12
**Production URL:** https://axiomid.app
**Pi Network URL:** https://axiomid8229.pinet.com
**Repo:** /Users/cryptojoker710/AxiomID

---

## TASK 1: Codebase Analysis — Discover Bugs & Issues

### What to do:
1. Read the full repo structure and identify all page components, API routes, and shared components
2. For each page, check for:
   - **Dead code** — unused imports, unreachable branches, commented-out code
   - **TypeScript issues** — `any` casts, missing types, incorrect props
   - **Accessibility** — missing alt text, aria labels, keyboard navigation
   - **Performance** — unnecessary re-renders, missing `useMemo`/`useCallback`, large bundle imports
   - **Responsive design** — hardcoded pixel values, missing mobile breakpoints
   - **Empty states** — what happens when data is null/empty/loading
   - **Error boundaries** — are all pages wrapped in ErrorBoundary?
   - **Consistency** — are similar components (cards, buttons, badges) styled consistently?

3. Search the web for:
   - Known issues with Next.js 16 + React 19 + Prisma 6
   - Pi SDK v2.0 integration best practices and common pitfalls
   - Tailwind 4 breaking changes from v3
   - Framer Motion 12 performance tips
   - Pi Browser iframe sandbox detection issues

4. Return a structured report with:
   - File path + line number + issue description + severity (critical/high/medium/low)
   - Suggested fix for each issue

---

## TASK 2: Dashboard & Marketplace Pages

### Current State:
- `/dashboard` — Main dashboard with tabs: Overview, Marketplace, Sandbox, Settings
- `/dashboard/marketplace` — Skills marketplace (rated 7.2/10 — weakest page)
- Skills API exists at `/api/skills` with CRUD operations

### Issues to Fix:

#### Marketplace (Priority: HIGH)
- [ ] Product grid is not responsive on mobile — cards stack poorly
- [ ] Skill cards look empty — no images, no clear pricing, no trust level badges
- [ ] Filters are weak — need category filters, search, sorting (Price, XP, Popularity)
- [ ] Add Tier Badge on each Skill card (Visitor/Citizen/Validator/Sovereign)
- [ ] Add hover card effect with description + XP Cost + "Buy with Pi" button
- [ ] Add empty state illustration when no skills available
- [ ] Add loading skeleton for cards while data fetches

#### Dashboard Overview (Priority: MEDIUM)
- [ ] Tab badges are not dynamic in some places
- [ ] QuickStatsRow sparkline needs better SVG visualization
- [ ] Agent Card and Passport Card need more space and better hover interaction
- [ ] Showcase Mode card needs clearer design

#### Settings (Priority: LOW)
- [ ] Export Data button needs confirmation dialog
- [ ] Danger Zone (delete account) needs double confirmation

---

## TASK 3: Theme, CSS, Colors & Hero Section

### Current Design System:
- **Base:** OLED Black (`#10131a`)
- **Interactive:** Electric Blue (`#3b82f6`)
- **Success:** Neon Emerald (`#22c55e`)
- **Premium:** Axiom Purple (`#6366f1`)
- **Font:** Geist Sans (body) + Geist Mono (data/badges/code)
- **Effects:** Glassmorphism (backdrop-blur + semi-transparent bg + 1px borders)

### Issues to Fix:

#### Header (Priority: HIGH)
- [ ] `transition-all` is on too many elements → causes input delay. Replace with specific `transition-colors` or `transition-opacity`
- [ ] CONNECT button is unclear when in "CONNECTING..." state — needs loading spinner + disabled state + color change
- [ ] Mobile Menu needs better spacing + slide animation (currently feels abrupt)

#### Hero Section (Priority: HIGH)
- [ ] Review hero animation performance — ensure CSS animations not blocked by JS
- [ ] Stats bar numbers should animate on scroll (count-up effect)
- [ ] CTA button needs stronger visual weight on mobile

#### Footer (Priority: MEDIUM)
- [ ] Column spacing inconsistent on mobile
- [ ] Links need stronger hover effects (glow + scale)
- [ ] Copyright + Social Icons need better alignment
- [ ] Make footer shorter on mobile (collapse some sections)
- [ ] Add subtle border-top with glow effect
- [ ] Reorder: Product → Company → Legal → Community

#### Global CSS (Priority: MEDIUM)
- [ ] Audit all `transition-all` usages — replace with specific transitions
- [ ] Ensure all interactive elements have `transition` (hover/focus)
- [ ] Check color contrast ratios for accessibility (WCAG AA)
- [ ] Verify `prefers-reduced-motion` is respected everywhere

---

## TASK 4: Verify & XP Steps (Claim Flow)

### Current State:
3-step claim flow: Connect Wallet → Verify Identity → Activate Agent

### Issues to Fix (Priority: HIGH):
- [ ] Steps feel static and not exciting enough
- [ ] Trust Score and XP are not visually prominent
- [ ] No progress visual connecting the steps
- [ ] Use horizontal Stepper Component with icons (Shield, Star, Rocket)
- [ ] Add animated XP Bar (CSS animation, not JS)
- [ ] Add small confetti + "+XP" popup when each stamp is verified
- [ ] Step transitions should feel rewarding (spring animations)

---

## TASK 5: Pi Browser Integration (JUST FIXED)

### Recent Fixes Applied:
- `determineSandboxMode()` now short-circuits on `axiomid.app` before iframe/referrer checks
- Pi Browser loads apps in an iframe where `document.referrer` can be `sandbox.minepi.com` even on production domains
- This was causing `sandbox: true` on production, breaking `Pi.authenticate()` handshake

### What to Verify:
- [ ] Pi SDK loads correctly on `axiomid.app` inside Pi Browser
- [ ] `Pi.authenticate()` completes successfully
- [ ] `Pi.init()` is called with `sandbox: false` on production
- [ ] DevMode banner does NOT show on production
- [ ] Sandbox banner DOES show on `sandbox.minepi.com`

---

## TASK 6: Additional Web Research

Search the web for and add notes on:

1. **Pi Network SDK v2.0** — any known issues with `Pi.authenticate()` on custom domains
2. **Pi Browser iframe behavior** — how `document.referrer` behaves when loading third-party apps
3. **Next.js 16 + React 19** — any breaking changes affecting app router pages
4. **Tailwind 4** — migration issues from v3, new features to leverage
5. **Framer Motion 12** — performance best practices for page transitions
6. **Pi Developer Portal** — checklist for production app submission
7. **Pi2Day 2026** — any announcements affecting our integration
8. **Accessibility on mobile** — best practices for Pi Browser (WebView-like environment)

---

## Output Format

Return findings as a structured markdown report:

```markdown
# AxiomID Frontend Audit Report

## Critical Issues (Must Fix)
- [ ] File:Line — Description — Suggested fix

## High Priority Issues
- [ ] File:Line — Description — Suggested fix

## Medium Priority Issues
- [ ] File:Line — Description — Suggested fix

## Low Priority Issues
- [ ] File:Line — Description — Suggested fix

## Web Research Findings
- Topic: Finding — Impact on AxiomID — Recommendation

## Recommended Implementation Order
1. First (this week)
2. Second (next week)
3. Third (month)
```
