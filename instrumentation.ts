/**
 * Next.js 14 instrumentation entry-point — called once per server process
 * when the app boots. We use it to lazy-load the runtime-specific Sentry
 * config so that the client bundle stays free of Node-only modules.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
