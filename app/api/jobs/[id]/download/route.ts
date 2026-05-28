import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  generateOpenAPISpec,
  generatePrismaSchema,
  generateTests,
} from "@ludagg/zeroapi-runtime";
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
 * Fallback  : rebuild the bundle on-the-fly with the pure generators
 * (`generatePrismaSchema`, `generateTests`, `generateOpenAPISpec`) and stream
 * the bytes. We deliberately do NOT call `createRuntime` here: it would boot
 * the Hono app and run `validateAndGenerateEnv`, which is fail-closed in
 * `NODE_ENV=production` (this route runs on Vercel) and would refuse to
 * generate the bundle for any spec requiring deploy-time env vars
 * (e.g. OAuth's `GOOGLE_CLIENT_ID`). Bundle rebuild must never depend on the
 * generated API's runtime env.
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

  const bundle = await buildBundle({
    spec,
    prismaSchema: generatePrismaSchema(spec),
    testSuite: generateTests(spec),
    openApiSpec: generateOpenAPISpec(spec),
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
