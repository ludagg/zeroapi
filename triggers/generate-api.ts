import { task } from "@trigger.dev/sdk/v3";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { prisma } from "@/lib/prisma";
import { runGenerationWorker } from "@/workers/runtime-worker";
import { captureException } from "@/lib/observability";

// Trigger.dev workers boot in their own process — Next.js's
// `instrumentation.ts` isn't invoked. Initialise Sentry inline so worker
// crashes surface in the same project.
if (process.env.SENTRY_DSN) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require("@sentry/nextjs") as typeof import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    sendDefaultPii: false,
    serverName: "trigger.dev/generate-api",
  });
}

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
      captureException(err, {
        scope: "trigger.generate-api",
        extra: { jobId, specName: spec.name },
      });
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
