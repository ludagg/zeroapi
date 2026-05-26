import { prisma } from "./prisma";
import { runGenerationWorker } from "@/workers/runtime-worker";
import type { ZeroAPISpec } from "./spec";

type TriggerPayload = { jobId: string; spec: ZeroAPISpec };

export async function triggerGenerateJob(payload: TriggerPayload): Promise<void> {
  if (process.env.TRIGGER_API_KEY && process.env.TRIGGER_API_URL) {
    await sendToTriggerDev(payload);
    return;
  }
  // Pas de Trigger.dev configuré → run inline en best-effort (dev).
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

async function sendToTriggerDev(payload: TriggerPayload): Promise<void> {
  const url = `${process.env.TRIGGER_API_URL}/api/v1/events`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TRIGGER_API_KEY}`,
    },
    body: JSON.stringify({
      name: "api.generate",
      payload,
    }),
  });
  if (!res.ok) {
    throw new Error(`Trigger.dev a refusé l'événement (${res.status}).`);
  }
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
