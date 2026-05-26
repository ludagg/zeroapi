import { tasks } from "@trigger.dev/sdk/v3";
import { prisma } from "./prisma";
import { runGenerationWorker } from "@/workers/runtime-worker";
import {
  GENERATE_API_TASK_ID,
  type GenerateApiPayload,
  type GenerateApiTask,
} from "@/triggers/generate-api";

export async function triggerGenerateJob(payload: GenerateApiPayload): Promise<void> {
  if (process.env.TRIGGER_SECRET_KEY) {
    try {
      await tasks.trigger<GenerateApiTask>(GENERATE_API_TASK_ID, payload);
      return;
    } catch (err) {
      // On retombe sur l'exécution locale en best-effort (utile en dev avec une clé invalide).
      console.error("Trigger.dev a refusé le déclenchement, fallback local :", err);
    }
  }

  void runGenerationWorker(payload).catch(async (err) => {
    await prisma.job.update({
      where: { id: payload.jobId },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Erreur inconnue",
        completedAt: new Date(),
      },
    });
  });
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
