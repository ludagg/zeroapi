import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readSpec } from "@/lib/job-helpers";
import { triggerGenerateJob } from "@/lib/jobs";
import { countEndpoints } from "@/lib/spec";
import { lineageKeyOf, lineageWhere, resolveNextVersion } from "@/lib/job-versions";

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
    // New version in the same lineage, built from `source`'s spec. Used both by
    // "Régénérer" and "Revenir à cette version" (revert from an older build).
    const { lineageId, version } = await resolveNextVersion(tx, user.id, source);
    const created = await tx.job.create({
      data: {
        userId: user.id,
        name: source.name,
        description: source.description,
        status: "PENDING",
        lineageId,
        version,
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
        message: `Version ${version} créée depuis ${source.id} (v${source.version})`,
      },
    });
    // Re-link any conversation pointing at this lineage to the new version, and
    // set its working spec to the (possibly reverted) source spec so further
    // edits branch from here.
    const lineageJobs = await tx.job.findMany({
      where: lineageWhere(user.id, lineageKeyOf(source)),
      select: { id: true },
    });
    await tx.conversation.updateMany({
      where: { jobId: { in: lineageJobs.map((j) => j.id) } },
      data: {
        jobId: created.id,
        spec: spec as unknown as Prisma.InputJsonValue,
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
