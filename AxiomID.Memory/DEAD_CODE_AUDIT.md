# Dead & Extra Code Audit — 2026-07-21
> Verified with grep + import analysis across 551 TS/TSX files

## Summary

| Category | Files | Bytes | Status |
|:---------|:------|:------|:-------|
| **Dead source files** | 6 | 36,837 | Safe to delete |
| **Duplicate index files** | 3 | 45,953 | Safe to delete (keep 1 copy) |
| **Duplicate `lib/lib/` directory** | 8 | ~62,000 | Needs migration |
| **Unused dependency** | 1 | — | Safe to remove from package.json |
| **Broken import (bug)** | 1 | — | Needs fix |
| **TOTAL WASTE** | 18 | ~145 KB | |

---

## 1. DEAD SOURCE FILES (zero references, safe to delete)

| File | Size | Why Dead |
|:-----|:-----|:---------|
| `src/lib/lib/vercel-labs-ecosystem.ts` | 29,181 | Vercel Labs ecosystem map — never imported |
| `src/components/landing/HowItWorksSection.tsx` | 3,504 | Landing section — never imported |
| `src/components/landing/FinalCTASection.tsx` | 2,458 | Landing CTA — never imported |
| `src/types/auth-md.ts` | 826 | Type file — never imported |
| `src/components/dashboard/PiBrowserBadge.tsx` | 705 | Badge component — never imported |
| `src/components/PAIAnimated.ts` | 163 | Animation helper — never imported |

**Total: 36,837 bytes (36 KB)**

---

## 2. DUPLICATE INDEX FILES (identical MD5)

### `index.ts` — 3 identical copies (MD5: 39650ea0...)
- `src/components/index.ts` ← KEEP
- `src/components/pai/components/index.ts` ← DELETE (identical)
- `src/components/pai/index.ts` ← DELETE (identical)

### `ui/index.tsx` — 2 identical copies (MD5: 58d904e6...)
- `src/components/pai/components/ui/index.tsx` ← KEEP
- `src/components/pai/ui/index.tsx` ← DELETE (identical)

**Total waste: 45,953 bytes (45 KB)**

---

## 3. DUPLICATE `src/lib/lib/` DIRECTORY

Created accidentally in commit `a9f9a2c` ("fix: PAI build"). Contains 8 files:

| File | Has equivalent in `src/lib/`? | Status |
|:-----|:-----------------------------|:-------|
| `vercel-labs-ecosystem.ts` | No | DEAD — delete |
| `utils.ts` | Yes (DIFFERENT content) | Needs merge |
| `use-physics.ts` | Yes (IDENTICAL) | Delete duplicate |
| `i18n/config.ts` | No | Unique — migrate to `src/lib/i18n/` |
| `i18n/translations.ts` | No | **ALIVE** — imported by `language-context.tsx` |
| `i18n/translations/en.json` | No | Unique — migrate |
| `i18n/translations/ar.json` | No | Unique — migrate |
| `i18n/translations/zh.json` | No | Unique — migrate |

**Action:** Migrate `i18n/` files to `src/lib/i18n/`, delete `src/lib/lib/` entirely, update import in `language-context.tsx`.

---

## 4. UNUSED DEPENDENCY

| Package | In `package.json` | Actually Used |
|:--------|:------------------|:-------------|
| `isomorphic-dompurify` | dependencies | **NO** — removed from `layout.tsx`, replaced with `escapeJsonLd` |

**Action:** `npm uninstall isomorphic-dompurify`

Note: `@types/d3` IS used — `d3` is imported in `src/components/dashboard/tabs/IqraMesh.tsx`.

---

## 5. BROKEN IMPORT BUG — PassportView.tsx

`src/app/passport/[slug]/PassportView.tsx` has a **mismatched import**:

```
IMPORTS: PassportQR  (from "@/components/PassportQR")
USES:    <AgentQR>   (old component, no import)
```

The import was changed from `AgentQR` → `PassportQR` but the JSX usage was NOT updated. This means:
- `PassportQR` is imported but never used → dead import
- `AgentQR` is used but never imported → would cause runtime error

**Fix:** Change `<AgentQR did={passport.did} />` to `<PassportQR did={passport.did} />`

---

## 6. FILES INITIALLY FLAGGED BUT ACTUALLY ALIVE

| File | Why Flagged | Why Actually Alive |
|:-----|:-----------|:-------------------|
| `src/app/global-error.tsx` | No imports | Next.js convention — auto-loaded |
| `src/app/robots.ts` | No imports | Next.js convention — /robots.txt |
| `src/app/sitemap.ts` | No imports | Next.js convention — /sitemap.xml |
| `src/components/ui/NetworkGraph.tsx` | No direct imports | Dynamic import in `explorer/page.tsx` |
| `src/components/dashboard/TerminalOverlay.tsx` | No direct imports | Dynamic import in `dashboard/page.tsx` |
| `src/types/global.d.ts` | No imports | TS auto-loads `.d.ts` files |
| `src/lib/lib/i18n/translations.ts` | Weird path | Imported by `language-context.tsx` |
| `src/components/AgentQR.tsx` | "Replaced" | Still used in PassportView (broken import) |
