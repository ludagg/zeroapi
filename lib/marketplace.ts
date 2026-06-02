import { prisma } from "@/lib/prisma";

/** A template as rendered on a marketplace card (no heavy spec payload). */
export type TemplateCard = {
  id: string;
  title: string;
  description: string;
  category: string;
  emoji: string;
  isOfficial: boolean;
  usageCount: number;
  /** Author display name for community templates (null for official ones). */
  authorName: string | null;
};

/**
 * Load the public marketplace: official templates first, then community
 * templates (most-used first). Author emails are never exposed — only the
 * display name (falling back to a neutral label).
 */
export async function loadMarketplace(): Promise<{
  official: TemplateCard[];
  community: TemplateCard[];
  categories: string[];
}> {
  const [official, community] = await Promise.all([
    prisma.template.findMany({
      where: { isOfficial: true, visibility: "PUBLIC" },
      orderBy: [{ usageCount: "desc" }, { title: "asc" }],
      select: { id: true, title: true, description: true, category: true, emoji: true, usageCount: true },
    }),
    prisma.template.findMany({
      where: { isOfficial: false, visibility: "PUBLIC" },
      orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
      take: 60,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        emoji: true,
        usageCount: true,
        author: { select: { name: true } },
      },
    }),
  ]);

  const officialCards: TemplateCard[] = official.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    emoji: t.emoji,
    isOfficial: true,
    usageCount: t.usageCount,
    authorName: null,
  }));

  const communityCards: TemplateCard[] = community.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    emoji: t.emoji,
    isOfficial: false,
    usageCount: t.usageCount,
    authorName: t.author?.name?.trim() || "Membre ZeroAPI",
  }));

  const categories = Array.from(
    new Set([...officialCards, ...communityCards].map((t) => t.category)),
  ).sort();

  return { official: officialCards, community: communityCards, categories };
}
