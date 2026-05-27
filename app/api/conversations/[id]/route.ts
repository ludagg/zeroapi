import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const PatchSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
  })
  .refine((v) => v.title !== undefined, { message: "Aucun champ à mettre à jour." });

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      job: { select: { id: true, name: true, status: true } },
    },
  });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  return NextResponse.json({ conversation: conv });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: z.infer<typeof PatchSchema>;
  try {
    body = PatchSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Requête invalide.", details: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  const existing = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
  }

  const updated = await prisma.conversation.update({
    where: { id: params.id },
    data: { ...(body.title !== undefined ? { title: body.title } : {}) },
    select: { id: true, title: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const existing = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
  }

  await prisma.conversation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
