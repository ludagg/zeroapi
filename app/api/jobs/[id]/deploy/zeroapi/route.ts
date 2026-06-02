import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  apiSlugFor,
  CoolifyError,
  deployApplication,
  describeCoolifyEnv,
  pollDeploymentState,
  provisionPostgres,
  readCoolifyConfig,
  readCoolifyConfigDetailed,
  removeExistingApplications,
  removeExistingDatabases,
  type CoolifyEnvVar,
} from "@/lib/coolify";
import { decryptSecret, encryptSecret } from "@/lib/crypto-secrets";
import { computeDeployReadiness, getNormalizedEnvVars } from "@/lib/env-vars";
import { readSpec } from "@/lib/job-helpers";
import {
  appendLog,
  parseDeploymentLogs,
  type DeploymentLogEntry,
} from "@/lib/deployment-logs";

export const dynamic = "force-dynamic";

/** Prisma's `Json` input rejects fixed-shape interfaces; cast at the boundary. */
const asJson = (logs: DeploymentLogEntry[]): Prisma.InputJsonValue =>
  logs as unknown as Prisma.InputJsonValue;

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

  // ---- Pre-deploy gate: every REQUIRED (non-AUTO) variable must be set ----
  // Generation is NEVER blocked by this — the check only runs at deploy time.
  // We surface the missing keys + a link to the Variables tab so the owner
  // can act immediately. The deploy doesn't even reach Coolify.
  const spec = readSpec(job.spec);
  if (spec) {
    const defined = new Set(job.envVariables.map((v) => v.key));
    const readiness = computeDeployReadiness(spec, defined);
    if (!readiness.ready) {
      return NextResponse.json(
        {
          error: `Variables requises manquantes : ${readiness.missingRequired.join(", ")}. Renseigne-les dans l'onglet Variables avant de déployer.`,
          missingRequired: readiness.missingRequired,
          variablesUrl: `/apis/${job.id}/settings`,
        },
        { status: 422 },
      );
    }
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

  // Decrypt user-provided env vars (everything that's not platform-managed).
  // We re-fetch by key because we'll mutate managed rows below (JWT_SECRET).
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

  // ---- AUTO vars: persisted-once secrets + URL-bound vars ----
  // JWT_SECRET is generated once and reused across redeploys so existing
  // access tokens keep working — regenerating it would silently invalidate
  // every signed-in client. The value is stored encrypted with managed=true,
  // matching the same chiffrement scheme as user vars.
  const fqdn = `api-${slug}.${cfg.cloudDomain}`;
  const oauthCallbackBaseUrl = `https://${fqdn}`;

  if (spec) {
    const required = getNormalizedEnvVars(spec);
    const needsJwt = required.some((v) => v.source === "auth.jwt");
    const needsOAuthCallback = required.some((v) => v.name === "OAUTH_CALLBACK_BASE_URL");

    if (needsJwt) {
      const jwtKey = required.find((v) => v.source === "auth.jwt")!.name; // typically JWT_SECRET
      const existing = job.envVariables.find((v) => v.key === jwtKey && v.managed);
      let jwtValue: string | null = null;
      if (existing) {
        try {
          jwtValue = await decryptSecret(existing.value);
        } catch {
          jwtValue = null; // tamper / key rotation → mint a new one
        }
      }
      if (!jwtValue) {
        jwtValue = randomBytes(48).toString("hex");
        const encrypted = await encryptSecret(jwtValue);
        await prisma.envVariable.upsert({
          where: { jobId_key: { jobId: job.id, key: jwtKey } },
          create: { jobId: job.id, key: jwtKey, value: encrypted, managed: true },
          update: { value: encrypted, managed: true },
        });
      }
      envVars.push({ key: jwtKey, value: jwtValue });
    }

    if (needsOAuthCallback) {
      envVars.push({ key: "OAUTH_CALLBACK_BASE_URL", value: oauthCallbackBaseUrl });
    }
  }

  // Fresh journal for this deploy attempt — a redeploy starts a clean log and
  // clears the previous Coolify ids so the status poller never reads stale ones.
  let logs: DeploymentLogEntry[] = appendLog([], "Démarrage du déploiement ZeroAPI Cloud…");
  const deployment = await prisma.deployment.upsert({
    where: { jobId: job.id },
    create: {
      userId: user.id,
      jobId: job.id,
      platform: "ZEROAPI_CLOUD",
      status: "DEPLOYING",
      logs: asJson(logs),
    },
    update: {
      platform: "ZEROAPI_CLOUD",
      status: "DEPLOYING",
      url: null,
      coolifyAppUuid: null,
      coolifyDeploymentUuid: null,
      logs: asJson(logs),
    },
  });

  try {
    // Drop any orphan app + database before recreating, so retries after a
    // failed deploy don't accumulate duplicates on Coolify.
    await removeExistingApplications(cfg, `api-${slug}`);
    await removeExistingDatabases(cfg, `db-${slug}`);

    logs = appendLog(logs, "Provisionnement de la base Postgres dédiée…");
    const db = await provisionPostgres(cfg, { jobId: job.id, apiSlug: slug });
    if (!db.internalUrl) {
      throw new CoolifyError(
        "Postgres provisionné, mais aucune URL interne renvoyée.",
        500,
        null,
      );
    }
    logs = appendLog(logs, "Base Postgres prête.");

    const app = await deployApplication(cfg, {
      jobId: job.id,
      apiSlug: slug,
      databaseUrl: db.internalUrl,
      envVars,
      zipUrl: job.zipUrl,
      onLog: (m) => {
        logs = appendLog(logs, m);
      },
    });

    logs = appendLog(
      logs,
      "Build lancé côté serveur. Le statut passera à « En ligne » dès que le conteneur répond — ça peut prendre quelques minutes.",
    );

    // IMPORTANT: the Coolify build runs asynchronously. We deliberately keep
    // the deployment in DEPLOYING here — the GET endpoint polls Coolify and
    // only flips it to ONLINE (and the job to DEPLOYED) once the container is
    // genuinely running. Marking ONLINE now is what produced the false
    // "en ligne" status before the server had actually finished.
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: {
        status: "DEPLOYING",
        url: app.publicUrl,
        coolifyAppUuid: app.uuid,
        coolifyDeploymentUuid: app.deploymentUuid,
        logs: asJson(logs),
      },
    });

    console.log("[deploy-zeroapi] triggered", {
      jobId: job.id,
      url: app.publicUrl,
      deploymentUuid: app.deploymentUuid,
    });
    return NextResponse.json({
      url: app.publicUrl,
      status: "DEPLOYING",
      applicationUuid: app.uuid,
      deploymentUuid: app.deploymentUuid,
      databaseUuid: db.uuid,
      logs,
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
    logs = appendLog(logs, `Échec du déploiement : ${message}`, "error");
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "FAILED", logs: asJson(logs) },
    });
    return NextResponse.json(
      {
        error: `Déploiement ZeroAPI Cloud échoué : ${message}`,
        fieldErrors,
        status: "FAILED",
        logs,
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

  const dep = job.deployment;
  let logs = parseDeploymentLogs(dep.logs);

  // Terminal states need no polling — report what we stored.
  if (dep.status === "ONLINE" || dep.status === "FAILED") {
    return NextResponse.json({ status: dep.status, url: dep.url, logs });
  }

  // While DEPLOYING/PENDING, ask Coolify where the build actually is.
  const cfg = readCoolifyConfig();
  if (!cfg || (!dep.coolifyAppUuid && !dep.coolifyDeploymentUuid)) {
    return NextResponse.json({ status: dep.status, url: dep.url, logs });
  }

  const poll = await pollDeploymentState(cfg, {
    appUuid: dep.coolifyAppUuid,
    deploymentUuid: dep.coolifyDeploymentUuid,
  });

  if (poll.state === "ONLINE") {
    logs = appendLog(logs, "Déploiement terminé — l'API est en ligne ✓");
    await prisma.$transaction([
      prisma.deployment.update({
        where: { id: dep.id },
        data: { status: "ONLINE", logs: asJson(logs) },
      }),
      prisma.job.update({ where: { id: job.id }, data: { status: "DEPLOYED" } }),
    ]);
    return NextResponse.json({ status: "ONLINE", url: dep.url, logs });
  }

  if (poll.state === "FAILED") {
    logs = appendLog(
      logs,
      `Le build a échoué côté serveur${poll.raw ? ` (${poll.raw})` : ""}.`,
      "error",
    );
    await prisma.deployment.update({
      where: { id: dep.id },
      data: { status: "FAILED", logs: asJson(logs) },
    });
    return NextResponse.json({ status: "FAILED", url: dep.url, logs });
  }

  // Still building — no DB write to avoid log spam; just report progress.
  return NextResponse.json({ status: "DEPLOYING", url: dep.url, logs });
}
