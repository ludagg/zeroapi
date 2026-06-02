import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Body = { visibility?: "PUBLIC" | "PRIVATE" };

/**
 * Toggle the visibility of a community template the user owns — used to retire
 * a template from the marketplace (PUBLIC → PRIVATE) or republish it. Official
 * templates can't be touched here. The linked job's visibility is kept in sync.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    /* default below */
  }
  const visibility = body.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE";

  const template = await prisma.template.findFirst({
    where: { id: params.id, authorId: user.id, isOfficial: false },
    select: { id: true, jobId: true },
  });
  if (!template) {
    return NextResponse.json({ error: "Template introuvable." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.template.update({ where: { id: template.id }, data: { visibility } });
    if (template.jobId) {
      await tx.job.update({ where: { id: template.jobId }, data: { visibility } });
    }
  });

  return NextResponse.json({ id: template.id, visibility });
}
