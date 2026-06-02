import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { countEndpoints } from "@/lib/spec";
import { readSpec } from "@/lib/conversation-helpers";
import { resolveNextVersion } from "@/lib/job-versions";

export const dynamic = "force-dynamic";

/**
 * Save the live conversation spec as a DRAFT job — WITHOUT launching the build.
 *
 * The conversation is the working draft (spec built live by the Kia agent). This
 * promotes it to a real Job in DRAFT status so it shows up in "Jobs"; the actual
 * backend generation is started later from the job page (POST …/jobs/[id]/start).
 * No generation quota is consumed until generation is actually launched.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    include: { job: { select: { id: true, status: true, lineageId: true, version: true, name: true } } },
  });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  // Idempotent while the linked job is still a DRAFT (we're editing it). Once it
  // has been built, saving creates a NEW draft version instead of overwriting.
  if (conv.job && conv.job.status === "DRAFT") {
    return NextResponse.json({ jobId: conv.job.id });
  }

  const spec = readSpec(conv.spec ?? null);
  if (!spec || spec.resources.length === 0) {
    return NextResponse.json(
      { error: "Décris au moins une ressource avant de sauvegarder le job." },
      { status: 400 },
    );
  }

  const job = await prisma.$transaction(async (tx) => {
    const { lineageId, version } = await resolveNextVersion(tx, user.id, conv.job);
    const created = await tx.job.create({
      data: {
        userId: user.id,
        // Display name = the conversation title (or the job's name for later
        // versions); spec.name stays a code-safe slug used by the generator.
        name: conv.job?.name?.trim() || conv.title?.trim() || spec.name,
        description: spec.description ?? "",
        status: "DRAFT",
        lineageId,
        version,
        spec: spec as unknown as object,
        endpoints: countEndpoints(spec),
        estimatedTime: 120,
      },
    });
    if (!lineageId) {
      await tx.job.update({ where: { id: created.id }, data: { lineageId: created.id } });
    }
    await tx.conversation.update({
      where: { id: conv.id },
      data: { jobId: created.id },
    });
    return created;
  });

  return NextResponse.json({ jobId: job.id });
}
