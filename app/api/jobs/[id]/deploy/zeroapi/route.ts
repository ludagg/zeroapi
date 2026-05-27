import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  apiSlugFor,
  coolifyConfigured,
  CoolifyError,
  deployApplication,
  provisionPostgres,
  readCoolifyConfig,
} from "@/lib/coolify";
import { decryptSecret } from "@/lib/crypto-secrets";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, plan: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }

  if (user.plan === "FREE" || user.plan === "STARTER") {
    return NextResponse.json(
      {
        error:
          "ZeroAPI Cloud est réservé aux plans Pro et Business. Passe à un plan supérieur pour déployer.",
      },
      { status: 402 },
    );
  }

  const job = await prisma.job.findFirst({
    where: { id: params.id, userId: user.id },
    include: { envVariables: true, deployment: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
  }
  if (job.status !== "READY" && job.status !== "DEPLOYED") {
    return NextResponse.json(
      { error: "Le job n'est pas encore prêt à être déployé." },
      { status: 400 },
    );
  }
  if (!job.zipUrl) {
    return NextResponse.json(
      { error: "Le bundle ZIP n'est pas disponible. Régénère le job." },
      { status: 400 },
    );
  }

  const cfg = readCoolifyConfig();
  if (!cfg || !coolifyConfigured()) {
    return NextResponse.json(
      {
        error:
          "ZeroAPI Cloud n'est pas configuré sur cette instance. Contacte l'admin.",
      },
      { status: 503 },
    );
  }

  const slug = apiSlugFor(job.name, job.id);

  // Decrypt user-provided env vars.
  const envVars: Array<{ key: string; value: string }> = [];
  for (const ev of job.envVariables) {
    if (ev.managed) continue;
    try {
      const value = await decryptSecret(ev.value);
      envVars.push({ key: ev.key, value });
    } catch {
      // Skip undecryptable values rather than failing the whole deploy.
    }
  }

  const deployment = await prisma.deployment.upsert({
    where: { jobId: job.id },
    create: {
      userId: user.id,
      jobId: job.id,
      platform: "ZEROAPI_CLOUD",
      status: "DEPLOYING",
    },
    update: {
      platform: "ZEROAPI_CLOUD",
      status: "DEPLOYING",
      url: null,
    },
  });

  try {
    const db = await provisionPostgres(cfg, { jobId: job.id, apiSlug: slug });
    if (!db.internalUrl) {
      throw new CoolifyError(
        "Postgres provisionné, mais aucune URL interne renvoyée.",
        500,
        null,
      );
    }

    const app = await deployApplication(cfg, {
      jobId: job.id,
      apiSlug: slug,
      databaseUrl: db.internalUrl,
      envVars,
      zipUrl: job.zipUrl,
    });

    await prisma.$transaction([
      prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: "ONLINE", url: app.publicUrl },
      }),
      prisma.job.update({
        where: { id: job.id },
        data: { status: "DEPLOYED" },
      }),
    ]);

    return NextResponse.json({
      url: app.publicUrl,
      applicationUuid: app.uuid,
      databaseUuid: db.uuid,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Échec inconnu.";
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "FAILED" },
    });
    return NextResponse.json(
      { error: `Déploiement ZeroAPI Cloud échoué : ${message}` },
      { status: 502 },
    );
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const job = await prisma.job.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { deployment: true },
  });
  if (!job || !job.deployment || job.deployment.platform !== "ZEROAPI_CLOUD") {
    return NextResponse.json({ status: "NONE" });
  }

  const cfg = readCoolifyConfig();
  if (!cfg) {
    return NextResponse.json({
      status: job.deployment.status,
      url: job.deployment.url,
    });
  }

  return NextResponse.json({
    status: job.deployment.status,
    url: job.deployment.url,
  });
}
