# PAI SkillBuilder — Skill Authoring & Validation CLI Design Spec

**Date:** 2026-08-05  
**Status:** Approved  
**Repo:** `pai-list/skillbuilder` (new)  
**Module:** `github.com/pai-list/skillbuilder`  
**Language:** Go 1.22+, zero external dependencies (stdlib only)  
**Scope:** *Generate + Validate* pillars only (benchmark/prove pillar explicitly deferred)

---

## 1. Purpose

Provide a zero-dep Go CLI that:
1. **Scaffolds** new skills from templates (`skillbuilder new <name>`)
2. **Validates** existing skills against our org's SKILL.md conventions (`skillbuilder validate <path>`)
3. Emits a lightweight `skillcheck` binary for CI integration (`.github/workflows/skillcheck.yml`)

Skills produced/validated are stored in `pai-list/clawhub` and `pai-list/clawhub-ar` (central registries). This tool is the *authoring + validation layer*; registries are the *storage + distribution layer*.

---

## 2. Architecture

```
pai-list/skillbuilder/
├── cmd/
│   ├── skillbuilder/main.go      # CLI: new, template, validate
│   └── skillcheck/skillcheck.go  # Minimal validator binary (for CI)
├── pkg/
│   ├── skill/skill.go            # SKILL.md parse, frontmatter, section schema
│   ├── profile/profile.go        # Reusable profiles (stack defaults, conventions)
│   └── template/template.go      # Template packs (pai, cloudflare, memory, etc.)
├── packs/                        # Embedded template packs (FS embed)
│   ├── pai/                      # PAI-style skill template
│   ├── cloudflare/               # Cloudflare Workers skill template
│   └── memory/                   # Memory/agent skill template
├── testdata/                     # Fixture SKILL.md files for go test
├── .github/workflows/skillcheck.yml
└── go.mod
```

**Design principles:**
- Zero external deps — only Go stdlib (`embed`, `text/template`, `yaml` via `gopkg.in/yaml.v3` — allowed as single external dep for YAML parsing since stdlib lacks it; alternatively hand-roll tiny YAML frontmatter parser to stay pure stdlib. Decision: pure stdlib — hand-roll frontmatter parser (`---` delimited) to keep zero-dep promise).
- `skillcheck` is a stripped binary (~2MB) with only `validate` command — no template logic.
- Packs embedded via `//go:embed packs/*` — no filesystem dependency at runtime.
- Profiles capture house style once (no emojis, required sections, script refs must exist) and apply to many skills.

---

## 3. SKILL.md Schema (Org Convention)

Frontmatter (required):
```yaml
---
name: lowercase-kebab-case
description: One sentence, imperative mood, ≤80 chars
---
```

Required sections (validated):
1. `# Skill: <name>` — H1 matching frontmatter name
2. `## Purpose` or `## What it does` — one paragraph
3. `## When to use` / `## Triggers` — bullet list of triggers
4. `## Process` / `## How it works` — steps or flow
5. `## Output` / `## Result` — what the skill produces

Optional but validated if present:
- `scripts/` — referenced files must exist and be executable (shebang + `shellcheck`/`go vet`/`tsc --noEmit` pass)
- `references/` — files must exist
- `assets/` — files must exist

Org rules enforced:
- No emojis unless `emoji: true` in frontmatter
- No unrequested prose beyond spec sections
- No `TODO`/`FIXME` in committed skills
- Line width ≤ 100 chars (soft warning)

---

## 4. Commands

### `skillbuilder new <name> [--use <pack>] [--profile <profile>]`

- Creates `<name>/SKILL.md` from selected pack template
- Applies profile (stack defaults: Go version, CI patterns, org conventions)
- Creates `scripts/`, `references/` dirs if template includes them
- Fails if `<name>` exists

### `skillbuilder template list`

Lists embedded packs with descriptions.

### `skillbuilder validate <path> [--format text|json]`

- Parses SKILL.md at `<path>` (file or directory)
- Validates frontmatter (name, description, optional fields)
- Checks required sections present
- Verifies all `scripts/*`, `references/*`, `assets/*` refs exist
- Runs org rules (emojis, prose, line width)
- Exit code: 0 = valid, 1 = invalid, 2 = error

Output `--format json`:
```json
{
  "valid": true,
  "path": "skills/my-skill/SKILL.md",
  "warnings": ["line 45: exceeds 100 chars"],
  "errors": []
}
```

---

## 5. skillcheck Binary (CI Integration)

`cmd/skillcheck/skillcheck.go` builds a minimal binary with only:
- `skillcheck validate <path> [--format json]`
- No template logic, no profile logic — ~40% smaller binary

