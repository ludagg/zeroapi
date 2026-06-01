import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readSpec } from "@/lib/job-helpers";
import { triggerGenerateJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";

/**
 * Launch the backend generation for a DRAFT job (created via "Sauvegarder le job").
 * Transitions DRAFT → PENDING, consumes one generation, and triggers the pipeline.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  if (user.generationsUsed >= user.generationsLimit) {
    return NextResponse.json(
      { error: `Limite atteinte (${user.generationsLimit} générations sur ton plan ${user.plan}).` },
      { status: 402 },
    );
  }

  const job = await prisma.job.findFirst({ where: { id: params.id, userId: user.id } });
  if (!job) return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
  if (job.status !== "DRAFT") {
    return NextResponse.json({ error: "La génération de ce job est déjà lancée." }, { status: 409 });
  }

  const spec = readSpec(job.spec);
  if (!spec) {
    return NextResponse.json({ error: "Spec invalide — impossible de générer." }, { status: 400 });
  }

  await prisma.job.update({
    where: { id: job.id },
    data: { status: "PENDING", startedAt: new Date() },
  });

  try {
    await triggerGenerateJob({ jobId: job.id, spec });
  } catch (err) {
    await prisma.job
      .update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage:
            "Impossible de déclencher la génération (Trigger.dev): " +
            (err instanceof Error ? err.message : String(err)),
          completedAt: new Date(),
        },
      })
      .catch(() => undefined);
    return NextResponse.json(
      { error: "La génération n'a pas pu être déclenchée. Réessaie dans un instant." },
      { status: 502 },
    );
  }

  // Generation actually launched — consume the quota now and log it.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { generationsUsed: { increment: 1 } },
    }),
    prisma.agentLog.create({
      data: { jobId: job.id, agent: "spec_generation", status: "done", message: "draft → pending" },
    }),
  ]);

  return NextResponse.json({ ok: true, jobId: job.id });
}
