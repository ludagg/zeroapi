/**
 * Seed (or refresh) the 7 official ZeroAPI marketplace templates.
 *
 * Idempotent: each template has a stable id, so re-running upserts in place
 * without creating duplicates and without resetting `usageCount`.
 *
 *   pnpm db:seed-templates   (or)   npx tsx scripts/seed-templates.ts
 */
import { PrismaClient } from "@prisma/client";
import { OFFICIAL_TEMPLATES } from "../lib/official-templates";

const prisma = new PrismaClient();

async function main() {
  for (const t of OFFICIAL_TEMPLATES) {
    await prisma.template.upsert({
      where: { id: t.id },
      // Refresh the editorial fields + spec, but keep the existing usageCount.
      update: {
        title: t.title,
        description: t.description,
        category: t.category,
        emoji: t.emoji,
        spec: t.spec as unknown as object,
        isOfficial: true,
        visibility: "PUBLIC",
      },
      create: {
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        emoji: t.emoji,
        spec: t.spec as unknown as object,
        isOfficial: true,
        visibility: "PUBLIC",
      },
    });
    console.log(`seeded: ${t.title}`);
  }
  console.log(`\n${OFFICIAL_TEMPLATES.length} templates officiels prêts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
