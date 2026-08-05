# Documentation Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans.

**Goal:** Convert `/docs` from single-page SPA to multi-page MDX directory with sidebar navigation, anchor nav, and client-side search.

**Architecture:** Content as Markdown files in `content/docs/`, Next.js App Router for routing (`/docs/[slug]`), client-side sidebar + search in `layout.tsx`, anchor nav from markdown headings.

**Tech Stack:** Next.js 16 App Router, gray-matter (frontmatter parsing), glob for content discovery. No new external dependencies — search is native `String.includes()`.

## Global Constraints

- All doc content is static Markdown — no JSX in MDX, no interactive components
- Sidebar uses frontmatter `order` field for sorting
- Anchor nav extracts headings from markdown AST
- Search filters by title + first 100 chars of body
- Build must pass: `npm run build` (no new errors)
- Lint: `npx eslint --max-warnings 0`
- TypeScript: `npx tsc --noEmit` (clean)

---

### Task 1: Create Content Directory + Write Markdown Files

**Files:**
- Create: `content/docs/intro.md`
- Create: `content/docs/architecture.md`
- Create: `content/docs/stamps.md`
- Create: `content/docs/kya.md`
- Create: `content/docs/passport.md`
- Create: `content/docs/sdk.md`
- Create: `content/docs/api-reference.md`

**Interfaces:**
- Consumes: Current content from `src/app/docs/page.tsx` (4 existing sections)
- Produces: 7 `.md` files with YAML frontmatter (`title`, `order`, `section`)

- [ ] **Step 1: Create content/docs/ directory**

```bash
mkdir -p content/docs
```

- [ ] **Step 2: Create intro.md**

```markdown
---
title: Getting Started
order: 1
section: getting-started
---

# Getting Started with OpenIdentity

OpenIdentity is a portable identity manifest for AI agents. ...

<!-- Content migrated from current docs "Introduction" section -->
```

Copy the "Introduction" section content from `src/app/docs/page.tsx` (the `renderIntroduction()` function output).

- [ ] **Step 3: Create architecture.md**

```markdown
---
title: Architecture
order: 2
section: getting-started
---

# Architecture Overview

OpenIdentity sits at the identity layer of the AI protocol stack:

| Protocol | Layer | Purpose |
|----------|-------|---------|
| A2A | Interaction | How agents talk |
| MCP | Capability | How agents use tools |
| OpenIdentity | Identity | Who agents are |
| KYA | Trust | How agents prove |

... (content from OpenIdentity.md section 1.3 Protocol Landscape)
```

- [ ] **Step 4: Create stamps.md**

Migrate the "Identity Stamps" section from `src/app/docs/page.tsx`. Keep the 6 stamp types table, XP values, trust formula.

```markdown
---
title: Identity Stamps
order: 3
section: core-concepts
---

# Identity Stamps

...
```

- [ ] **Step 5: Create kya.md**

```markdown
---
title: KYA Protocol
order: 4
section: core-concepts
---

# Know Your Agent (KYA)

...
```

Content adapted from `docs/openidentity/KYA.md` — the protocol overview and verification flow.

- [ ] **Step 6: Create passport.md**

```markdown
---
title: Agent Passport
order: 5
section: core-concepts
---

# Agent Passport

...
```

Content adapted from `docs/openidentity/AgentPassport.md` — what a passport contains and how to read one.

- [ ] **Step 7: Create sdk.md**

Migrate the "SDK & Integration" section from `src/app/docs/page.tsx`.

- [ ] **Step 8: Create api-reference.md**

Migrate the "API Reference" section from `src/app/docs/page.tsx`. Keep the route table and response examples.

