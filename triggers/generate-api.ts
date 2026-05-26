import { task } from "@trigger.dev/sdk/v3";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { runGenerationWorker } from "@/workers/runtime-worker";

export const GENERATE_API_TASK_ID = "generate-api" as const;

export type GenerateApiPayload = {
  jobId: string;
  spec: ZeroAPISpec;
};

/**
 * Trigger.dev v3 task — déclenchée par `tasks.trigger("generate-api", payload)`
 * depuis `lib/jobs.ts#triggerGenerateJob`.
 *
 * Le task ID DOIT rester `generate-api` (même valeur que `GENERATE_API_TASK_ID`).
 * Le worker écrit dans Prisma et upload sur R2 ; on lui fait confiance pour son
 * propre retry interne, donc on désactive le retry par défaut de Trigger.dev.
 */
export const generateApiTask = task({
  id: GENERATE_API_TASK_ID,
  maxDuration: 600,
  retry: { maxAttempts: 1 },
  run: async (payload: GenerateApiPayload) => {
    await runGenerationWorker(payload);
    return { jobId: payload.jobId, status: "completed" as const };
  },
});

export type GenerateApiTask = typeof generateApiTask;
