"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import type { Plan } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isProviderId,
  saveProviderConfig,
  toggleProviderEnabled,
  type ProviderId,
} from "@/lib/ai-providers";
import {
  isRoutingTask,
  saveRoutingMatrix,
  type RoutingTask,
} from "@/lib/llm-routing-config";
import { testProviderConnection, type ProviderTestResult } from "@/lib/provider-test";

async function assertAdmin(): Promise<void> {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) throw new Error("Non authentifié.");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "ADMIN") throw new Error("Accès refusé.");
}

const SaveSchema = z.object({
  provider: z
    .string()
    .refine(isProviderId, { message: "Provider inconnu." })
    .transform((v) => v as ProviderId),
  apiKey: z.string().min(8, "Clé trop courte").max(2048),
  model: z.string().min(1).max(128),
});

export async function saveProvider(input: {
  provider: string;
  apiKey: string;
  model: string;
}): Promise<void> {
  await assertAdmin();
  const parsed = SaveSchema.parse(input);
  await saveProviderConfig(parsed);
  revalidatePath("/admin/settings/ai-providers");
  revalidatePath("/admin/settings/llm-routing");
}

export async function setProviderEnabled(input: {
  provider: string;
  enabled: boolean;
}): Promise<void> {
  await assertAdmin();
  if (!isProviderId(input.provider)) throw new Error("Provider inconnu.");
  await toggleProviderEnabled(input.provider, Boolean(input.enabled));
  revalidatePath("/admin/settings/ai-providers");
  revalidatePath("/admin/settings/llm-routing");
}

export async function testProvider(input: {
  provider: string;
  apiKey: string;
  model: string;
}): Promise<ProviderTestResult> {
  await assertAdmin();
  const parsed = SaveSchema.parse(input);
  return testProviderConnection(parsed);
}

const RoutingEntry = z.object({
  plan: z.enum(["FREE", "STARTER", "PRO", "BUSINESS"]),
  task: z.string().refine(isRoutingTask, { message: "Tâche inconnue." }),
  provider: z
    .string()
    .refine(isProviderId, { message: "Provider inconnu." })
    .transform((v) => v as ProviderId),
});

const RoutingPayload = z.object({
  entries: z.array(RoutingEntry).min(1),
});

export async function saveRouting(payload: {
  entries: Array<{ plan: Plan; task: string; provider: string }>;
}): Promise<void> {
  await assertAdmin();
  const parsed = RoutingPayload.parse(payload);

  // Refuse les providers non-activés pour éviter une matrice cassée.
  const enabledIds = (await prisma.aIProviderConfig.findMany({
    where: { enabled: true },
    select: { provider: true },
  })).map((p) => p.provider);
  if (enabledIds.length === 0) {
    throw new Error("Active au moins un provider avant de configurer le routage.");
  }
  const enabledSet = new Set(enabledIds);
  const broken = parsed.entries.find((e) => !enabledSet.has(e.provider));
  if (broken) {
    throw new Error(
      `Le provider ${broken.provider} n'est pas activé — active-le d'abord dans AI Providers.`,
    );
  }

  await saveRoutingMatrix(
    parsed.entries.map((e) => ({
      plan: e.plan,
      task: e.task as RoutingTask,
      provider: e.provider,
    })),
  );

  revalidatePath("/admin/settings/llm-routing");
}
