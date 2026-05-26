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
 */
export const generateApiTask = task({
  id: GENERATE_API_TASK_ID,
  maxDuration: 600,
  retry: { maxAttempts: 1 },
  run: async ({ jobId, spec }: GenerateApiPayload) => {
    try {
      await runGenerationWorker({ jobId, spec });
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
      throw err;
    }
  },
});

export type GenerateApiTask = typeof generateApiTask;
