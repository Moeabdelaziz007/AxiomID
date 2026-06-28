-- Migration: Seed default skill tags idempotently
-- Handles environments where the original seed in 20260620_marketplace_tables
-- may have already run (production) or not (new dev/preview databases).

INSERT INTO "SkillTag" ("id", "name", "slug", "description", "color", "createdAt") VALUES
  ('tag_ai', 'AI & ML', 'ai-ml', 'Artificial intelligence and machine learning skills', '#6366f1', CURRENT_TIMESTAMP),
  ('tag_automation', 'Automation', 'automation', 'Workflow automation and task scheduling', '#3b82f6', CURRENT_TIMESTAMP),
  ('tag_productivity', 'Productivity', 'productivity', 'Tools for personal and team productivity', '#22c55e', CURRENT_TIMESTAMP),
  ('tag_data', 'Data & Analytics', 'data-analytics', 'Data processing, visualization, and analytics', '#f59e0b', CURRENT_TIMESTAMP),
  ('tag_communication', 'Communication', 'communication', 'Messaging, notifications, and integrations', '#ec4899', CURRENT_TIMESTAMP),
  ('tag_security', 'Security', 'security', 'Security tools, encryption, and access control', '#ef4444', CURRENT_TIMESTAMP),
  ('tag_web3', 'Web3 & Blockchain', 'web3-blockchain', 'Decentralized apps, smart contracts, and crypto', '#8b5cf6', CURRENT_TIMESTAMP),
  ('tag_devtools', 'Developer Tools', 'devtools', 'IDE, CI/CD, debugging, and development utilities', '#64748b', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
