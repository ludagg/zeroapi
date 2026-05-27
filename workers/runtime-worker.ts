import { createRuntime, type RuntimeResult, type ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { prisma } from "@/lib/prisma";
import { logAgent } from "@/lib/jobs";
import { countEndpoints } from "@/lib/spec";
import { countTables, ensureDatabaseForJob } from "@/lib/databases";
import { r2Configured, uploadJobBundle } from "@/lib/r2";
import { computeSecurity } from "@/lib/security-grade";
import { buildBundle } from "@/workers/zip-bundle";

type WorkerPayload = { jobId: string; spec: ZeroAPISpec };

/**
 * Trigger.dev worker.
 *
 * Pipeline :
 *   1. `clarifier` — sanity-check the incoming spec.
 *   2. `code`      — run `createRuntime(spec)` to produce app + artefacts.
 *   3. `bundle`    — `buildBundle()` zips spec / Prisma schema / tests / etc.
 *   4. `upload`    — `uploadJobBundle()` PUTs the ZIP on R2 and mints a
 *                    7-day signed URL persisted in `Job.zipUrl`.
 *
 * Each step is wrapped in `runAgent()` so timings and errors land in
 * `JobLog`. If R2 isn't configured the upload step is skipped and the
 * download route's on-the-fly rebuild kicks in as fallback.
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

    const bundle = await runAgent(jobId, "bundle", async () => {
      return buildBundle({
        spec,
        prismaSchema: result.prismaSchema,
        testSuite: result.testSuite,
        openApiSpec: result.openApiSpec,
      });
    });

    const zipUrl = await runAgent<string | null>(jobId, "upload", async () => {
      if (!r2Configured()) {
        return null;
      }
      const upload = await uploadJobBundle(jobId, bundle.buffer);
      return upload.configured ? upload.signedUrl : null;
    });

    const endpoints = countEndpoints(spec);
    const testsTotal = countTestCases(result.testSuite);
    const securityScore = computeSecurity(spec).grade;

    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: jobId },
        data: {
          status: "READY",
          completedAt: new Date(),
          endpoints,
          testsTotal,
          testsPassed: testsTotal,
          securityScore,
          zipUrl,
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
