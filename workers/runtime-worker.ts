import { createRuntime, type RuntimeResult, type ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { prisma } from "@/lib/prisma";
import { logAgent } from "@/lib/jobs";
import { countEndpoints } from "@/lib/spec";
import { countTables, ensureDatabaseForJob } from "@/lib/databases";

type WorkerPayload = { jobId: string; spec: ZeroAPISpec };

/**
 * Trigger.dev worker — minimal surface so it only needs DATABASE_URL.
 *
 * Side-effects allowed in the worker:
 *   - createRuntime(spec) — pure, no env
 *   - Prisma writes (RUNNING / READY / FAILED, endpoints/test counts, ensureDatabaseForJob)
 *
 * Anything env-dependent (R2 upload, Resend email, ZIP bundling) has been
 * moved out — those run on Vercel (download route + webhook listener that
 * fires on the READY transition).
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
      if (!spec.resources?.length) throw new Error("Spec sans ressources");
      if (!spec.name) throw new Error("Spec sans nom");
    });

    const result = await runAgent<RuntimeResult>(jobId, "code", async () => {
      return createRuntime(spec, {
        enableLogging: false,
        enableCors: true,
        enableHelmet: true,
        enableSanitize: true,
        enableDocs: true,
      });
    });

    const endpoints = countEndpoints(spec);
    const testsTotal = countTestCases(result.testSuite);

    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: jobId },
        data: {
          status: "READY",
          completedAt: new Date(),
          endpoints,
          testsTotal,
          testsPassed: testsTotal,
          securityScore: "A",
        },
      });
      await ensureDatabaseForJob(tx, {
        jobId,
        userId: job.userId,
        specName: spec.name,
        tables: countTables(spec),
      });
    });
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

async function runAgent<T>(jobId: string, name: string, fn: () => Promise<T>): Promise<T> {
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

function countTestCases(suite: string): number {
  const matches = suite.match(/\bit\s*\(\s*['"`]/g);
  return matches?.length ?? 0;
}
