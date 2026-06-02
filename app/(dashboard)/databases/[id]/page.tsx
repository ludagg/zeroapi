import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * The standalone database detail page was folded into the job page's
 * "Base de données" tab. Resolve the database to its job and redirect there,
 * preserving any bookmarked /databases/[id] links.
 */
export default async function DatabaseDetailRedirect({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const db = await prisma.database.findFirst({
    where: { id: params.id, userId: user.id },
    select: { jobId: true },
  });
  redirect(db ? `/jobs/${db.jobId}?tab=database` : "/jobs");
}
