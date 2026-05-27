import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveDownloadUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * Returns the download URL for a job's ZIP bundle.
 *
 * - 200 `{ url }`      : `Job.zipUrl` is set and resolves to a fetchable URL
 *                        (R2 signed URL or stored https). Client navigates to
 *                        it to trigger the browser download.
 * - 202 `{ error }`    : Job is ready but the ZIP isn't available yet
 *                        (upload still pending or expired ref). Front-end
 *                        surfaces a "ZIP en cours de génération…" toast.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true, name: true, zipUrl: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
  }
  if (job.userId !== session.user.id) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (job.status !== "READY" && job.status !== "DEPLOYED") {
    return NextResponse.json(
      { error: "ZIP en cours de génération..." },
      { status: 202 },
    );
  }

  if (!job.zipUrl) {
    return NextResponse.json(
      { error: "ZIP en cours de génération..." },
      { status: 202 },
    );
  }

  const url = await resolveDownloadUrl(job.zipUrl, {
    filename: `${job.name}.zip`,
  });
  if (!url) {
    return NextResponse.json(
      { error: "ZIP en cours de génération..." },
      { status: 202 },
    );
  }

  return NextResponse.json({ url }, { status: 200 });
}
