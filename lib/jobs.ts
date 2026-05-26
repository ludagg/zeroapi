import { tasks } from "@trigger.dev/sdk/v3";
import { prisma } from "./prisma";
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
