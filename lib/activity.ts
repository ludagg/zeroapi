import type { ActivityKind, ActivitySeverity } from "@prisma/client";
import { prisma } from "./prisma";
import { getTelegramConfig, type TelegramTriggers } from "./app-settings";
import { escapeTelegram, sendTelegramMessage } from "./telegram";
import { captureException } from "./observability";

/**
 * Unified activity + security logger. Writes to the ActivityLog table and,
 * when the matching Telegram trigger is enabled, pushes an alert to the admin
 * chat. Best-effort: it never throws into the caller (a logging failure must
 * not break the request it is observing).
 */

export type TriggerCategory = keyof TelegramTriggers;

export interface LogInput {
  type: string;
  kind?: ActivityKind;
  severity?: ActivitySeverity;
  message?: string;
  userId?: string | null;
  actorEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  path?: string | null;
  method?: string | null;
  metadata?: Record<string, unknown> | null;
  /**
   * Telegram trigger category. Auto-derived from `type` for security events.
   * Pass a category explicitly to alert on product activity, or `null` to
   * persist the event without ever pinging Telegram.
   */
  notify?: TriggerCategory | null;
}

export type RequestMeta = {
  ip: string | null;
  userAgent: string | null;
  path: string | null;
  method: string | null;
};

/** Extract IP / UA / path / method from a fetch Request. */
export function requestMeta(req: Request): RequestMeta {
  const h = req.headers;
  const url = (() => {
    try {
      return new URL(req.url).pathname;
    } catch {
      return null;
    }
  })();
  return {
    ip: clientIp(h),
    userAgent: h.get("user-agent"),
    path: url,
    method: req.method,
  };
}

/** Extract request meta from a Headers object (server actions / RSC). */
export function headerMeta(h: Headers, path?: string): RequestMeta {
  return {
    ip: clientIp(h),
    userAgent: h.get("user-agent"),
    path: path ?? null,
    method: null,
  };
}

function clientIp(h: Headers): string | null {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? null;
}

function deriveCategory(type: string): TriggerCategory | null {
  if (type.startsWith("auth.signin.failed") || type.startsWith("auth.bruteforce")) {
    return "failedLogin";
  }
  if (type === "ratelimit.exceeded") return "rateLimit";
  if (type === "scan.suspicious") return "pathScan";
  return null;
}

const SEVERITY_EMOJI: Record<ActivitySeverity, string> = {
  INFO: "ℹ️",
  WARNING: "⚠️",
  CRITICAL: "🚨",
};

function formatMessage(input: Required<Pick<LogInput, "type">> & LogInput): string {
  const severity: ActivitySeverity = input.severity ?? "INFO";
  const lines: string[] = [];
  lines.push(`${SEVERITY_EMOJI[severity]} <b>${escapeTelegram(input.type)}</b>`);
  if (input.message) lines.push(escapeTelegram(input.message));
  const meta: Array<[string, string | null | undefined]> = [
    ["User", input.actorEmail ?? input.userId],
    ["IP", input.ip],
    ["Path", input.path ? `${input.method ?? ""} ${input.path}`.trim() : null],
    ["UA", input.userAgent?.slice(0, 80)],
  ];
  for (const [label, value] of meta) {
    if (value) lines.push(`<b>${label}:</b> <code>${escapeTelegram(String(value))}</code>`);
  }
  lines.push(`<i>${new Date().toISOString()}</i>`);
  return lines.join("\n");
}

/**
 * Persist an activity/security event and conditionally alert Telegram.
 * Always safe to call (and await) from a request handler.
 */
export async function logActivity(input: LogInput): Promise<void> {
  const kind: ActivityKind = input.kind ?? "ACTIVITY";
  const severity: ActivitySeverity = input.severity ?? "INFO";

  try {
    await prisma.activityLog.create({
      data: {
        kind,
        type: input.type,
        severity,
        message: input.message ?? null,
        userId: input.userId ?? null,
        actorEmail: input.actorEmail ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        path: input.path ?? null,
        method: input.method ?? null,
        metadata: (input.metadata ?? undefined) as object | undefined,
      },
    });
  } catch (err) {
    console.warn("[activity] failed to persist event:", err);
    captureException(err, { scope: "activity.persist", type: input.type });
  }

  const category =
    input.notify !== undefined ? input.notify : deriveCategory(input.type);
  if (!category) return;

  try {
    const config = await getTelegramConfig();
    if (!config.enabled || !config.triggers[category]) return;
    await sendTelegramMessage(formatMessage({ ...input, severity }));
  } catch (err) {
    console.warn("[activity] telegram alert failed:", err);
  }
}
