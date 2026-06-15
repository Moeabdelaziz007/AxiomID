/**
 * Seed script for Skills Marketplace.
 * Run with: wrangler d1 execute axiomid-edge --file=./migrations/0002_seed_skills.sql
 *
 * Or call programmatically on first worker init.
 */

import { D1Helper } from "../db/d1";

export interface SkillDefinition {
  slug: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
}

export const SEED_SKILLS: SkillDefinition[] = [
  {
    slug: "harvest-search",
    name: "Harvest Search",
    description: "Query Perplexity for real-time research with citation tracking",
    author: "axiomid",
    version: "1.0.0",
    tags: ["research", "perplexity", "citations"],
  },
  {
    slug: "trust-verify",
    name: "Trust Verify",
    description: "Verify trust scores and delegation chains for DIDs",
    author: "axiomid",
    version: "1.0.0",
    tags: ["trust", "verification", "delegation"],
  },
  {
    slug: "did-resolve",
    name: "DID Resolve",
    description: "Resolve DIDs to their documents and metadata",
    author: "axiomid",
    version: "1.0.0",
    tags: ["did", "resolution", "identity"],
  },
  {
    slug: "presence-monitor",
    name: "Presence Monitor",
    description: "Track agent online/offline status with heartbeat monitoring",
    author: "axiomid",
    version: "1.0.0",
    tags: ["presence", "monitoring", "agents"],
  },
  {
    slug: "identity-builder",
    name: "Identity Builder",
    description: "Create and manage decentralized identities with Pi Network",
    author: "axiomid",
    version: "1.0.0",
    tags: ["identity", "pi-network", "did"],
  },
];

export async function seedSkills(d1: D1Helper): Promise<void> {
  for (const skill of SEED_SKILLS) {
    const id = `seed-${skill.slug}`;
    await d1.db
      .prepare(
        `INSERT OR REPLACE INTO skill_installs (id, skill_slug, user_did, version)
         SELECT ?, ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM skill_installs WHERE skill_slug = ? AND user_did = 'system')`
      )
      .bind(id, skill.slug, "system", skill.version, skill.slug)
      .run();
  }
  console.log(`[Seed] Inserted ${SEED_SKILLS.length} skills`);
}
