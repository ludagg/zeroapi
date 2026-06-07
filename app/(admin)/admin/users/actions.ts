"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_ORDER, defaultGenerationsLimitFor } from "@/lib/plans";
import { headerMeta, logActivity } from "@/lib/activity";

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

/** Journal an admin mutation for the activity feed + Telegram. */
async function audit(
  actorId: string,
  type: string,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const meta = headerMeta(headers());
  await logActivity({
    type,
    kind: "ACTIVITY",
    message,
    userId: actorId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata,
    notify: "productActivity",
  });
}

export async function promoteUser(userId: string) {
  const me = await assertAdmin();
  await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
  await audit(me, "admin.user.promote", "Utilisateur promu ADMIN", { userId });
  revalidatePath("/admin/users");
}

export async function demoteUser(userId: string) {
  const me = await assertAdmin();
  if (me === userId) throw new Error("Tu ne peux pas te rétrograder toi-même.");
  await prisma.user.update({ where: { id: userId }, data: { role: "USER" } });
  await audit(me, "admin.user.demote", "Utilisateur rétrogradé USER", { userId });
  revalidatePath("/admin/users");
}

const SetPlanSchema = z.object({
  userId: z.string().min(1),
  plan: z.enum(PLAN_ORDER as [string, ...string[]]),
});

export async function setUserPlan(input: { userId: string; plan: string }) {
  const me = await assertAdmin();
  const parsed = SetPlanSchema.parse(input);
  const plan = parsed.plan as (typeof PLAN_ORDER)[number];
  await prisma.user.update({
    where: { id: parsed.userId },
    data: {
      plan,
      generationsLimit: defaultGenerationsLimitFor(plan),
    },
  });
  await audit(me, "admin.user.setPlan", `Plan changé en ${plan}`, {
    userId: parsed.userId,
    plan,
  });
  revalidatePath("/admin/users");
}

const SetLimitSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().min(0).max(100_000),
});

export async function setUserGenerationsLimit(input: { userId: string; limit: number }) {
  const me = await assertAdmin();
  const parsed = SetLimitSchema.parse(input);
  await prisma.user.update({
    where: { id: parsed.userId },
    data: { generationsLimit: parsed.limit },
  });
  await audit(me, "admin.user.setLimit", `Quota fixé à ${parsed.limit}`, {
    userId: parsed.userId,
    limit: parsed.limit,
  });
  revalidatePath("/admin/users");
}

export async function resetUserGenerations(userId: string) {
  const me = await assertAdmin();
  if (!userId) throw new Error("Utilisateur manquant.");
  await prisma.user.update({
    where: { id: userId },
    data: { generationsUsed: 0 },
  });
  await audit(me, "admin.user.resetGenerations", "Compteur de générations remis à zéro", {
    userId,
  });
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const me = await assertAdmin();
  if (!userId) throw new Error("Utilisateur manquant.");
  if (me === userId) throw new Error("Tu ne peux pas te supprimer toi-même.");
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  await prisma.user.delete({ where: { id: userId } });
  await audit(me, "admin.user.delete", `Compte supprimé : ${target?.email ?? userId}`, {
    userId,
    email: target?.email,
  });
  revalidatePath("/admin/users");
}
