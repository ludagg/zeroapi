import { prisma } from "./prisma";
import { cacheDel, cacheGet, cacheSet } from "./cache";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto-secrets";

/**
 * Platform-wide settings, persisted in the AppSetting key/value table and
 * configurable from the admin UI. Secret values are encrypted at rest.
 */

const TELEGRAM_CACHE_KEY = "zeroapi:telegram-config:v1";
const TELEGRAM_CACHE_TTL = 60;

export type TelegramTriggers = {
  /** Failed logins / brute-force attempts. */
  failedLogin: boolean;
  /** A single IP exceeding the request rate limit. */
  rateLimit: boolean;
  /** Probes for known sensitive paths (.env, wp-admin, .git…). */
  pathScan: boolean;
  /** Product activity: signups, jobs, deployments, admin actions. */
  productActivity: boolean;
};

export const DEFAULT_TELEGRAM_TRIGGERS: TelegramTriggers = {
  failedLogin: true,
  rateLimit: true,
  pathScan: true,
  productActivity: true,
};

export type TelegramConfig = {
  enabled: boolean;
  botToken: string | null;
  chatId: string | null;
  triggers: TelegramTriggers;
  /** Where the credentials came from. */
  source: "db" | "env" | "none";
};

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting
    .findUnique({ where: { key } })
    .catch(() => null);
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

function parseTriggers(raw: string | null): TelegramTriggers {
  if (!raw) return { ...DEFAULT_TELEGRAM_TRIGGERS };
  try {
    const parsed = JSON.parse(raw) as Partial<TelegramTriggers>;
    return { ...DEFAULT_TELEGRAM_TRIGGERS, ...parsed };
  } catch {
    return { ...DEFAULT_TELEGRAM_TRIGGERS };
  }
}

/**
 * Resolve the effective Telegram config. DB wins over env. The bot token is
 * decrypted here and cached (short TTL) so security hooks stay cheap.
 */
export async function getTelegramConfig(): Promise<TelegramConfig> {
  const cached = await cacheGet(TELEGRAM_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as TelegramConfig;
    } catch {
      // bad cache → recompute
    }
  }

  const [enabledRaw, tokenEnc, chatId, triggersRaw] = await Promise.all([
    getSetting("telegram.enabled"),
    getSetting("telegram.botToken"),
    getSetting("telegram.chatId"),
    getSetting("telegram.triggers"),
  ]);

  let botToken: string | null = null;
  let source: TelegramConfig["source"] = "none";
  let chat = chatId;

  if (tokenEnc) {
    try {
      botToken = await decryptSecret(tokenEnc);
      source = "db";
    } catch {
      botToken = null;
    }
  }

  if (!botToken && process.env.TELEGRAM_BOT_TOKEN) {
    botToken = process.env.TELEGRAM_BOT_TOKEN;
    chat = chat ?? process.env.TELEGRAM_ADMIN_CHAT_ID ?? null;
    source = "env";
  }

  // DB-stored enabled flag wins; with env-only creds we default to enabled.
  const enabled =
    enabledRaw !== null ? enabledRaw === "true" : source === "env";

  const config: TelegramConfig = {
    enabled: enabled && Boolean(botToken && chat),
    botToken,
    chatId: chat,
    triggers: parseTriggers(triggersRaw),
    source,
  };

  await cacheSet(TELEGRAM_CACHE_KEY, JSON.stringify(config), TELEGRAM_CACHE_TTL);
  return config;
}

export async function invalidateTelegramConfigCache(): Promise<void> {
  await cacheDel(TELEGRAM_CACHE_KEY);
}

/** Admin-facing view — never exposes the raw bot token. */
export type TelegramAdminView = {
  enabled: boolean;
  hasToken: boolean;
  tokenMask: string | null;
  chatId: string | null;
  triggers: TelegramTriggers;
  source: TelegramConfig["source"];
};

export async function getTelegramAdminView(): Promise<TelegramAdminView> {
  const c = await getTelegramConfig();
  return {
    enabled: c.enabled,
    hasToken: Boolean(c.botToken),
    tokenMask: c.botToken ? maskSecret(c.botToken) : null,
    chatId: c.chatId,
    triggers: c.triggers,
    source: c.source,
  };
}

export async function saveTelegramConfig(input: {
  enabled: boolean;
  /** Leave undefined/empty to keep the existing token. */
  botToken?: string;
  chatId: string;
  triggers: TelegramTriggers;
}): Promise<void> {
  const ops: Promise<unknown>[] = [
    setSetting("telegram.enabled", input.enabled ? "true" : "false"),
    setSetting("telegram.chatId", input.chatId.trim()),
    setSetting("telegram.triggers", JSON.stringify(input.triggers)),
  ];
  if (input.botToken && input.botToken.trim().length > 0) {
    const encrypted = await encryptSecret(input.botToken.trim());
    ops.push(setSetting("telegram.botToken", encrypted));
  }
  await Promise.all(ops);
  await invalidateTelegramConfigCache();
}
