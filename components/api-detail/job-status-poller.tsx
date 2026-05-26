"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { JobStatus } from "@prisma/client";

const POLL_INTERVAL_MS = 3_000;

/**
 * Refresh the parent Server Component every 3 s while a job is in flight
 * (PENDING or RUNNING). Stops once the worker has marked the job READY,
 * DEPLOYED, or FAILED. Renders nothing.
 *
 * `router.refresh()` re-runs the RSC payload without losing client state,
 * which means status pills, agent logs, and stats update inline.
 */
export function JobStatusPoller({ status }: { status: JobStatus }) {
  const router = useRouter();
  const inFlight = status === "PENDING" || status === "RUNNING";

  useEffect(() => {
    if (!inFlight) return;
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [inFlight, router]);

  return null;
}
