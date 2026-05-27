import { task } from "@trigger.dev/sdk/v3";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { prisma } from "@/lib/prisma";
import { runGenerationWorker } from "@/workers/runtime-worker";

export const GENERATE_API_TASK_ID = "generate-api" as const;

export type GenerateApiPayload = {
  jobId: string;
  spec: ZeroAPISpec;
};

/**
 * Trigger.dev v3 task — déclenchée par `tasks.trigger("generate-api", payload)`
 * depuis `lib/jobs.ts#triggerGenerateJob`. Le task ID DOIT rester `generate-api`.
 *
 * Le worker écrit lui-même RUNNING → READY, et FAILED en cas d'erreur dans son
 * try/catch interne. Le task ajoute un filet de sécurité : si une erreur
 * remonte avant ou après le try/catch du worker (job introuvable, DB
 * indisponible, infra Trigger.dev), on garantit ici que le job ne reste
 * jamais bloqué en PENDING/RUNNING.
 *
 * IMPORTANT : ce fichier est bundlé par Trigger.dev et tourne hors-Vercel.
 * Il NE DOIT importer aucun module qui touche aux variables NEXT_PUBLIC_* ou
 * à Resend (cf. `lib/resend.ts`, `lib/auth.ts`). La notification email
 * passe par un appel HTTP vers Vercel (`/api/jobs/:id/notify`).
 */
export const generateApiTask = task({
  id: GENERATE_API_TASK_ID,
  maxDuration: 600,
  retry: { maxAttempts: 1 },
  run: async ({ jobId, spec }: GenerateApiPayload) => {
    try {
      await runGenerationWorker({ jobId, spec });
      await notifyVercel(jobId);
      return { jobId, status: "completed" as const };
    } catch (err) {
      await prisma.job
        .updateMany({
          where: { id: jobId, status: { notIn: ["READY", "FAILED"] } },
          data: {
            status: "FAILED",
            errorMessage: err instanceof Error ? err.message : "Erreur inconnue",
            completedAt: new Date(),
          },
        })
        .catch(() => undefined);
      await notifyVercel(jobId);
      throw err;
    }
  },
});

async function notifyVercel(jobId: string): Promise<void> {
  const appUrl = process.env.APP_URL;
  if (!appUrl) return;
  try {
    await fetch(`${appUrl}/api/jobs/${jobId}/notify`, { method: "POST" });
  } catch {
    // best-effort : l'absence d'email ne doit pas faire échouer le job
  }
}

export type GenerateApiTask = typeof generateApiTask;
