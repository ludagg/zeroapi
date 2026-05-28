import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto-secrets";
import { readSpec } from "@/lib/job-helpers";
import {
  buildCategorizedList,
  canUserSet,
  computeDeployReadiness,
} from "@/lib/env-vars";

export const dynamic = "force-dynamic";

const KEY_RE = /^[A-Z][A-Z0-9_]{0,63}$/;

const PostSchema = z.object({
  key: z
    .string()
    .min(1, "Clé requise.")
    .max(64)
    .regex(KEY_RE, "Format attendu : MAJUSCULES_ET_UNDERSCORE."),
  value: z.string().min(1, "Valeur requise.").max(8192),
});

/**
 * Loads a job belonging to the current session user, or short-circuits with a
 * NextResponse error. Centralises the auth/ownership boilerplate so the route
 * handlers only contain their own logic.
 */
async function loadOwnedJob(jobId: string) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return { error: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) };
  }
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId: session.user.id },
    select: { id: true, spec: true },
  });
  if (!job) {
    return { error: NextResponse.json({ error: "Job introuvable." }, { status: 404 }) };
  }
  return { job };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const loaded = await loadOwnedJob(params.id);
  if ("error" in loaded) return loaded.error;
  const { job } = loaded;

  const spec = readSpec(job.spec);
  const rows = await prisma.envVariable.findMany({
    where: { jobId: job.id },
    select: { key: true, updatedAt: true, managed: true },
  });
  const definedKeys = new Set(rows.map((r) => r.key));
  const updatedByKey = new Map(rows.map((r) => [r.key, r.updatedAt.toISOString()]));
  const managedByKey = new Map(rows.map((r) => [r.key, r.managed]));

  if (!spec) {
    // Spec not yet generated → no required vars to surface. Still return any
    // user-stored row so the UI shows something useful.
    return NextResponse.json({
      variables: rows.map((r) => ({
        name: r.key,
        required: false,
        category: managedByKey.get(r.key) ? "auto" : "optional",
        source: "explicit" as const,
        defined: true,
        updatedAt: updatedByKey.get(r.key),
      })),
      readiness: { ready: true, missingRequired: [], setRequired: [], autoVars: [] },
    });
  }

  const list = buildCategorizedList(spec, definedKeys).map((v) => ({
    ...v,
    updatedAt: updatedByKey.get(v.name) ?? null,
  }));
  const readiness = computeDeployReadiness(spec, definedKeys);

  return NextResponse.json({ variables: list, readiness });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const loaded = await loadOwnedJob(params.id);
  if ("error" in loaded) return loaded.error;
  const { job } = loaded;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Entrée invalide." },
      { status: 400 },
    );
  }

  const spec = readSpec(job.spec);
  if (!spec) {
    return NextResponse.json(
      { error: "Spec indisponible — la variable ne peut pas être validée." },
      { status: 409 },
    );
  }

  if (!canUserSet(spec, parsed.data.key)) {
    return NextResponse.json(
      {
        error: `${parsed.data.key} n'est pas une variable modifiable de cette API.`,
      },
      { status: 422 },
    );
  }

  const encrypted = await encryptSecret(parsed.data.value);

  await prisma.envVariable.upsert({
    where: { jobId_key: { jobId: job.id, key: parsed.data.key } },
    create: { jobId: job.id, key: parsed.data.key, value: encrypted, managed: false },
    update: { value: encrypted, managed: false },
  });

  return NextResponse.json({ ok: true });
}
