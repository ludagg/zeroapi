import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/jobs/[id]/env/[key]
 * Refuses to drop AUTO (managed) rows — those are owned by the platform and
 * regenerated on every deploy.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; key: string } },
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const job = await prisma.job.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
  }

  const row = await prisma.envVariable.findUnique({
    where: { jobId_key: { jobId: job.id, key: params.key } },
    select: { id: true, managed: true },
  });
  if (!row) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }
  if (row.managed) {
    return NextResponse.json(
      { error: "Variable gérée par ZeroAPI — suppression interdite." },
      { status: 422 },
    );
  }

  await prisma.envVariable.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true, deleted: 1 });
}
