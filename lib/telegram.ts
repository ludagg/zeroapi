import { getTelegramConfig } from "./app-settings";

/**
 * Telegram notifier for the admin alert bot. Fire-and-forget, mirroring the
 * Resend email helper: never throws into the caller, no-ops when unconfigured.
 *
 * Credentials are resolved from the AppSetting table (admin UI) with an env
 * fallback (TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID).
 */

export type TelegramSendResult = {
  ok: boolean;
  /** Human-readable reason when ok is false (for the admin "test" button). */
  reason?: string;
};

async function sendRaw(
  botToken: string,
  chatId: string,
  text: string,
): Promise<TelegramSendResult> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      // Don't let a slow Telegram API stall a request handler.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, reason: `Telegram HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Erreur réseau" };
  }
}

/**
 * Send a message to the configured admin chat. Returns {ok:false} (never
 * throws) when Telegram is disabled or misconfigured.
 */
export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  const config = await getTelegramConfig();
  if (!config.enabled || !config.botToken || !config.chatId) {
    return { ok: false, reason: "Telegram non configuré ou désactivé." };
  }
  return sendRaw(config.botToken, config.chatId, text);
}

/**
 * Send a test message using explicit credentials (used by the admin "test"
 * button before the config is saved). Falls back to the stored token when
 * the form leaves it blank.
 */
export async function sendTelegramTest(input: {
  botToken?: string;
  chatId?: string;
}): Promise<TelegramSendResult> {
  let { botToken, chatId } = input;
  if (!botToken || !chatId) {
    const config = await getTelegramConfig();
    botToken = botToken || config.botToken || undefined;
    chatId = chatId || config.chatId || undefined;
  }
  if (!botToken || !chatId) {
    return { ok: false, reason: "Token et chat ID requis pour le test." };
  }
  return sendRaw(
    botToken.trim(),
    chatId.trim(),
    "✅ <b>ZeroAPI</b> — test de connexion du bot d'alerte réussi.",
  );
}

/** HTML-escape user-supplied content before interpolating into a message. */
export function escapeTelegram(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
