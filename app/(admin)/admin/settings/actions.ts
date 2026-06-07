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
import { headerMeta, logActivity } from "@/lib/activity";

async function assertAdmin(): Promise<string> {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) throw new Error("Non authentifié.");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "ADMIN") throw new Error("Accès refusé.");
  return session.user.id;
}

async function audit(
  actorId: string,
  type: string,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const meta = headerMeta(headers());
  await logActivity({
    type,
    kind: "ACTIVITY",
    message,
    userId: actorId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata,
    notify: "productActivity",
  });
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
  const me = await assertAdmin();
  const parsed = SaveSchema.parse(input);
  await saveProviderConfig(parsed);
  await audit(me, "admin.provider.save", `Clé enregistrée pour ${parsed.provider}`, {
    provider: parsed.provider,
    model: parsed.model,
  });
  revalidatePath("/admin/settings/ai-providers");
  revalidatePath("/admin/settings/llm-routing");
}

export async function setProviderEnabled(input: {
  provider: string;
  enabled: boolean;
}): Promise<void> {
  const me = await assertAdmin();
  if (!isProviderId(input.provider)) throw new Error("Provider inconnu.");
  await toggleProviderEnabled(input.provider, Boolean(input.enabled));
  await audit(
    me,
    "admin.provider.toggle",
    `Provider ${input.provider} ${input.enabled ? "activé" : "désactivé"}`,
    { provider: input.provider, enabled: Boolean(input.enabled) },
  );
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
  const me = await assertAdmin();
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

  await audit(me, "admin.routing.save", "Matrice de routage LLM mise à jour", {
    entries: parsed.entries.length,
  });
  revalidatePath("/admin/settings/llm-routing");
}
