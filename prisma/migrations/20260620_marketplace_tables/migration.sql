-- Migration: Add SkillTag, SkillVersion, SkillModeration tables
-- Marketplace completion: tags for discovery, version history, moderation queue

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "SkillTag" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "color" VARCHAR(7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillTagRelation" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillTagRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillVersion" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "manifestMd" TEXT NOT NULL,
    "agentScript" TEXT,
    "testSuite" TEXT,
    "changelog" TEXT,
    "authorId" TEXT,
    "status" "SkillStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillModeration" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reason" VARCHAR(1000),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillModeration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillTag_name_key" ON "SkillTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SkillTag_slug_key" ON "SkillTag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SkillTagRelation_skillId_tagId_key" ON "SkillTagRelation"("skillId", "tagId");

-- CreateIndex
CREATE INDEX "SkillTagRelation_skillId_idx" ON "SkillTagRelation"("skillId");

-- CreateIndex
CREATE INDEX "SkillTagRelation_tagId_idx" ON "SkillTagRelation"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillVersion_skillId_version_key" ON "SkillVersion"("skillId", "version");

-- CreateIndex
CREATE INDEX "SkillVersion_skillId_idx" ON "SkillVersion"("skillId");

-- CreateIndex
CREATE INDEX "SkillModeration_skillId_idx" ON "SkillModeration"("skillId");

-- CreateIndex
CREATE INDEX "SkillModeration_status_idx" ON "SkillModeration"("status");

-- CreateIndex
CREATE INDEX "SkillModeration_reviewerId_idx" ON "SkillModeration"("reviewerId");

-- AddForeignKey
ALTER TABLE "SkillTagRelation" ADD CONSTRAINT "SkillTagRelation_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillTagRelation" ADD CONSTRAINT "SkillTagRelation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "SkillTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillVersion" ADD CONSTRAINT "SkillVersion_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillVersion" ADD CONSTRAINT "SkillVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillModeration" ADD CONSTRAINT "SkillModeration_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillModeration" ADD CONSTRAINT "SkillModeration_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default tags
INSERT INTO "SkillTag" ("id", "name", "slug", "description", "color", "createdAt") VALUES
  ('tag_ai', 'AI & ML', 'ai-ml', 'Artificial intelligence and machine learning skills', '#6366f1', CURRENT_TIMESTAMP),
  ('tag_automation', 'Automation', 'automation', 'Workflow automation and task scheduling', '#3b82f6', CURRENT_TIMESTAMP),
  ('tag_productivity', 'Productivity', 'productivity', 'Tools for personal and team productivity', '#22c55e', CURRENT_TIMESTAMP),
  ('tag_data', 'Data & Analytics', 'data-analytics', 'Data processing, visualization, and analytics', '#f59e0b', CURRENT_TIMESTAMP),
  ('tag_communication', 'Communication', 'communication', 'Messaging, notifications, and integrations', '#ec4899', CURRENT_TIMESTAMP),
  ('tag_security', 'Security', 'security', 'Security tools, encryption, and access control', '#ef4444', CURRENT_TIMESTAMP),
  ('tag_web3', 'Web3 & Blockchain', 'web3-blockchain', 'Decentralized apps, smart contracts, and crypto', '#8b5cf6', CURRENT_TIMESTAMP),
  ('tag_devtools', 'Developer Tools', 'devtools', 'IDE, CI/CD, debugging, and development utilities', '#64748b', CURRENT_TIMESTAMP);
