import { tasks } from "@trigger.dev/sdk/v3";
import { prisma } from "./prisma";
import { captureException } from "./observability";
import {
  GENERATE_API_TASK_ID,
  type GenerateApiPayload,
  type GenerateApiTask,
} from "@/triggers/generate-api";

/**
 * Déclenche la pipeline de génération via Trigger.dev v3.
 *
 * Plus de fallback inline — Trigger.dev est désormais une dépendance dure.
 * Si le déclenchement échoue (clé manquante, infra down…), l'erreur remonte
 * à l'API route, qui marquera le job en FAILED côté caller.
 */
export async function triggerGenerateJob(payload: GenerateApiPayload): Promise<void> {
  await tasks.trigger<GenerateApiTask>(GENERATE_API_TASK_ID, payload);
}

/**
 * Mark a job FAILED after a Trigger.dev dispatch error and report it to
 * Sentry. Shared by every route that launches a generation so the failure
 * handling (and observability) stays consistent. Never throws.
 */
export async function markJobDispatchFailed(
  jobId: string,
  err: unknown,
  label: "génération" | "régénération" = "génération",
): Promise<void> {
  captureException(err, { jobId, phase: "dispatch" });
  await prisma.job
    .update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage:
          `Impossible de déclencher la ${label} (Trigger.dev): ` +
          (err instanceof Error ? err.message : String(err)),
        completedAt: new Date(),
      },
    })
    .catch(() => undefined);
}

export async function logAgent(
  jobId: string,
  agent: string,
  status: "pending" | "running" | "done" | "error",
  message?: string,
  duration?: number,
): Promise<void> {
  await prisma.agentLog.create({
    data: { jobId, agent, status, message, duration },
  });
}
