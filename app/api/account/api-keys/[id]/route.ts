import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const key = await prisma.personalApiKey.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true, revokedAt: true },
  });
  if (!key) {
    return NextResponse.json({ error: "Clé introuvable." }, { status: 404 });
  }
  if (key.revokedAt) {
    return NextResponse.json({ error: "Clé déjà révoquée." }, { status: 400 });
  }

  await prisma.personalApiKey.update({
    where: { id: key.id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
