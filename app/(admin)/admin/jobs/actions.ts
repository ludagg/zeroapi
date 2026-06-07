"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

export async function deleteJob(jobId: string): Promise<void> {
  const me = await assertAdmin();
  if (!jobId) throw new Error("Job manquant.");
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { name: true, userId: true },
  });
  await prisma.job.delete({ where: { id: jobId } });

  const meta = headerMeta(headers());
  await logActivity({
    type: "admin.job.delete",
    kind: "ACTIVITY",
    message: `Job supprimé : ${job?.name ?? jobId}`,
    userId: me,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { jobId, ownerId: job?.userId },
    notify: "productActivity",
  });

  revalidatePath("/admin/jobs");
}
