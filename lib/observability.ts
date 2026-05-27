/**
 * Thin observability wrapper around Sentry.
 *
 * Sentry is optional — if `SENTRY_DSN` is not set we no-op silently so that
 * dev environments and CI don't need a DSN. All capture helpers swallow their
 * own errors: telemetry must never break the request that triggered it.
 *
 * Usage :
 *   import { captureException } from "@/lib/observability"
 *   try { … } catch (err) {
 *     captureException(err, { scope: "deploy-zeroapi", jobId })
 *     throw err
 *   }
 */

type SentryModule = typeof import("@sentry/nextjs");

let _sentry: SentryModule | null = null;
let _resolved = false;

function resolveSentry(): SentryModule | null {
  if (_resolved) return _sentry;
  _resolved = true;
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return null;
  }
  try {
    // Dynamic require keeps Sentry optional at build-time for users who don't
    // install @sentry/nextjs (it stays a transitive devDependency in CI).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _sentry = require("@sentry/nextjs") as SentryModule;
  } catch {
    _sentry = null;
  }
  return _sentry;
}

export type CaptureContext = {
  /** Logical area, e.g. "deploy-zeroapi", "llm-router". Becomes a Sentry tag. */
  scope?: string;
  /** Free-form structured data attached as `extra`. */
  extra?: Record<string, unknown>;
  /** User context — userId is the only one we ever ship to Sentry. */
  userId?: string;
  /** Tags for filtering in Sentry UI. */
  tags?: Record<string, string>;
};

export function captureException(error: unknown, ctx: CaptureContext = {}): void {
  const sentry = resolveSentry();
  if (!sentry) return;
  try {
    sentry.withScope((scope) => {
      if (ctx.scope) scope.setTag("area", ctx.scope);
      if (ctx.userId) scope.setUser({ id: ctx.userId });
      if (ctx.tags) {
        for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v);
      }
      if (ctx.extra) {
        for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v);
      }
      sentry.captureException(error);
    });
  } catch {
    // Telemetry must never throw.
  }
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  ctx: CaptureContext = {},
): void {
  const sentry = resolveSentry();
  if (!sentry) return;
  try {
    sentry.withScope((scope) => {
      scope.setLevel(level);
      if (ctx.scope) scope.setTag("area", ctx.scope);
      if (ctx.userId) scope.setUser({ id: ctx.userId });
      if (ctx.tags) {
        for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v);
      }
      if (ctx.extra) {
        for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v);
      }
      sentry.captureMessage(message);
    });
  } catch {
    // ignore
  }
}

/**
 * Wrap a promise so any rejection is captured before propagating. Use this when
 * you want telemetry but still want the caller to see the original error.
 */
export async function withCapture<T>(
  fn: () => Promise<T>,
  ctx: CaptureContext,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    captureException(err, ctx);
    throw err;
  }
}

/**
 * Fire-and-forget version: capture the error but don't propagate. Useful for
 * background side-effects (analytics writes, log persistence) where the main
 * flow must continue.
 */
export function captureSilently(error: unknown, ctx: CaptureContext = {}): void {
  captureException(error, ctx);
}
