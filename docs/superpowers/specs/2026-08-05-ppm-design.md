# PPM — PAI Package Manager & Auditor Design Spec

**Date:** 2026-08-05  
**Status:** Approved  
**Repo:** `pai-list/ppm` (new)  
**Module:** `github.com/pai-list/ppm`  
**Language:** Go 1.22+, zero external dependencies (stdlib only)

---

## 1. Purpose

Detect dependency drift across the PAI Universe organization's ~30 repositories before it breaks CI. Four detectors:
- **duplicate** — same `package.json` `name` declared in multiple workspaces (e.g., `@axiomid/agent-app-models` ×2 in #401).
- **drift** — shared dependency (`typescript`, `react`, `@cloudflare/workers-types`) with differing version ranges across workspaces.
- **missing** — bare `import`/`require` tokens found in TS/JS source that resolve to no declared dependency.
- **orphan** — declared dependency never imported anywhere (cheap freebie from missing scan).

Outputs: human-readable CLI table + machine-readable `.pai/ppm-health.json` for CI/CD automation.

---

## 2. Architecture

```
pai-list/ppm/
├── cmd/ppm/main.go              # CLI entry: scan, health, version
├── pkg/
│   ├── scanner/scanner.go       # WalkDir → find package.json → JSON parse (encoding/json)
│   ├── graph/graph.go           # Unified graph: name → deps, producers, version range
│   └── audit/audit.go           # Four detectors (pure functions on graph)
├── internal/tsregex/tsregex.go  # Minimal import/require extractor for TS/JS (regex heuristic)
├── scripts/ppm-ts/              # TS automation: dedupe to workspace:*, CHANGELOG, auto-PR via Octokit
├── testdata/                    # Fixture workspaces for go test
├── .github/workflows/ppm-scan.yml
└── go.mod
```

**Design principles:**
- Zero external deps — only Go stdlib (`encoding/json`, `filepath`, `strings`, `text/tabwriter`).
- Each `pkg/*` is a single file, <200 lines, one responsibility.
- Detectors are pure functions: `func Detect(graph) []Finding` — trivial to unit-test with fixtures.
- TS regex extractor is deliberately conservative (`ponytail:` ceiling — not a full resolver; add monorepo path-alias support when needed).

---

## 3. Data Flow

```
scan [paths...] --deep
   │
   ├─→ scanner.Walk(paths) → []*pkg.Node {Name, Version, Deps, DevDeps, Path, Imports[]}
   │
   ├─→ graph.Build(nodes) → *Graph {ByName map[string][]*Node, AllDeps map[string]VersionSet}
   │
   ├─→ audit.Duplicate(graph)   → []Finding{Type:"duplicate", Pkg, Locations[]}
   ├─→ audit.Drift(graph)       → []Finding{Type:"drift", Dep, VersionRanges[]}
   ├─→ audit.Missing(graph)     → []Finding{Type:"missing", Import, File, SuggestedDep}
   └─→ audit.Orphan(graph)      → []Finding{Type:"orphan", Dep, DeclaredIn}
   │
   ├─→ stdout: tabwriter table (Type, Package, Detail, Locations)
   └─→ --json: .pai/ppm-health.json {scan_ts, repo, findings[], summary}
```

`--deep` = follow symlinks + recurse into all subdirectories (default: maxdepth 3 to avoid node_modules noise).

---

## 4. Detector Specifications

| Detector | Input | Logic | Finding Fields |
|---|---|---|---|
| duplicate | Graph.ByName | `len(nodes) > 1` for same `name` | `pkg`, `locations[]` (repo+path) |
| drift | Graph.AllDeps | same dep name, `len(versionRanges) > 1` after semver normalize | `dep`, `ranges[]`, `workspaces[]` |
| missing | Node.Imports ∉ (Deps ∪ DevDeps) | regex finds `from 'x'` / `require('x')` / `import 'x'`; check if `x` in declared deps | `import`, `file`, `suggested` (closest npm name) |
| orphan | Deps ∪ DevDeps ∉ Imports | inverse of missing — declared but never referenced | `dep`, `declared_in[]` |

**Semver normalize:** strip `^`, `~`, `>=`, `<=` → keep major.minor.patch for drift comparison. Exact match on normalized range = no drift.

---

## 5. CLI Interface

```
ppm scan [paths...] [--deep] [--json] [--format table|json]
ppm health                  # reads .pai/ppm-health.json, prints summary
ppm version                 # prints git describe --tags
```

Exit codes: 0 = clean, 1 = findings, 2 = usage/error.

---

## 6. GitHub Action: `.github/workflows/ppm-scan.yml`

```yaml
name: PPM Dependency Scan
on:
  schedule: [{cron: "0 */12 * * *"}]   # every 12h
  workflow_dispatch:
permissions:
  contents: read
  issues: write
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5 {go-version: '1.22'}
      - run: go build -o ppm ./cmd/ppm
      - run: ./ppm scan --deep --json .  # or matrix over org repos via gh repo list
      - if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            // create/deduplicate issue "[PPM] Dependency drift detected"
            // body = ppm-health.json findings rendered as markdown table
```

Multi-repo scan: `gh repo list pai-list --json name -q '.[].name'` → matrix strategy (each repo checkout) or single runner cloning all. Start with single-runner for simplicity (`ponytail:` matrix adds infra complexity; add when org > 50 repos).

---

## 7. TS Automation Package (`scripts/ppm-ts/`)

Separate npm package `@pai/ppm` (published from this repo, or local script):

```ts
// scripts/ppm-ts/index.ts
export async function applyFixes(healthPath: string, options: {dryRun: boolean, token: string})
```

- Reads `ppm-health.json`
- For each `duplicate`/`drift` finding:
  - Rewrite matching deps to `workspace:*` in each `package.json`
  - Append CHANGELOG entry under `## [Unreleased]`
  - If `--apply` (not dry-run): create PR via Octokit with title `[PPM] Fix dependency drift: <pkg>`
- Default `dryRun: true` — safe by default.

---

## 8. Testing

- `go test ./...` with `testdata/` fixtures:
  - `testdata/dup/` — two workspaces same name
  - `testdata/drift/` — typescript ^5.0 vs ^5.3
  - `testdata/missing/` — TS file imports `lodash` not in deps
  - `testdata/orphan/` — dep declared, no imports
- One table-driven test per detector (`TestDuplicate`, `TestDrift`, `TestMissing`, `TestOrphan`).
- No CI yet — added on repo creation.

---

## 9. Non-Goals (YAGNI)

- Full TS/JS resolver (path aliases, exports map, monorepo links) — regex heuristic covers 90%.
- Lockfile parsing (`pnpm-lock.yaml`, `package-lock.json`) — version ranges from `package.json` are sufficient for drift.
- Private registry auth — org is public GitHub Packages / npm public.
- Auto-merge PRs — human review required per SOUL governance.

---

## 10. Acceptance Criteria

- `ppm scan --deep --json .` on pai-universe root produces valid `.pai/ppm-health.json` with zero false positives on current org state.
- GH Action runs on 12h cron, creates deduplicated issue on findings.
- TS automation `dryRun` produces correct `workspace:*` rewrites on fixture.
- All `go test ./...` pass.

---

## 11. Open Questions (Resolved)

| Question | Decision |
|---|---|
| Repo location | `pai-list/ppm` (new dedicated repo) |
| Scan scope | Local paths only (`--deep` recurse) |
| Language | Go stdlib only |
| TS automation | Separate `@pai/ppm` script in `scripts/ppm-ts/` |

---

*Spec self-review: no placeholders, no contradictions, scope is single implementation plan.*