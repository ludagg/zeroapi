import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  apiSlugFor,
  CoolifyError,
  deployApplication,
  describeCoolifyEnv,
  provisionPostgres,
  readCoolifyConfigDetailed,
  type CoolifyEnvVar,
} from "@/lib/coolify";
import { decryptSecret } from "@/lib/crypto-secrets";

export const dynamic = "force-dynamic";

const MISSING_VAR_HINT: Record<CoolifyEnvVar, string> = {
  COOLIFY_API_URL: "COOLIFY_API_URL",
  COOLIFY_API_TOKEN: "COOLIFY_API_TOKEN",
  COOLIFY_PROJECT_UUID: "COOLIFY_PROJECT_UUID",
  COOLIFY_SERVER_UUID: "COOLIFY_SERVER_UUID",
  COOLIFY_ENVIRONMENT_UUID_OR_NAME:
    "COOLIFY_ENVIRONMENT_UUID (recommandé) ou COOLIFY_ENVIRONMENT_NAME",
};

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

  console.log("[deploy-zeroapi] start", { jobId: job.id, env: describeCoolifyEnv() });

  const cfgResult = readCoolifyConfigDetailed();
  if (!cfgResult.ok) {
    const missingLabels = cfgResult.missing.map((m) => MISSING_VAR_HINT[m]);
    console.error("[deploy-zeroapi] missing env vars", { missing: cfgResult.missing });
    return NextResponse.json(
      {
        error: `Variable manquante : ${missingLabels.join(", ")}`,
        missing: cfgResult.missing,
      },
      { status: 503 },
    );
  }
  const cfg = cfgResult.config;
  const slug = apiSlugFor(job.name, job.id);

  // Decrypt user-provided env vars.
  const envVars: Array<{ key: string; value: string }> = [];
  let decryptFailures = 0;
  for (const ev of job.envVariables) {
    if (ev.managed) continue;
    try {
      const value = await decryptSecret(ev.value);
      envVars.push({ key: ev.key, value });
    } catch {
      decryptFailures += 1;
    }
  }
  if (decryptFailures > 0) {
    console.warn("[deploy-zeroapi] decrypt failures", { decryptFailures, jobId: job.id });
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

    console.log("[deploy-zeroapi] ok", { jobId: job.id, url: app.publicUrl });
    return NextResponse.json({
      url: app.publicUrl,
      applicationUuid: app.uuid,
      databaseUuid: db.uuid,
    });
  } catch (err) {
    const isCoolify = err instanceof CoolifyError;
    const message = err instanceof Error ? err.message : "Échec inconnu.";
    const fieldErrors = isCoolify ? err.fieldErrors : {};
    console.error("[deploy-zeroapi] failed", {
      jobId: job.id,
      status: isCoolify ? err.status : undefined,
      message,
      fieldErrors,
    });
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "FAILED" },
    });
    return NextResponse.json(
      {
        error: `Déploiement ZeroAPI Cloud échoué : ${message}`,
        fieldErrors,
      },
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

  return NextResponse.json({
    status: job.deployment.status,
    url: job.deployment.url,
  });
}
