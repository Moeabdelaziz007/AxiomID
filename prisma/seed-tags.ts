import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TAGS = [
  { id: 'tag_ai', name: 'AI & ML', slug: 'ai-ml', description: 'Artificial intelligence and machine learning skills', color: '#6366f1' },
  { id: 'tag_automation', name: 'Automation', slug: 'automation', description: 'Workflow automation and task scheduling', color: '#3b82f6' },
  { id: 'tag_productivity', name: 'Productivity', slug: 'productivity', description: 'Tools for personal and team productivity', color: '#22c55e' },
  { id: 'tag_data', name: 'Data & Analytics', slug: 'data-analytics', description: 'Data processing, visualization, and analytics', color: '#f59e0b' },
  { id: 'tag_communication', name: 'Communication', slug: 'communication', description: 'Messaging, notifications, and integrations', color: '#ec4899' },
  { id: 'tag_security', name: 'Security', slug: 'security', description: 'Security tools, encryption, and access control', color: '#ef4444' },
  { id: 'tag_web3', name: 'Web3 & Blockchain', slug: 'web3-blockchain', description: 'Decentralized apps, smart contracts, and crypto', color: '#8b5cf6' },
  { id: 'tag_devtools', name: 'Developer Tools', slug: 'devtools', description: 'IDE, CI/CD, debugging, and development utilities', color: '#64748b' },
];

async function main() {
  console.log('Seeding default skill tags...');
  for (const tag of TAGS) {
    const { id, ...data } = tag;
    await prisma.skillTag.upsert({
      where: { id },
      create: tag,
      update: data,
    });
    console.log('  ✅ ' + tag.name);
  }
  console.log(`Done. ${TAGS.length} tags seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
