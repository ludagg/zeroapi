/**
 * Shared types/helpers for the ZeroAPI Cloud deployment journal.
 *
 * Kept free of any server-only imports (no `process.env`, no Prisma) so it
 * can be imported from both the deploy route and the client deploy panel.
 * The journal is persisted as JSON on `Deployment.logs`.
 */

export type DeploymentLogLevel = "info" | "error";

export interface DeploymentLogEntry {
  /** Unix epoch (ms). */
  ts: number;
  level: DeploymentLogLevel;
  message: string;
}

/** Coerces an unknown JSON value (Prisma `Json`) into a clean log array. */
export function parseDeploymentLogs(raw: unknown): DeploymentLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: DeploymentLogEntry[] = [];
  for (const e of raw) {
    if (e && typeof e === "object") {
      const entry = e as Record<string, unknown>;
      if (typeof entry.message === "string" && typeof entry.ts === "number") {
        out.push({
          ts: entry.ts,
          level: entry.level === "error" ? "error" : "info",
          message: entry.message,
        });
      }
    }
  }
  return out;
}

/** Returns a new array with one log line appended (immutable). */
export function appendLog(
  logs: DeploymentLogEntry[],
  message: string,
  level: DeploymentLogLevel = "info",
): DeploymentLogEntry[] {
  return [...logs, { ts: Date.now(), level, message }];
}
