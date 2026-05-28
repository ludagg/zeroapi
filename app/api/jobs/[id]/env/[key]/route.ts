import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
  if (!job) return NextResponse.json({ error: "Job introuvable." }, { status: 404 });

  const found = await prisma.envVariable.findUnique({
    where: { jobId_key: { jobId: job.id, key: params.key } },
    select: { id: true, managed: true },
  });
  if (!found) {
    return NextResponse.json({ error: "Variable introuvable." }, { status: 404 });
  }
  if (found.managed) {
    return NextResponse.json(
      { error: "Variable gérée par ZeroAPI — suppression refusée." },
      { status: 400 },
    );
  }

  await prisma.envVariable.delete({ where: { id: found.id } });
  return NextResponse.json({ ok: true });
}
