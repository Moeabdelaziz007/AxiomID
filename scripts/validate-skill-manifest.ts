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
 * Validates the selected skill manifests and prints a summary of the results.
 */
async function main() {
  const skills: { name: string; slug: string; manifestMd: string }[] = [];

  if (mode === 'changed') {
    const diffOutput = execSync('git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only HEAD~1').toString().trim();
    const changedFiles = diffOutput ? diffOutput.split('\n').filter(Boolean) : [];

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
