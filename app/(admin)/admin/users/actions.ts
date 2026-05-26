"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function assertAdmin(): Promise<string> {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) throw new Error("Non authentifié.");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "ADMIN") throw new Error("Accès refusé.");
  return session.user.id;
}

export async function promoteUser(userId: string) {
  await assertAdmin();
  await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
  revalidatePath("/admin/users");
}

export async function demoteUser(userId: string) {
  const me = await assertAdmin();
  if (me === userId) throw new Error("Tu ne peux pas te rétrograder toi-même.");
  await prisma.user.update({ where: { id: userId }, data: { role: "USER" } });
  revalidatePath("/admin/users");
}
