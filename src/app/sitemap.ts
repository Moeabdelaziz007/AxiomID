import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://axiomid.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/dashboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/leaderboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/settings`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/terminal`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  try {
    const users = await prisma.user.findMany({
      select: { piUsername: true, updatedAt: true },
      where: { piUsername: { not: null } },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });

    const passportPages: MetadataRoute.Sitemap = users
      .filter((u) => u.piUsername)
      .map((u) => ({
        url: `${BASE_URL}/passport/${encodeURIComponent(u.piUsername!)}`,
        lastModified: u.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));

    return [...staticPages, ...passportPages];
  } catch {
    return staticPages;
  }
}
