"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

/**
 * Inner link rendered inside a `<Link>`-wrapped database card on
 * `app/(dashboard)/databases/page.tsx`. We need `e.stopPropagation()` to
 * stop the click from bubbling up to the outer card link — and an event
 * handler can only live in a Client Component.
 */
export function JobLinkChip({ jobId, jobName }: { jobId: string; jobName: string }) {
  return (
    <Link
      href={`/apis/${jobId}`}
      className="inline-flex items-center gap-1 transition hover:text-ink"
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink className="h-3 w-3" />
      {jobName}
    </Link>
  );
}
