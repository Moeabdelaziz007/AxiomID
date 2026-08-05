# Landing Page Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans.

**Goal:** Update landing page copy for OpenIdentity positioning, wire hardcoded strings through i18n, fix theme hardcodes.

**Architecture:** No new components. String changes in i18n files, component changes limited to replacing hardcoded strings with `t()` calls and swapping Tailwind classes for CSS variables.

**Tech Stack:** Next.js 16, React 19, i18n via `useLanguage()` hook, Tailwind 4, CSS variables in `globals.css`

## Global Constraints

- All user-visible strings must go through `t(key)` — no hardcoded English in components
- Arabic translations must mirror English keys in `src/i18n/ar.json`
- Theme colors use CSS variables (`var(--bg-deep)`, `var(--bg-card)`) — no hardcoded hex
- Build must pass: `npm run build` (74 static routes, 0 errors)
- Lint must pass: `npx eslint --max-warnings 0`

---

### Task 1: Hero Copy for OpenIdentity Positioning

**Files:**
- Modify: `src/i18n/en.json`
- Modify: `src/i18n/ar.json`
- Verify: `src/components/landing/HeroSection.tsx` (no code changes expected)

**Interfaces:**
- Consumes: existing `t(key)` pattern in `HeroSection.tsx`
- Produces: new i18n keys for hero strings

- [ ] **Step 1: Read current i18n keys**

```bash
grep -n "hero_\|landing_pi_badge\|cta_" src/i18n/en.json | head -15
```

Expected: Shows current hero-related keys like `hero_create_your`, `hero_ai_identity`, etc.

- [ ] **Step 2: Update English hero keys**

In `src/i18n/en.json`, replace the hero section keys:

```json
"hero_create_your": "Portable Identity",
"hero_ai_identity": "for AI Agents",
"hero_subtitle": "The discovery layer for AI agents. One manifest — any runtime.",
"landing_pi_badge": "OpenIdentity Protocol",
"hero_cta_create": "Get Started",
"hero_cta_explore": "Read the Spec"
```

- [ ] **Step 3: Update Arabic hero keys**

In `src/i18n/ar.json`, mirror the translations:

```json
"hero_create_your": "هوية محمولة",
"hero_ai_identity": "للوكلاء الأذكياء",
"hero_subtitle": "طبقة الاكتشاف للوكلاء الأذكياء. وثيقة واحدة — أي بيئة تشغيل.",
"landing_pi_badge": "بروتوكول OpenIdentity",
"hero_cta_create": "ابدأ الآن",
"hero_cta_explore": "اطّلع على المواصفات"
```

- [ ] **Step 4: Verify HeroSection uses these keys**

```bash
grep "t(" src/components/landing/HeroSection.tsx
```

Expected: Shows `t("hero_create_your")`, `t("hero_ai_identity")`, etc. No hardcoded English strings remain.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/ && git commit -m "feat(landing): update hero copy for OpenIdentity positioning ۞"
```

---

### Task 2: FeaturesSection Badge i18n

**Files:**
- Modify: `src/i18n/en.json`
- Modify: `src/i18n/ar.json`
- Modify: `src/components/landing/FeaturesSection.tsx`

**Interfaces:**
- Consumes: existing `FEATURES` array in `FeaturesSection.tsx`
- Produces: 3 new i18n keys for step badges

- [ ] **Step 1: Add badge i18n keys to en.json**

Add to `src/i18n/en.json`:

```json
"landing_badge_w3c": "W3C DID Standard",
"landing_badge_zkp": "ZKP Privacy Ready",
"landing_badge_pi": "Pi Network Compatible"
```

- [ ] **Step 2: Add Arabic translations to ar.json**

```json
"landing_badge_w3c": "معيار W3C DID",
"landing_badge_zkp": "جاهز لإثباتات ZKP",
"landing_badge_pi": "متوافق مع Pi Network"
```

- [ ] **Step 3: Read FeaturesSection.tsx to find badge locations**

```bash
grep -n "W3C DID\|ZKP\|Pi Network" src/components/landing/FeaturesSection.tsx
```

- [ ] **Step 4: Replace hardcoded badges with t() calls**

In `src/components/landing/FeaturesSection.tsx`, replace each hardcoded badge string:

```tsx
// Before (example):
// badge: "W3C DID Standard",
// After:
badge: t("landing_badge_w3c"),
```

Apply to all 3 badges in the `FEATURES` array.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/ src/components/landing/FeaturesSection.tsx && git commit -m "fix(landing): wire feature badges through i18n ۞"
```

---

### Task 3: InteractiveShowcase i18n Wiring

**Files:**
- Modify: `src/i18n/en.json`
- Modify: `src/i18n/ar.json`
- Modify: `src/components/landing/InteractiveShowcase.tsx`

**Interfaces:**
- Consumes: existing `t(key)` pattern. Component is `"use client"` — `t` comes from `useLanguage()`
- Produces: ~20 new i18n keys

- [ ] **Step 1: Read current InteractiveShowcase to identify all hardcoded strings**

```bash
wc -l src/components/landing/InteractiveShowcase.tsx
grep -n '"[A-Z]' src/components/landing/InteractiveShowcase.tsx | head -30
```

Expected: Shows all quoted English strings (tab labels, headings, descriptions).

- [ ] **Step 2: Extract strings and add to en.json**

Add these keys to `src/i18n/en.json`:

