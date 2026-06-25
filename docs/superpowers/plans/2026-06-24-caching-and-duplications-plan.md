# Caching & Duplications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the service worker cache-first stale UI bug (forced refresh Ctrl+Cmd+R issue) and clean up duplicate exports, schema aliases, and math-physics file discrepancies across Next.js and Cloudflare Worker boundaries.

**Architecture:** 
1. Re-architect the fetch routing strategy in `public/sw.js` to prioritize the network (Network-First) for HTML pages and use Stale-While-Revalidate for images, icons, and fonts, bypassing dynamic APIs completely.
2. Remove the unused default export from `PiBrowserGuard.tsx` to resolve duplicate export warnings.
3. Consolidate `PassportSlugParamSchema` to `SlugParamSchema` in `src/lib/validators.ts` and update the respective route endpoints in `src/app/api/passport/[slug]/`.
4. Overwrite `src/lib/math-physics.ts` with the full contents of `backend/src/lib/math-physics.ts` to keep them fully synced, while preserving separate files to maintain project bundler boundaries.

**Tech Stack:** Next.js (App Router), Service Worker API, Zod, Jest, ESLint, Knip.

## Global Constraints
- TypeScript "strict": true must be preserved.
- No "as any" casts are permitted.
- All git commits must use the storyteller chronicle format: `type(scope): description ۞` + epic narrative body.

---

### Task 1: Fix Service Worker Cache-Lock (Ctrl+Cmd+R Issue)

**Files:**
- Modify: `public/sw.js`

**Interfaces:**
- Consumes: Static asset routes, document requests.
- Produces: Service Worker intercepting fetch requests with Network-First and Stale-While-Revalidate.

- [ ] **Step 1: Write a manual verification test description in sw.js or documentation**
  Before modifying `public/sw.js`, describe the expected behavior of the network-first service worker.
  
