import { prisma } from "./prisma";
import { logActivity } from "./activity";

/**
 * Safety net for jobs that Trigger.dev accepted but never completed (worker
 * crash, dropped task, infra outage). Without this, a job can sit in
 * PENDING/RUNNING forever behind an infinite spinner.
 *
 * A job is considered stuck when it has been PENDING/RUNNING longer than
 * STALE_MINUTES (well beyond the 10-min trigger maxDuration). We mark such
 * jobs FAILED with an actionable message so the user can relaunch.
 */
const STALE_MINUTES = 20;

export async function failStaleJobs(): Promise<{ failed: number }> {
  const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000);

  const stale = await prisma.job.findMany({
    where: {
      status: { in: ["PENDING", "RUNNING"] },
      OR: [
        { startedAt: { lt: cutoff } },
        { startedAt: null, createdAt: { lt: cutoff } },
      ],
    },
    select: { id: true, name: true, userId: true, status: true },
  });
  if (stale.length === 0) return { failed: 0 };

  await prisma.job.updateMany({
    where: { id: { in: stale.map((j) => j.id) } },
    data: {
      status: "FAILED",
      errorMessage:
        "Génération expirée : aucune réponse du worker dans le délai imparti. Relance la génération.",
      completedAt: new Date(),
    },
  });

  for (const j of stale) {
    await logActivity({
      type: "job.stuck",
      kind: "ACTIVITY",
      severity: "WARNING",
      message: `Job bloqué auto-échoué : ${j.name}`,
      userId: j.userId,
      metadata: { jobId: j.id, previousStatus: j.status },
      notify: null,
    });
  }

  return { failed: stale.length };
}