Usage in `.github/workflows/skillcheck.yml` (consumed by org repos):
```yaml
name: Skill Validate
on:
  pull_request:
    paths: ['.pai/skills/**', 'skills/**', '**/SKILL.md']
  schedule: [{cron: "0 */12 * * *"}]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -sL https://github.com/pai-list/skillbuilder/releases/latest/download/skillcheck_linux_amd64 -o skillcheck
          chmod +x skillcheck
      - run: ./skillcheck validate .pai/skills/
```

Or install via `go install github.com/pai-list/skillbuilder/cmd/skillcheck@latest`.

---

## 6. Template Packs (Embedded)

| Pack | Use Case | Includes |
|---|---|---|
| `pai` | General PAI agent skill | `scripts/`, `references/`, org rules |
| `cloudflare` | Cloudflare Workers/DO skill | `wrangler.toml` ref, KV/R2 bindings docs |
| `memory` | Memory/stateful agent skill | SQLite/Vectorize patterns |
| `firecrawl` | Firecrawl web-data skill | `/scrape`, `/search`, `/interact` patterns |

Packs defined as `embed.FS` + `text/template` with profile variables: `{{.Name}}`, `{{.GoVersion}}`, `{{.CIProvider}}`, `{{.OrgRules}}`.

---

## 7. Profiles (House Style)

A profile is a YAML file (embedded or user-provided `--profile path`):

```yaml
go_version: "1.22"
ci_provider: "github-actions"
linter_rules:
  no_emojis: true
  max_line_width: 100
  required_sections: ["Purpose", "When to use", "Process", "Output"]
  forbid_todo: true
script_validators:
  ".sh": "shellcheck -x"
  ".py": "python3 -m py_compile"
  ".ts": "tsc --noEmit"
  ".go": "go vet"
```

`skillbuilder new --profile custom.yaml` applies overrides.

---

## 8. Testing

- `go test ./...` with `testdata/`:
  - `testdata/valid/` — skills that pass all checks
  - `testdata/invalid-frontmatter/` — missing name/description
  - `testdata/invalid-sections/` — missing required sections
  - `testdata/broken-refs/` — scripts/ ref missing file
  - `testdata/org-rules/` — emojis, TODO, wide lines
- Table-driven tests: `TestValidate`, `TestNew`, `TestTemplateRender`.
- `skillcheck` binary tested via integration test (build + run on fixtures).

---

## 9. Non-Goals (YAGNI)

- Benchmark/prove pillar (with/without skill eval, leaderboard) — requires model backend, out of scope for v1.
- Remote pack fetching (`skillbuilder pack install github.com/owner/repo`) — v2.
- Skill marketplace / search — registries (`clawhub`) handle distribution.
- Auto-fix (`skillbuilder fix`) — validation is read-only; authors fix manually.

---

## 10. Acceptance Criteria

- `skillbuilder new my-skill --use pai` creates valid `my-skill/SKILL.md` passing `skillbuilder validate`.
- `skillbuilder validate` catches all fixture error classes with clear messages.
- `skillcheck` binary < 3MB, validates fixtures identically to main CLI.
- GH Action `skillcheck.yml` runs on PRs touching skills, fails on invalid skill.
- All `go test ./...` pass.

---

## 11. Open Questions (Resolved)

| Question | Decision |
|---|---|
| Repo | `pai-list/skillbuilder` (new, dedicated) |
| Scope | Generate + Validate only |
| Language | Go stdlib (hand-roll YAML frontmatter parse) |
| Output | `.pai/skills/<name>/SKILL.md` |
| CI integration | `skillcheck` binary + `.github/workflows/skillcheck.yml` |
| Registry | `pai-list/clawhub` / `clawhub-ar` (storage), skillbuilder = authoring tool |

---

## 12. Relationship to Central Registries

| Layer | Repo | Role |
|---|---|---|
| Authoring & Validation | `pai-list/skillbuilder` | This CLI: `new`, `validate`, `skillcheck` |
| Pack Templates | `pai-list/skillbuilder/packs/*` | Embedded in binary |
| Validated Skills (EN) | `pai-list/clawhub` | Central registry — skills published here after validation |
| Validated Skills (AR) | `pai-list/clawhub-ar` | Arabic mirror |
| Consumption | Org repos | `.github/workflows/skillcheck.yml` pulls `skillcheck` binary |

`clawhub` repos contain *validated, published* skills. `skillbuilder` is the tool that *produces* them. Separation of concerns: tooling vs storage.

---

*Spec self-review: no placeholders, no contradictions, scope is single implementation plan (Generate + Validate).*