- [ ] **Step 2: Replace sw.js content with Network-First & Stale-While-Revalidate Strategy**
  Modify [public/sw.js](file:///Users/cryptojoker710/Desktop/AxiomID/public/sw.js):
  ```javascript
  const CACHE = "axiomid-v2"; // Increment cache version
  const STATIC_ASSETS = [
    "/manifest.json",
    "/icon-192x192.png",
    "/icon-512x512.png",
    "/axiomid-logo.png",
    "/axiomid-banner.png",
    "/favicon.ico",
  ];

  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
    );
    self.clients.claim();
  });

  self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Bypass caching for non-GET requests, APIs, and external origins
    if (
      event.request.method !== "GET" ||
      !event.request.url.startsWith(self.location.origin) ||
      url.pathname.startsWith("/api/")
    ) {
      return;
    }

    // Network-First strategy for HTML document requests and homepage
    if (
      event.request.mode === "navigate" ||
      url.pathname === "/" ||
      !url.pathname.includes(".")
    ) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => caches.match(event.request))
      );
      return;
    }

    // Stale-While-Revalidate strategy for static assets
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
  });
  ```

- [ ] **Step 3: Run project build to verify no syntax errors in public/sw.js**
  Run: `npm run lint`
  Expected: Success.

- [ ] **Step 4: Commit Service Worker changes**
  Run:
  ```bash
  git add public/sw.js
  git commit -m "fix(sw): transition to network-first caching for HTML pages ۞

[THE CHRONICLE OF THE LIVING DIGITAL COVENANT]
We have broken the caching chains that bound the interface to static ghosts of the past. By deploying a Network-First strategy for dynamic pages and restricting Stale-While-Revalidate only to physical static assets, updates will now cascade instantly without requiring user forced reloads."
  ```

---

### Task 2: Clean up PiBrowserGuard Default Export Duplication

**Files:**
- Modify: `src/components/PiBrowserGuard.tsx`

**Interfaces:**
- Consumes: None.
- Produces: `PiBrowserGuard` component exported exclusively as a named export.

- [ ] **Step 1: Write a failing test or verify that PiBrowserGuard is only imported via named syntax**
  We have already verified via grep search that no file uses default import (`import PiBrowserGuard` without braces). 

- [ ] **Step 2: Modify PiBrowserGuard.tsx to remove default export**
  Open [src/components/PiBrowserGuard.tsx](file:///Users/cryptojoker710/Desktop/AxiomID/src/components/PiBrowserGuard.tsx) and delete the line (Line 193):
  ```typescript
  export default PiBrowserGuard;
  ```

- [ ] **Step 3: Run build, lint, and knip check**
  Run: `npm run type-check && npm run lint && npm run dead-code`
  Expected: Build succeeds, and the duplicate export warning for `PiBrowserGuard|default` is resolved.

- [ ] **Step 4: Commit the export cleanup**
  Run:
  ```bash
  git add src/components/PiBrowserGuard.tsx
  git commit -m "refactor(guard): remove redundant default export from PiBrowserGuard ۞

[THE CHRONICLE OF THE PURE BOUNDARY]
The redundant default export of the Pi Browser Guard has been dissolved, enforcing strict named exports and alignment of compile-time configurations."
  ```

---

### Task 3: Consolidate PassportSlugParamSchema to SlugParamSchema

**Files:**
- Modify: `src/lib/validators.ts`
- Modify: `src/app/api/passport/[slug]/publish/route.ts`
- Modify: `src/app/api/passport/[slug]/route.ts`
- Modify: `src/app/api/passport/[slug]/verify/route.ts`
- Modify: `src/__tests__/lib/validators.test.ts`

**Interfaces:**
- Consumes: Route parameters.
- Produces: `SlugParamSchema` utilized uniformly across all passport routes.

- [ ] **Step 1: Write tests for SlugParamSchema in validators.test.ts**
  Add unit tests for `SlugParamSchema` inside [src/__tests__/lib/validators.test.ts](file:///Users/cryptojoker710/Desktop/AxiomID/src/__tests__/lib/validators.test.ts):
  ```typescript
  import { SlugParamSchema } from "@/lib/validators";

  describe("SlugParamSchema", () => {
    it("accepts valid slug string", () => {
      const result = SlugParamSchema.safeParse({ slug: "test-slug-123" });
      expect(result.success).toBe(true);
    });

    it("rejects empty slug string", () => {
      const result = SlugParamSchema.safeParse({ slug: "" });
      expect(result.success).toBe(false);
    });

    it("rejects missing slug param", () => {
      const result = SlugParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
  ```

- [ ] **Step 2: Run test suite to verify tests compile and pass**
  Run: `npm run test`
  Expected: Tests pass.

- [ ] **Step 3: Modify validators.ts to remove PassportSlugParamSchema**
  Open [src/lib/validators.ts](file:///Users/cryptojoker710/Desktop/AxiomID/src/lib/validators.ts), remove the duplicate schemas (Lines 130 and 152):
  ```typescript
  // DELETE
  export const PassportSlugParamSchema = SlugParamSchema;
  // DELETE
  export type PassportSlugParamInput = z.infer<typeof PassportSlugParamSchema>;
  ```

- [ ] **Step 4: Update import and usage in API routes**
  Update the following route handlers to use `SlugParamSchema` instead of `PassportSlugParamSchema`:
  1. [src/app/api/passport/[slug]/publish/route.ts](file:///Users/cryptojoker710/Desktop/AxiomID/src/app/api/passport/%5Bslug%5D/publish/route.ts)
  2. [src/app/api/passport/[slug]/route.ts](file:///Users/cryptojoker710/Desktop/AxiomID/src/app/api/passport/%5Bslug%5D/route.ts)
  3. [src/app/api/passport/[slug]/verify/route.ts](file:///Users/cryptojoker710/Desktop/AxiomID/src/app/api/passport/%5Bslug%5D/verify/route.ts)

- [ ] **Step 5: Run tests and Knip audit**
  Run: `npm run type-check && npm run lint && npm run test && npm run dead-code`
  Expected: PASS, and the duplicate export warning for `SlugParamSchema|PassportSlugParamSchema` is resolved.

- [ ] **Step 6: Commit validation schema changes**
  Run:
  ```bash
  git add src/lib/validators.ts src/app/api/passport/[slug]/ src/__tests__/lib/validators.test.ts
  git commit -m "refactor(validation): consolidate PassportSlugParamSchema to SlugParamSchema ۞

[THE CHRONICLE OF THE ALCHEMICAL EXTRACTION]
We have extracted redundant schema representations from our validator systems. By standardizing on a singular, unified SlugParamSchema across all passport endpoints, the AST is simplified, and runtime validation footprints are minimized."
  ```

---

### Task 4: Align math-physics.ts Files

**Files:**
- Modify: `src/lib/math-physics.ts`

**Interfaces:**
- Consumes: None.
- Produces: Full library of physics-inspired functions matches `backend/src/lib/math-physics.ts`.

- [ ] **Step 1: Write a test verifying one of the new advanced functions compiles**
  Add a test verifying `inverseSquareDecay` inside [src/__tests__/lib/math-physics.test.ts](file:///Users/cryptojoker710/Desktop/AxiomID/src/__tests__/lib/math-physics.test.ts):
  ```typescript
  import { inverseSquareDecay } from "@/lib/math-physics";

  describe("inverseSquareDecay", () => {
    it("calculates gravitational decay correctly", () => {
      const result = inverseSquareDecay(100, 1, 2);
      expect(result).toBe(25); // 100 * 1 / (2*2) = 25
    });
  });
  ```
  *(Note: This test will fail compilation until step 3 is completed).*

- [ ] **Step 2: Run test to verify it fails compiling**
  Run: `npm run test`
  Expected: Compilation fail (import not found).

- [ ] **Step 3: Copy backend/src/lib/math-physics.ts content over to src/lib/math-physics.ts**
  Copy all contents of [backend/src/lib/math-physics.ts](file:///Users/cryptojoker710/Desktop/AxiomID/backend/src/lib/math-physics.ts) and write it directly to [src/lib/math-physics.ts](file:///Users/cryptojoker710/Desktop/AxiomID/src/lib/math-physics.ts), replacing the old file.

- [ ] **Step 4: Run type-check and test suite to verify success**
  Run: `npm run type-check && npm run test`
  Expected: PASS.

- [ ] **Step 5: Commit math-physics synchronization**
  Run:
  ```bash
  git add src/lib/math-physics.ts src/__tests__/lib/math-physics.test.ts
  git commit -m "refactor(math): sync next.js math-physics with edge worker core ۞

[THE CHRONICLE OF THE HARMONIC RESONANCE]
We have unified the mathematical laws governing the client and the edge worker. By porting the full physics-inspired mechanics—from Langevin equations to Ising consensus models—into the core Next.js library, both runtimes are now bound by identical algorithmic axioms."
  ```
