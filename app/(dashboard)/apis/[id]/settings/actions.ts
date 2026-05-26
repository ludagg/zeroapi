"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto-secrets";

const KEY_RE = /^[A-Z][A-Z0-9_]{0,63}$/;

const InputSchema = z.object({
  jobId: z.string().min(1),
  key: z
    .string()
    .min(1, "Clé requise")
    .max(64)
    .regex(KEY_RE, "Format attendu : MAJUSCULES_ET_UNDERSCORE"),
  value: z.string().min(1, "Valeur requise").max(8192),
});

async function assertOwnership(jobId: string): Promise<string> {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) throw new Error("Non authentifié.");
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { userId: true },
  });
  if (!job) throw new Error("Job introuvable.");
  if (job.userId !== session.user.id) throw new Error("Accès refusé.");
  return session.user.id;
}

async function assertEditable(jobId: string, varId: string) {
  const found = await prisma.envVariable.findFirst({
    where: { id: varId, jobId },
    select: { managed: true },
  });
  if (!found) throw new Error("Variable introuvable.");
  if (found.managed) {
    throw new Error("Variable gérée par ZeroAPI — modification interdite.");
  }
}

export async function upsertEnvVariable(input: { jobId: string; key: string; value: string }) {
  const parsed = InputSchema.parse(input);
  await assertOwnership(parsed.jobId);

  const existing = await prisma.envVariable.findUnique({
    where: { jobId_key: { jobId: parsed.jobId, key: parsed.key } },
    select: { id: true, managed: true },
  });
  if (existing?.managed) {
    throw new Error("Cette variable est gérée par ZeroAPI.");
  }

  const encrypted = await encryptSecret(parsed.value);

  await prisma.envVariable.upsert({
    where: { jobId_key: { jobId: parsed.jobId, key: parsed.key } },
    create: {
      jobId: parsed.jobId,
      key: parsed.key,
      value: encrypted,
      managed: false,
    },
    update: { value: encrypted },
  });

  revalidatePath(`/apis/${parsed.jobId}/settings`);
}

export async function deleteEnvVariable(jobId: string, varId: string) {
  await assertOwnership(jobId);
  await assertEditable(jobId, varId);
  await prisma.envVariable.delete({ where: { id: varId } });
  revalidatePath(`/apis/${jobId}/settings`);
}
