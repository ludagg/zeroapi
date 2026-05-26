import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveDownloadUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true, zipUrl: true, name: true },
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
  if (!job.zipUrl) {
    return NextResponse.json(
      { error: "Aucun bundle attaché à ce job." },
      { status: 404 },
    );
  }

  // ============ Local file fallback (dev sans R2) ============
  if (job.zipUrl.startsWith("file://")) {
    const path = job.zipUrl.slice("file://".length);
    try {
      const stat = statSync(path);
      const stream = Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>;
      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Length": String(stat.size),
          "Content-Disposition": `attachment; filename="${job.name}.zip"`,
          "Cache-Control": "private, no-cache",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Bundle local introuvable." },
        { status: 404 },
      );
    }
  }

  // ============ R2 (public ou signé) ============
  const url = await resolveDownloadUrl(job.zipUrl, {
    expiresIn: 60 * 60 * 24 * 7,
    filename: `${job.name}.zip`,
  });
  if (!url) {
    return NextResponse.json(
      { error: "Impossible de résoudre l'URL du bundle." },
      { status: 500 },
    );
  }

  // Réponse JSON pour permettre au client d'afficher l'URL avant de naviguer
  // (utile pour copier/coller dans un terminal `curl`).
  return NextResponse.json({ url, expiresIn: 60 * 60 * 24 * 7 });
}
