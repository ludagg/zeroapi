import {
  generateOpenAPISpec,
  generatePrismaSchema,
  generateTests,
  type OpenAPISpec,
  type ZeroAPISpec,
} from "@ludagg/zeroapi-runtime";
import { prisma } from "@/lib/prisma";
import { getNormalizedEnvVars } from "@/lib/env-vars";
import { logAgent } from "@/lib/jobs";
import { countEndpoints } from "@/lib/spec";
import { countTables, ensureDatabaseForJob } from "@/lib/databases";
import { r2Configured, uploadJobBundle } from "@/lib/r2";
import { computeSecurity } from "@/lib/security-grade";
import { buildBundle } from "@/workers/zip-bundle";

type WorkerPayload = { jobId: string; spec: ZeroAPISpec };

type CodeArtifacts = {
  prismaSchema: string;
  testSuite: string;
  openApiSpec: OpenAPISpec;
};

/**
 * Trigger.dev worker.
 *
 * Pipeline :
 *   1. `clarifier` — sanity-check the incoming spec.
 *   2. `code`      — pure generators (`generatePrismaSchema`, `generateTests`,
 *                    `generateOpenAPISpec`) produce the artefacts. We do NOT
 *                    call `createRuntime` here: it boots the Hono app and runs
 *                    `validateAndGenerateEnv` which is fail-closed in
 *                    `NODE_ENV=production` and would refuse to start as soon
 *                    as the spec requires any env var (e.g. OAuth's
 *                    `GOOGLE_CLIENT_ID`). Code generation must never depend on
 *                    deploy-time env values.
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

    const result = await runAgent<CodeArtifacts>(jobId, "code", async () => {
      const required = getNormalizedEnvVars(spec)
        .filter((v) => v.required)
        .map((v) => v.name);
      if (required.length > 0) {
        await logAgent(
          jobId,
          "code",
          "running",
          `Variables requises au déploiement (info, non bloquant) : ${required.join(", ")}`,
        );
      }
      return {
        prismaSchema: generatePrismaSchema(spec),
        testSuite: generateTests(spec),
        openApiSpec: generateOpenAPISpec(spec),
      };
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
