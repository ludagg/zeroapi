"use client";

import { useEffect } from "react";

/**
 * Initializes the Sentry browser SDK at runtime, only when
 * NEXT_PUBLIC_SENTRY_DSN is set. The dynamic import keeps the SDK out of the
 * client bundle entirely when observability is not configured.
 */
export function SentryClientInit() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;
    let cancelled = false;
    void import("@sentry/nextjs")
      .then((Sentry) => {
        if (cancelled || Sentry.getClient?.()) return;
        Sentry.init({
          dsn,
          environment: process.env.NODE_ENV,
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0,
          replaysOnErrorSampleRate: 0,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
