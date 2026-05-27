import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    // Server-side we never need session replay; keep payload light.
    profilesSampleRate: 0,
    // Don't leak request bodies — they often contain user prompts and PII.
    sendDefaultPii: false,
    ignoreErrors: [
      // Common noise from aborted streaming connections (NDJSON cancel, etc.)
      "AbortError",
      "ResponseAborted",
    ],
  });
}
