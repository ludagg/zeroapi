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