```json
// Tab labels
"showcase_tab_roadmap": "Protocol Roadmap",
"showcase_tab_core": "Identity Core",
"showcase_tab_capsule": "Identity Capsule",

// Roadmap tab
"showcase_roadmap_title": "Evolution of the Protocol",
"showcase_roadmap_subtitle": "From MVP to a Global Autonomous Identity Network",
"showcase_roadmap_q3_title": "Identity-First AI",
"showcase_roadmap_q3_desc": "Single-click Agent Creation",
"showcase_roadmap_q4_title": "Portable Trust",
"showcase_roadmap_q4_desc": "Cross-platform Identity Verification",
"showcase_roadmap_q1_title": "Autonomous Network",
"showcase_roadmap_q1_desc": "Self-governing Agent Economy",

// Core tab
"showcase_core_title": "Event-Driven Job Orchestration",
"showcase_core_desc": "Identity Core description",

// Capsule tab
"showcase_capsule_title": "The Identity Capsule",
"showcase_capsule_desc": "Identity Capsule description"
```

Adjust the key names and values to match the actual strings in `InteractiveShowcase.tsx`. The exact strings depend on what we find in step 1.

- [ ] **Step 3: Add Arabic translations**

Mirror all keys in `src/i18n/ar.json` with Arabic translations.

- [ ] **Step 4: Replace hardcoded strings with t() calls**

```tsx
// Before:
// <h3>Protocol Roadmap</h3>
// After:
<h3>{t("showcase_tab_roadmap")}</h3>
```

Apply to all ~20 strings in the component.

- [ ] **Step 5: Verify no hardcoded strings remain**

```bash
grep -n '>[A-Z]' src/components/landing/InteractiveShowcase.tsx | grep -v 't(' | grep -v 'className\|href=\|key=\|var(--\|<br\|<path\|<svg\|<div\|<span\|<p\|{/>'
```

Expected: No remaining hardcoded English strings.

- [ ] **Step 6: Build + lint**

```bash
npm run build 2>&1 | tail -5 && npx eslint --max-warnings 0
```

Expected: Build passes, 0 lint warnings.

- [ ] **Step 7: Commit**

```bash
git add src/i18n/ src/components/landing/InteractiveShowcase.tsx && git commit -m "fix(landing): wire InteractiveShowcase through i18n ۞"
```

---

### Task 4: InteractiveCommandDemo i18n Wiring

**Files:**
- Modify: `src/i18n/en.json`
- Modify: `src/i18n/ar.json`
- Modify: `src/components/landing/InteractiveCommandDemo.tsx`

**Interfaces:**
- Consumes: existing `t(key)` pattern
- Produces: ~15 new i18n keys

- [ ] **Step 1: Read current InteractiveCommandDemo strings**

```bash
grep -n 'const\|t(' src/components/landing/InteractiveCommandDemo.tsx | head -20
```

- [ ] **Step 2: Extract all command labels and output strings**

Identify all bilingual helper usages like:
```tsx
const t = (en: string, ar: string) => (language === "en" ? en : ar);
```

Replace each inline `t(en, ar)` call with a proper `t("key")` lookup.

- [ ] **Step 3: Add keys to en.json + ar.json**

Add all extracted strings as i18n keys in both locale files.

- [ ] **Step 4: Replace inline bilingual helper with t() calls**

```tsx
// Before:
// const t = (en, ar) => language === "en" ? en : ar;
// <span>{t("connect", "اتصال")}</span>

// After (remove the local t helper):
// <span>{t("command_connect")}</span>
```

- [ ] **Step 5: Verify**

```bash
npm run build 2>&1 | tail -5
```

Expected: Build passes.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/ src/components/landing/InteractiveCommandDemo.tsx && git commit -m "fix(landing): wire InteractiveCommandDemo through i18n ۞"
```

---

### Task 5: Theme Hardcode Fixes

**Files:**
- Modify: `src/components/Footer.tsx`
- Modify: `src/components/landing/InteractiveShowcase.tsx`
- Modify: `src/components/landing/InteractiveCommandDemo.tsx`

**Interfaces:**
- Consumes: CSS variables `--bg-deep`, `--bg-card` defined in `globals.css`
- Produces: Theme-consistent landing page

- [ ] **Step 1: Fix Footer background**

In `src/components/Footer.tsx`, replace:
```tsx
// Before:
className="bg-[#10131a] ..."
// After:
className="bg-surface-deep ..."
```

Replace all instances (minimal and full mode).

- [ ] **Step 2: Fix InteractiveShowcase card backgrounds**

In `src/components/landing/InteractiveShowcase.tsx`, replace:
```tsx
// Before:
className="bg-[#101217] ..."
// After:
className="bg-surface-deep ..."
```

- [ ] **Step 3: Fix InteractiveCommandDemo terminal background**

In `src/components/landing/InteractiveCommandDemo.tsx`, replace:
```tsx
// Before:
className="bg-black/60 ..."
// After:
className="bg-surface-deep ..."
```

- [ ] **Step 4: Build + verify**

```bash
npm run build 2>&1 | tail -5
```

Expected: Build passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/ && git commit -m "fix(theme): replace hardcoded backgrounds with CSS variables ۞"
```

---

### Verification (Run After All Tasks)

```bash
npm run build && npx tsc --noEmit && npx eslint --max-warnings 0 && npm test -- --silent --forceExit 2>&1 | tail -5
```

Expected: Build ✅, TypeScript ✅, Lint ✅, Tests pass (pre-existing failures only).
