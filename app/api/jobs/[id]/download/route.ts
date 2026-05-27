import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createRuntime } from "@ludagg/zeroapi-runtime";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readSpec } from "@/lib/job-helpers";
import { buildBundle } from "@/workers/zip-bundle";
import { resolveDownloadUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * Serves the ZIP bundle for a READY job.
 *
 * Fast path : if `Job.zipUrl` is set (the worker uploaded to R2 and persisted
 * a 7-day signed URL), redirect the client there directly.
 *
 * Fallback  : rebuild the bundle on-the-fly with `createRuntime + buildBundle`
 * and stream the bytes. This keeps downloads working when R2 isn't configured
 * or for older jobs whose signed URL has expired.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true, spec: true, name: true, zipUrl: true },
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

  if (job.zipUrl) {
    const resolved = await resolveDownloadUrl(job.zipUrl, {
      filename: `${job.name}.zip`,
    });
    if (resolved) return NextResponse.redirect(resolved, 302);
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
