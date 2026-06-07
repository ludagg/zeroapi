import * as Sentry from "@sentry/nextjs";

/**
 * Server-side error reporting. Safe to call unconditionally: when Sentry is
 * not initialized (no SENTRY_DSN), captureException is a no-op. Never throws.
 *
 * Client components must use lib/report-error (which dynamic-imports Sentry)
 * to avoid bundling the SDK into the browser when it is unused.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // reporting must never break the request it observes
  }
}
