import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * "Utiliser ce template" — spin up a fresh conversation pre-loaded with the
 * template's spec so Kia can take over and refine it, then bump usageCount.
 *
 * No job is created here: the user iterates in the conversation and saves the
 * job from the right panel when ready (existing flow).
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const template = await prisma.template.findFirst({
    where: { id: params.id, visibility: "PUBLIC" },
    select: { id: true, title: true, spec: true },
  });
  if (!template) {
    return NextResponse.json({ error: "Template introuvable." }, { status: 404 });
  }

  // Seed a single assistant message (not a user one) so the conversation view
  // doesn't auto-fire an initial Kia turn — the spec is already there to show.
  const welcome =
    `J'ai préchargé le template **${template.title}** : la spec complète est dans le panneau de droite ` +
    `(graphe, endpoints, audit). Dis-moi ce que tu veux ajuster — ajouter une ressource, changer ` +
    `l'authentification, adapter un workflow — et je modifie la spec en direct.`;

  const conversation = await prisma.$transaction(async (tx) => {
    const created = await tx.conversation.create({
      data: {
        userId: user.id,
        title: template.title,
        messages: [{ role: "assistant", content: welcome, ts: Date.now() }],
        spec: template.spec as never,
      },
      select: { id: true },
    });
    await tx.template.update({
      where: { id: template.id },
      data: { usageCount: { increment: 1 } },
    });
    return created;
  });

  return NextResponse.json({ conversationId: conversation.id });
}
