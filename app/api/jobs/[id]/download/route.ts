import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createRuntime } from "@ludagg/zeroapi-runtime";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readSpec } from "@/lib/job-helpers";
import { buildBundle } from "@/workers/zip-bundle";

export const dynamic = "force-dynamic";

/**
 * Rebuilds the ZIP bundle on-the-fly for a READY job.
 *
 * Previously the worker uploaded the bundle to R2 and we redirected to a
 * signed URL. Now the worker only persists metadata (status, endpoints,
 * counts) — the spec is in `Job.spec` and the bundle is deterministic, so
 * we just rerun createRuntime + buildBundle here and stream the bytes.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true, spec: true, name: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
  }
  if (job.userId !== session.user.id) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (job.status !== "READY" && job.status !== "DEPLOYED") {
    return NextResponse.json(
      { error: "Le bundle n'est pas encore prêt." },
      { status: 404 },
    );
  }

  const spec = readSpec(job.spec);
  if (!spec) {
    return NextResponse.json(
      { error: "Spec absente ou invalide pour ce job." },
      { status: 500 },
    );
  }

  const result = createRuntime(spec, { enableLogging: false });
  const bundle = await buildBundle({
    spec,
    prismaSchema: result.prismaSchema,
    testSuite: result.testSuite,
    openApiSpec: result.openApiSpec,
  });

  return new Response(new Uint8Array(bundle.buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(bundle.size),
      "Content-Disposition": `attachment; filename="${job.name}.zip"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
