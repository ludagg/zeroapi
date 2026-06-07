/**
 * Client-safe error reporter. Has NO static Sentry import, so importing it
 * never pulls the SDK into the browser bundle. Sentry is dynamic-imported
 * only when NEXT_PUBLIC_SENTRY_DSN is configured.
 */
export function reportError(error: unknown): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  void import("@sentry/nextjs")
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => {});
}
