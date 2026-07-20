/**
 * validate-skill-manifest.ts
 *
 * CLI script that validates skill manifest markdown against the template standard.
 * Shares validation logic with the API (ManifestSchema from validators.ts).
 *
 * Usage:
 *   npx tsx scripts/validate-skill-manifest.ts --changed   (CI default, only PR-changed skills)
 *   npx tsx scripts/validate-skill-manifest.ts --db        (all skills in the database)
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { validateManifest } from '../src/lib/validators';

const args = process.argv.slice(2);
const mode = args.includes('--db') ? 'db' : 'changed';

/**
 * Returns the list of files changed in the current PR/commit.
 *
 * Tries multiple strategies to be robust in CI shallow clones:
 * 1. origin/main...HEAD merge-base diff (needs full fetch)
 * 2. HEAD~1 diff (needs at least depth=2)
 * 3. git status --short (fallback: uncommitted changes in working tree)
 *
 * Returns an empty array if no strategy works or no files changed —
 * the caller treats that as "no skill files to validate" and exits 0.
 */
function getChangedFiles(): string[] {
  const strategies: string[] = [
    'git diff --name-only origin/main...HEAD',
    'git diff --name-only HEAD~1',
    'git diff --name-only HEAD',
    'git status --short --porcelain',
  ];

  for (const cmd of strategies) {
    try {
      const output = execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
      if (!output) continue;
      // git status --short prefixes with status codes like " M path"
      const files = output
        .split('\n')
        .filter(Boolean)
        .map((line) => line.replace(/^[ MADRC?]+\s+/, ''));
      return files.filter(Boolean);
    } catch {
      // strategy failed (missing ref, shallow clone, etc.) — try next
      continue;
    }
  }

  // No strategy worked — return empty so the caller exits cleanly.
  console.warn('⚠ Could not determine changed files (shallow clone or no git history). Skipping.');
  return [];
}

/**
 * Validates the selected skill manifests and prints a summary of the results.
 */
async function main() {
  const skills: { name: string; slug: string; manifestMd: string }[] = [];

  if (mode === 'changed') {
    const changedFiles = getChangedFiles();

    for (const file of changedFiles) {
      if (file.startsWith('skills/') && file.endsWith('.md') && existsSync(file)) {
        const content = readFileSync(file, 'utf-8');
        const name = file.replace(/^skills\//, '').replace(/\.md$/, '');
        skills.push({ name, slug: name, manifestMd: content });
      }
    }

    if (skills.length === 0) {
      console.log('No skill files changed in this PR. ✓');
      process.exit(0);
    }
  } else if (mode === 'db') {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const dbSkills = await prisma.skill.findMany({
      select: { name: true, slug: true, manifestMd: true },
    });
    await prisma.$disconnect();
    skills.push(...dbSkills);
  }

  let failures = 0;
  const results: { name: string; valid: boolean; issues: string[] }[] = [];

  for (const skill of skills) {
    const result = validateManifest(skill.manifestMd);
    const issues: string[] = [];

    if (result.missing.length > 0) {
      issues.push(`Missing sections: ${result.missing.join(', ')}`);
    }
    if (result.stubs.length > 0) {
      issues.push(`Stub content in: ${result.stubs.join(', ')}`);
    }

    results.push({ name: skill.name, valid: result.valid, issues });

    if (!result.valid) {
      failures++;
      console.error(`✗ ${skill.name}: ${issues.join('; ')}`);
    } else {
      console.log(`✓ ${skill.name}`);
    }
  }

  const total = skills.length;
  const passed = total - failures;

  console.log(`\nResults: ${passed} passed, ${failures} failed (${total} total)`);

  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Validation script failed:', err);
  process.exit(1);
});