- [ ] **Step 9: Build to verify**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds (content dir doesn't affect build yet — no routes consume it).

- [ ] **Step 10: Commit**

```bash
git add content/ && git commit -m "feat(docs): create content directory with 7 markdown files ۞"
```

---

### Task 2: Create Docs Layout + Sidebar

**Files:**
- Create: `src/app/docs/layout.tsx`
- Create: `src/components/docs/DocsSidebar.tsx`

**Interfaces:**
- Consumes: `content/docs/*.md` (via glob or static import)
- Produces: `<DocsLayout>` that wraps all docs pages with sidebar + search bar

- [ ] **Step 1: Create src/app/docs/layout.tsx**

```tsx
import { DocsSidebar } from "@/components/docs/DocsSidebar";

// Import frontmatter from all docs
const docs = [
  { slug: "intro", title: "Getting Started", section: "getting-started", order: 1 },
  { slug: "architecture", title: "Architecture", section: "getting-started", order: 2 },
  // ... remaining entries
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <DocsSidebar docs={docs} />
      <main className="flex-1 px-8 py-12">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Create src/components/docs/DocsSidebar.tsx**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type DocEntry = {
  slug: string;
  title: string;
  section: string;
  order: number;
};

const SECTION_LABELS: Record<string, string> = {
  "getting-started": "Getting Started",
  "core-concepts": "Core Concepts",
  "integration": "Integration",
};

export function DocsSidebar({ docs }: { docs: DocEntry[] }) {
  const pathname = usePathname();
  const currentSlug = pathname.replace("/docs/", "");

  const sections = [...new Set(docs.map(d => d.section))];

  return (
    <aside className="w-64 shrink-0 border-r border-[var(--card-border)] p-6">
      <nav>
        {sections.map(section => (
          <div key={section} className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              {SECTION_LABELS[section]}
            </h3>
            <ul className="space-y-1">
              {docs
                .filter(d => d.section === section)
                .sort((a, b) => a.order - b.order)
                .map(doc => (
                  <li key={doc.slug}>
                    <Link
                      href={`/docs/${doc.slug}`}
                      className={`block rounded px-3 py-1.5 text-sm transition-colors ${
                        currentSlug === doc.slug
                          ? "bg-[var(--bg-card)] text-[var(--text-primary)] font-medium"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                      }`}
                    >
                      {doc.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Add the docs data to layout**

The `docs` array can be a static constant since the content set is small and known at build time. No need for dynamic globbing. Define it in a shared module:

Create `src/lib/docs.ts`:

```typescript
export type DocEntry = {
  slug: string;
  title: string;
  section: "getting-started" | "core-concepts" | "integration";
  order: number;
};

export const DOCS_INDEX: DocEntry[] = [
  { slug: "intro", title: "Getting Started", section: "getting-started", order: 1 },
  { slug: "architecture", title: "Architecture", section: "getting-started", order: 2 },
  { slug: "stamps", title: "Identity Stamps", section: "core-concepts", order: 3 },
  { slug: "kya", title: "KYA Protocol", section: "core-concepts", order: 4 },
  { slug: "passport", title: "Agent Passport", section: "core-concepts", order: 5 },
  { slug: "sdk", title: "SDK & Integration", section: "integration", order: 6 },
  { slug: "api-reference", title: "API Reference", section: "integration", order: 7 },
];
```

- [ ] **Step 4: Commit**

```bash
git add src/app/docs/layout.tsx src/components/docs/DocsSidebar.tsx src/lib/docs.ts && git commit -m "feat(docs): add layout with sidebar navigation ۞"
```

---

### Task 3: Create Docs Page Renderer + Redirect

**Files:**
- Create: `src/app/docs/[slug]/page.tsx`
- Modify: `src/app/docs/page.tsx` (replace with redirect)
- Create: `src/components/docs/DocsPage.tsx`

**Interfaces:**
- Consumes: `DOCS_INDEX` from `src/lib/docs.ts`, Markdown content from `content/docs/*.md`
- Produces: Rendered doc pages with anchor nav

- [ ] **Step 1: Read content files**

Since Next.js App Router doesn't import `.md` files natively, we'll embed content as TypeScript constants. Create `src/lib/docs-content.ts`:

```typescript
export const DOCS_CONTENT: Record<string, { frontmatter: Record<string, unknown>; body: string }> = {
  intro: {
    frontmatter: { title: "Getting Started", order: 1 },
    body: `# Getting Started with OpenIdentity\n\n...`,
  },
  // ... per file
};
```

For simplicity in this first pass, embed the markdown as template literals. If the content grows, switch to `fs.readFileSync` + `gray-matter` at build time.

- [ ] **Step 2: Create DocsPage component**

```tsx
"use client";

import { useMemo } from "react";
import { DOCS_CONTENT } from "@/lib/docs-content";

type Heading = { level: number; text: string; id: string };

function extractHeadings(body: string): Heading[] {
  return body
    .split("\n")
    .filter(line => /^#{2,3}\s/.test(line))
    .map(line => {
      const level = line.match(/^#+/)[0].length;
      const text = line.replace(/^#+\s/, "");
      const id = text.toLowerCase().replace(/[^\w]+/g, "-");
      return { level, text, id };
    });
}

export function DocsPage({ slug }: { slug: string }) {
  const doc = DOCS_CONTENT[slug];
  if (!doc) return null;

  const headings = useMemo(() => extractHeadings(doc.body), [doc.body]);

  return (
    <article className="prose prose-invert max-w-3xl">
      {/* Render markdown body as HTML — for now, simple text rendering */}
      {/* Phase 2 can add a proper MDX compiler */}
      {doc.body.split("\n\n").map((p, i) => {
        if (p.startsWith("# ")) return <h1 key={i}>{p.replace("# ", "")}</h1>;
        if (p.startsWith("## ")) {
          const text = p.replace("## ", "");
          const id = text.toLowerCase().replace(/[^\w]+/g, "-");
          return <h2 key={i} id={id}>{text}</h2>;
        }
        if (p.startsWith("### ")) {
          const text = p.replace("### ", "");
          const id = text.toLowerCase().replace(/[^\w]+/g, "-");
          return <h3 key={i} id={id}>{text}</h3>;
        }
        if (p.startsWith("| ")) {
          // Simple table rendering
          const rows = p.split("\n").filter(r => r.trim());
          return (
            <table key={i}>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.split("|").filter(c => c.trim()).map((cell, ci) => (
                      <td key={ci}>{cell.trim()}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        return <p key={i}>{p}</p>;
      })}
    </article>
  );
}
```

- [ ] **Step 3: Create [slug]/page.tsx**

```typescript
import { notFound } from "next/navigation";
import { DOCS_INDEX } from "@/lib/docs";
import { DocsPage } from "@/components/docs/DocsPage";

export function generateStaticParams() {
  return DOCS_INDEX.map(doc => ({ slug: doc.slug }));
}

export default function DocPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const exists = DOCS_INDEX.some(d => d.slug === slug);
  if (!exists) notFound();

  return <DocsPage slug={slug} />;
}
```

- [ ] **Step 4: Replace src/app/docs/page.tsx with redirect**

```typescript
import { redirect } from "next/navigation";

export default function DocsPage() {
  redirect("/docs/intro");
}
```

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | tail -15
```

Expected: New dynamic routes `/docs/intro`, `/docs/architecture`, etc. Build passes.

- [ ] **Step 6: Commit**

```bash
git add src/app/docs/ src/components/docs/DocsPage.tsx src/lib/docs-content.ts && git commit -m "feat(docs): add multi-page docs renderer with redirect ۞"
```

---

### Task 4: Create Anchor Nav

**Files:**
- Create: `src/components/docs/DocsAnchorNav.tsx`
- Modify: `src/components/docs/DocsPage.tsx`

**Interfaces:**
- Consumes: `headings` array from `extractHeadings()` in DocsPage
- Produces: Sticky right-side TOC

- [ ] **Step 1: Create DocsAnchorNav component**

```tsx
"use client";

import { useState, useEffect } from "react";

type Heading = { level: number; text: string; id: string };

export function DocsAnchorNav({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );

    headings.forEach(h => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="sticky top-24 w-56 shrink-0 hidden xl:block">
      <h4 className="mb-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        On this page
      </h4>
      <ul className="space-y-1">
        {headings.map(h => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`block text-sm transition-colors ${
                h.level === 3 ? "pl-4" : ""
              } ${
                activeId === h.id
                  ? "text-[var(--text-primary)] font-medium"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: Wire DocsAnchorNav into DocsPage**

```tsx
// In DocsPage return:
<DocsAnchorNav headings={headings} />
```

- [ ] **Step 3: Adjust layout to 3-column**

In `src/app/docs/layout.tsx`, update the layout to include the anchor column:

```tsx
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <DocsSidebar docs={docs} />
      <main className="flex-1 px-8 py-12">{children}</main>
      {/* Anchor nav rendered inside DocsPage */}
    </div>
  );
}
```

- [ ] **Step 4: Build + verify**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/docs/DocsAnchorNav.tsx && git commit -m "feat(docs): add sticky anchor navigation ۞"
```

---

### Task 5: Add Client-Side Search

**Files:**
- Create: `src/components/docs/DocsSearch.tsx`
- Modify: `src/app/docs/layout.tsx`

**Interfaces:**
- Consumes: `DOCS_INDEX` + `DOCS_CONTENT` from lib modules
- Produces: Search bar with filtered results dropdown

- [ ] **Step 1: Create DocsSearch component**

```tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DOCS_INDEX } from "@/lib/docs";
import { DOCS_CONTENT } from "@/lib/docs-content";

type DocIndex = {
  slug: string;
  title: string;
  preview: string;
};

export function DocsSearch() {
  const [query, setQuery] = useState("");

  const index: DocIndex[] = useMemo(() => {
    return DOCS_INDEX.map(doc => {
      const content = DOCS_CONTENT[doc.slug];
      const body = content?.body ?? "";
      return {
        slug: doc.slug,
        title: doc.title,
        preview: body.replace(/^#+\s*/gm, "").trim().slice(0, 100),
      };
    });
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return index.filter(
      d => d.title.toLowerCase().includes(q) || d.preview.toLowerCase().includes(q)
    );
  }, [query, index]);

  return (
    <div className="relative mb-6">
      <input
        type="search"
        placeholder="Search docs..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
      />
      {results.length > 0 && (
        <div className="absolute top-full mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--bg-card)] shadow-lg">
          {results.map(r => (
            <Link
              key={r.slug}
              href={`/docs/${r.slug}`}
              className="block px-4 py-2 text-sm hover:bg-[var(--bg-card-hover)]"
              onClick={() => setQuery("")}
            >
              <div className="font-medium text-[var(--text-primary)]">{r.title}</div>
              <div className="text-xs text-[var(--text-faint)] truncate">{r.preview}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire DocsSearch into layout**

In `src/app/docs/layout.tsx`, add the search bar above the sidebar:

```tsx
import { DocsSearch } from "@/components/docs/DocsSearch";

// In the return, above the sidebar nav:
<DocsSearch />
```

- [ ] **Step 3: Build + verify**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/docs/DocsSearch.tsx src/app/docs/layout.tsx && git commit -m "feat(docs): add client-side search bar ۞"
```

---

### Task 6: Clean Up Old Docs Page

**Files:**
- Modify: `src/app/docs/page.tsx` (already replaced with redirect in Task 3)
- Remove: unused content from `src/app/docs/page.tsx` (if any leftover)

**Interfaces:**
- N/A — cleanup only

- [ ] **Step 1: Verify redirect works**

```bash
grep -n "redirect" src/app/docs/page.tsx
```

Expected: Shows `redirect("/docs/intro")`.

- [ ] **Step 2: Remove any unused imports or types from old docs page**

If the old `page.tsx` still has import statements for components that no longer exist, remove them.

- [ ] **Step 3: Full verification**

```bash
npm run build && npx tsc --noEmit && npx eslint --max-warnings 0
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/docs/page.tsx && git commit -m "refactor(docs): clean up old single-page docs, replaced by multi-page ۞"
```

---

### Verification (Cross-Task)

```bash
npm run build && npx tsc --noEmit && npx eslint --max-warnings 0 && npm test -- --silent --forceExit 2>&1 | tail -5
```

Expected: Build ✅ (static routes for docs pages), TypeScript ✅, Lint ✅, Tests pass (pre-existing failures only).
