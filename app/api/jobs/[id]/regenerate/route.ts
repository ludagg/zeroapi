import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readSpec } from "@/lib/job-helpers";
import { triggerGenerateJob } from "@/lib/jobs";
import { countEndpoints } from "@/lib/spec";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  if (user.generationsUsed >= user.generationsLimit) {
    return NextResponse.json(
      {
        error: `Limite atteinte (${user.generationsLimit} générations sur ton plan ${user.plan}).`,
      },
      { status: 402 },
    );
  }

  const source = await prisma.job.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!source) return NextResponse.json({ error: "Job introuvable." }, { status: 404 });

  const spec = readSpec(source.spec);
  if (!spec) {
    return NextResponse.json(
      { error: "Le job source n'a pas de spec valide." },
      { status: 400 },
    );
  }

  const job = await prisma.$transaction(async (tx) => {
    const created = await tx.job.create({
      data: {
        userId: user.id,
        name: source.name,
        description: source.description,
        status: "PENDING",
        spec: spec as unknown as object,
        endpoints: countEndpoints(spec),
        estimatedTime: 120,
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { generationsUsed: { increment: 1 } },
    });
    await tx.agentLog.create({
      data: {
        jobId: created.id,
        agent: "regenerate",
        status: "done",
        message: `Régénéré depuis ${source.id}`,
      },
    });
    return created;
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
            "Impossible de déclencher la régénération (Trigger.dev): " +
            (err instanceof Error ? err.message : String(err)),
          completedAt: new Date(),
        },
      })
      .catch(() => undefined);
    return NextResponse.json(
      { error: "La régénération n'a pas pu être déclenchée. Réessaie dans un instant." },
      { status: 502 },
    );
  }

  return NextResponse.json({ jobId: job.id });
}
