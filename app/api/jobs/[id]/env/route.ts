import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto-secrets";
import { readSpec } from "@/lib/job-helpers";
import { categorizeEnvVar, listSpecEnvVars } from "@/lib/env-vars";

export const dynamic = "force-dynamic";

const InputSchema = z.object({
  key: z.string().min(1).max(64),
  value: z.string().min(1).max(8192),
});

async function loadOwnedJob(jobId: string) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return { error: "Non authentifié.", status: 401 as const };
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId: session.user.id },
    include: { envVariables: true },
  });
  if (!job) return { error: "Job introuvable.", status: 404 as const };
  return { job };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const result = await loadOwnedJob(params.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { job } = result;
  const spec = readSpec(job.spec);
  const specVars = spec ? listSpecEnvVars(spec) : [];
  const stored = new Map(job.envVariables.map((v) => [v.key, v]));

  // Values are NEVER returned in clear. Only presence + metadata.
  const variables = specVars.map((v) => {
    const row = stored.get(v.name);
    return {
      name: v.name,
      category: v.category,
      required: v.required,
      description: v.description ?? null,
      example: v.example ?? null,
      source: v.source,
      defined: Boolean(row),
      managed: row?.managed ?? false,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  });

  return NextResponse.json({ variables });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const result = await loadOwnedJob(params.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { job } = result;

  let body: z.infer<typeof InputSchema>;
  try {
    body = InputSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Requête invalide.", details: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  const spec = readSpec(job.spec);
  if (!spec) {
    return NextResponse.json({ error: "Spec indisponible." }, { status: 400 });
  }

  // Spec gate: only env keys declared by the runtime are accepted. Prevents
  // a malicious caller from polluting the deployment env with arbitrary
  // keys. Auto/cloud-managed keys are off-limits to user writes.
  const decl = listSpecEnvVars(spec).find((v) => v.name === body.key);
  if (!decl) {
    return NextResponse.json(
      { error: `La variable ${body.key} n'est pas déclarée par la spec.` },
      { status: 400 },
    );
  }
  if (decl.category === "auto") {
    return NextResponse.json(
      { error: `${body.key} est gérée par ZeroAPI — modification refusée.` },
      { status: 400 },
    );
  }

  const existing = await prisma.envVariable.findUnique({
    where: { jobId_key: { jobId: job.id, key: body.key } },
    select: { managed: true },
  });
  if (existing?.managed) {
    return NextResponse.json(
      { error: `${body.key} est gérée par ZeroAPI.` },
      { status: 400 },
    );
  }

  const encrypted = await encryptSecret(body.value);
  await prisma.envVariable.upsert({
    where: { jobId_key: { jobId: job.id, key: body.key } },
    create: { jobId: job.id, key: body.key, value: encrypted, managed: false },
    update: { value: encrypted },
  });

  return NextResponse.json({ ok: true });
}
