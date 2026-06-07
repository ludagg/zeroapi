/**
 * Next.js instrumentation hook. Initializes Sentry on the server and edge
 * runtimes, but only when SENTRY_DSN is configured (otherwise a no-op, so the
 * app runs identically without observability credentials).
 */
export async function register(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
  });
}
