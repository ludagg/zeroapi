"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function loadOwnedDatabase(dbId: string) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) throw new Error("Non authentifié.");

  const db = await prisma.database.findUnique({
    where: { id: dbId },
    select: { id: true, userId: true, managed: true, name: true },
  });
  if (!db) throw new Error("Base introuvable.");
  if (db.userId !== session.user.id) throw new Error("Accès refusé.");
  return db;
}

export async function resetDatabase(dbId: string) {
  const db = await loadOwnedDatabase(dbId);
  // Réinitialise la base : on remet sizeBytes à 0 et on bump updatedAt.
  // Quand on aura une vraie base provisionnée, on déclenchera ici un TRUNCATE.
  await prisma.database.update({
    where: { id: db.id },
    data: { sizeBytes: 0, status: "online" },
  });
  revalidatePath(`/databases/${db.id}`);
}

export async function deleteDatabase(dbId: string) {
  const db = await loadOwnedDatabase(dbId);
  if (db.managed) {
    throw new Error(
      "Cette base est gérée par ZeroAPI — elle se recréera automatiquement à la prochaine génération du job.",
    );
  }
  await prisma.database.delete({ where: { id: db.id } });
  revalidatePath("/databases");
  redirect("/databases");
}
