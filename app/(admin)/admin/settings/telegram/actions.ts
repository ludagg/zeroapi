"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveTelegramConfig } from "@/lib/app-settings";
import { sendTelegramTest, type TelegramSendResult } from "@/lib/telegram";
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

const TriggersSchema = z.object({
  failedLogin: z.boolean(),
  rateLimit: z.boolean(),
  pathScan: z.boolean(),
  productActivity: z.boolean(),
});

const SaveSchema = z.object({
  enabled: z.boolean(),
  botToken: z.string().max(512).optional(),
  chatId: z.string().max(128),
  triggers: TriggersSchema,
});

export async function saveTelegramSettings(input: {
  enabled: boolean;
  botToken?: string;
  chatId: string;
  triggers: {
    failedLogin: boolean;
    rateLimit: boolean;
    pathScan: boolean;
    productActivity: boolean;
  };
}): Promise<void> {
  const me = await assertAdmin();
  const parsed = SaveSchema.parse(input);
  await saveTelegramConfig(parsed);

  const meta = headerMeta(headers());
  await logActivity({
    type: "admin.telegram.save",
    kind: "ACTIVITY",
    message: `Configuration Telegram ${parsed.enabled ? "activée" : "désactivée"}`,
    userId: me,
    ip: meta.ip,
    userAgent: meta.userAgent,
    notify: "productActivity",
  });

  revalidatePath("/admin/settings/telegram");
}

export async function sendTelegramTestMessage(input: {
  botToken?: string;
  chatId?: string;
}): Promise<TelegramSendResult> {
  await assertAdmin();
  return sendTelegramTest(input);
}
