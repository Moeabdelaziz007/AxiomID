-- Seed data for AxiomID Skills Marketplace
-- Run: wrangler d1 execute axiomid-edge --file=./migrations/0002_seed_skills.sql

-- Core skills that ship with AxiomID
INSERT OR REPLACE INTO skill_installs (id, skill_slug, user_did, version) VALUES
  ('seed-harvest-001', 'harvest-search', 'system', '1.0.0'),
  ('seed-trust-001', 'trust-verify', 'system', '1.0.0'),
  ('seed-did-001', 'did-resolve', 'system', '1.0.0');
