import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const member = await prisma.teamMember.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!member) {
    return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
  }

  await prisma.teamMember.delete({ where: { id: member.id } });

  return NextResponse.json({ ok: true });
}
