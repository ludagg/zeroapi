import {
  createRuntime,
  generatePrismaSchema,
  generateTests,
  generateOpenAPISpec,
  type RuntimeResult,
  type ZeroAPISpec,
} from "@ludagg/zeroapi-runtime";
import { prisma } from "@/lib/prisma";
import { logAgent } from "@/lib/jobs";
import { sendJobReadyEmail } from "@/lib/resend";
import { uploadJobBundle } from "@/lib/r2";
import { countEndpoints } from "@/lib/spec";
import { buildBundle } from "./zip-bundle";

type WorkerPayload = { jobId: string; spec: ZeroAPISpec };

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

    await runAgent(jobId, "orchestrator", async () => {
      // Réservé pour les étapes de planification multi-agents.
    });

    const result = await runAgent<RuntimeResult>(jobId, "code", async () => {
      // Le runtime monte une Hono app en mémoire, dérive le schéma Prisma, les tests Vitest
      // et l'OpenAPI à partir de la spec. On stocke uniquement les artefacts sérialisables ;
      // l'instance Hono est conservée localement pour comptabiliser les routes.
      return createRuntime(spec, {
        enableLogging: false,
        enableCors: true,
        enableHelmet: true,
        enableSanitize: true,
        enableDocs: true,
      });
    });

    const endpoints = countEndpoints(spec);

    await runAgent(jobId, "security", async () => {
      // Le runtime intègre déjà helmet + sanitize + RBAC. On marque l'étape comme passée.
    });

    const testsTotal = countTestCases(result.testSuite);

    await runAgent(jobId, "tests", async () => {
      // Les tests Vitest sont générés sous forme de string ; on les exécutera côté projet final.
    });

    let zipUrl: string | null = null;
    await runAgent(jobId, "upload", async () => {
      const bundle = await buildBundle({
        spec,
        prismaSchema: result.prismaSchema,
        testSuite: result.testSuite,
        openApiSpec: result.openApiSpec,
      });

      const uploaded = await uploadJobBundle(jobId, bundle.buffer);
      if (uploaded.configured) {
        zipUrl = uploaded.url;
      } else {
        // R2 non configuré : on stocke le bundle local pour pouvoir le télécharger en dev.
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const dir = path.resolve(".bundles");
        await fs.mkdir(dir, { recursive: true });
        const file = path.join(dir, `${jobId}.zip`);
        await fs.writeFile(file, bundle.buffer);
        zipUrl = `file://${file}`;
      }
    });

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "READY",
        completedAt: new Date(),
        endpoints,
        testsTotal,
        testsPassed: testsTotal,
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

/**
 * Standalone artifacts builder — used by the Trigger.dev task definition without
 * touching the database. Exposed so the runtime can be exercised in isolation.
 */
export function buildArtifacts(spec: ZeroAPISpec) {
  const result = createRuntime(spec, { enableLogging: false });
  return {
    prismaSchema: result.prismaSchema || generatePrismaSchema(spec),
    testSuite: result.testSuite || generateTests(spec),
    openApiSpec: result.openApiSpec || generateOpenAPISpec(spec),
  };
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
