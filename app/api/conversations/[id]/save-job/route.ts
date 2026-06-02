import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { countEndpoints } from "@/lib/spec";
import { readSpec } from "@/lib/conversation-helpers";

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
  });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  // Idempotent — a conversation already linked to a job just returns it.
  if (conv.jobId) return NextResponse.json({ jobId: conv.jobId });

  const spec = readSpec(conv.spec ?? null);
  if (!spec || spec.resources.length === 0) {
    return NextResponse.json(
      { error: "Décris au moins une ressource avant de sauvegarder le job." },
      { status: 400 },
    );
  }

  const job = await prisma.$transaction(async (tx) => {
    const created = await tx.job.create({
      data: {
        userId: user.id,
        // Display name = the (regenerated) conversation title; spec.name stays a
        // code-safe slug used by the generator.
        name: conv.title?.trim() || spec.name,
        description: spec.description ?? "",
        status: "DRAFT",
        spec: spec as unknown as object,
        endpoints: countEndpoints(spec),
        estimatedTime: 120,
      },
    });
    await tx.conversation.update({
      where: { id: conv.id },
      data: { jobId: created.id },
    });
    return created;
  });

  return NextResponse.json({ jobId: job.id });
}

/**
 * Update the spec of an already-saved job with the current conversation spec —
 * a new "version" of the job. This does NOT re-deploy: it only refreshes the
 * stored spec so the job page reflects the latest design.
 *
 * Returns `hasActiveDeployment` so the client can warn the user that the live
 * deployment is now out of date with this version (and offer to redeploy).
 */
export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    include: { job: { include: { deployment: { select: { status: true } } } } },
  });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
  if (!conv.job) {
    return NextResponse.json({ error: "Aucun job à mettre à jour." }, { status: 400 });
  }

  const spec = readSpec(conv.spec ?? null);
  if (!spec || spec.resources.length === 0) {
    return NextResponse.json(
      { error: "Décris au moins une ressource avant de mettre à jour le job." },
      { status: 400 },
    );
  }

  await prisma.job.update({
    where: { id: conv.job.id },
    data: {
      description: spec.description ?? "",
      spec: spec as unknown as object,
      endpoints: countEndpoints(spec),
    },
  });

  // A deployment is "active" once it's live (ONLINE) or in the middle of rolling
  // out (DEPLOYING) — in both cases the running code no longer matches the spec.
  const status = conv.job.deployment?.status;
  const hasActiveDeployment = status === "ONLINE" || status === "DEPLOYING";

  return NextResponse.json({ jobId: conv.job.id, hasActiveDeployment });
}
