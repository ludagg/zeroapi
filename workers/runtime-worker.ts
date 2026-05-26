import { prisma } from "@/lib/prisma";
import { logAgent } from "@/lib/jobs";
import { sendJobReadyEmail } from "@/lib/resend";
import type { ZeroAPISpec } from "@/lib/spec";

type WorkerPayload = { jobId: string; spec: ZeroAPISpec };

/**
 * Pipeline complet de génération :
 *  1. clarifier   → valide la spec
 *  2. orchestrator → planifie le code
 *  3. code        → @ludagg/zeroapi-runtime
 *  4. security    → scan
 *  5. tests       → vitest
 *  6. upload ZIP sur R2
 *  7. notification email
 *
 * Les agents 1-5 sont stubbés en attendant le package runtime. Ils écrivent
 * dans `AgentLog` pour que la page Détail API puisse les afficher.
 */
export async function runGenerationWorker({ jobId, spec }: WorkerPayload): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} introuvable`);

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    await runAgent(jobId, "clarifier", async () => {
      if (!spec.models?.length) throw new Error("Spec sans modèles");
    });

    await runAgent(jobId, "orchestrator", async () => {
      await sleep(200);
    });

    const code = await runAgent(jobId, "code", async () => {
      // TODO: import { createRuntime } from "@ludagg/zeroapi-runtime"
      // const result = await createRuntime(spec);
      await sleep(500);
      return {
        endpoints: spec.endpoints.length || spec.models.length * 5,
        tests: { total: spec.models.length * 4, passed: spec.models.length * 4 },
      };
    });

    await runAgent(jobId, "security", async () => {
      await sleep(200);
    });

    await runAgent(jobId, "tests", async () => {
      await sleep(200);
    });

    const zipUrl = await runAgent(jobId, "upload", async () => {
      // TODO: upload réel sur Cloudflare R2 via @aws-sdk/client-s3
      return null as string | null;
    });

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "READY",
        completedAt: new Date(),
        endpoints: code.endpoints,
        testsTotal: code.tests.total,
        testsPassed: code.tests.passed,
        securityScore: "A",
        zipUrl: zipUrl ?? undefined,
      },
    });

    await sendJobReadyEmail(jobId).catch(() => undefined);
  } catch (err) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Erreur inconnue",
        completedAt: new Date(),
      },
    });
    throw err;
  }
}

async function runAgent<T>(
  jobId: string,
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const t0 = Date.now();
  await logAgent(jobId, name, "running");
  try {
    const result = await fn();
    await logAgent(jobId, name, "done", undefined, Date.now() - t0);
    return result;
  } catch (err) {
    await logAgent(
      jobId,
      name,
      "error",
      err instanceof Error ? err.message : String(err),
      Date.now() - t0,
    );
    throw err;
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
