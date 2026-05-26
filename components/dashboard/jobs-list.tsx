"use client";

import Link from "next/link";
import { Activity, CheckCheck, MoreHorizontal, Network, Shield, AlertTriangle } from "lucide-react";
import type { JobStatus } from "@prisma/client";
import { formatRelativeTime } from "@/lib/utils";

export type DashboardJob = {
  id: string;
  name: string;
  description: string;
  status: JobStatus;
  endpoints: number | null;
  testsTotal: number | null;
  testsPassed: number | null;
  securityScore: string | null;
  errorMessage: string | null;
  estimatedTime: number | null;
  emoji: string;
  version: string;
  authMode: string | null;
  createdAt: Date;
  completedAt: Date | null;
  startedAt: Date | null;
};

const STATUS_CLASS: Record<JobStatus, string> = {
  PENDING: "text-muted border border-dashed border-line-2",
  RUNNING: "bg-warn-soft text-warn-ink",
  READY: "bg-accent text-accent-ink",
  DEPLOYED: "bg-accent text-accent-ink",
  FAILED: "bg-danger-soft text-danger",
};

const STATUS_LABEL: Record<JobStatus, string> = {
  PENDING: "EN FILE",
  RUNNING: "EN COURS",
  READY: "PRÊT",
  DEPLOYED: "EN LIGNE",
  FAILED: "ÉCHEC",
};

function Dot({ status }: { status: JobStatus }) {
  if (status === "RUNNING") {
    return (
      <span className="inline-block h-1.5 w-1.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
    );
  }
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />;
}

export function JobsList({ jobs }: { jobs: DashboardJob[] }) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-2 bg-surface px-6 py-12 text-center">
        <p className="font-serif text-[28px] leading-tight">
          Aucun job <em className="italic">pour l&apos;instant</em>.
        </p>
        <p className="mt-2 text-muted">Crée ta première API en 30 secondes.</p>
        <Link href="/generate" className="btn-primary-accent mt-5 inline-flex">
          Démarrer
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      {jobs.map((job, i) => (
        <Link
          key={job.id}
          href={`/jobs/${job.id}`}
          className="group grid cursor-pointer items-center gap-4 px-4 py-3.5 transition hover:bg-bg sm:grid-cols-[36px_minmax(0,1fr)_200px_120px_120px_36px]"
          style={i > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
        >
          <div className="grid h-9 w-9 place-items-center rounded-[9px] border border-line bg-bg-2 font-mono text-[14px]">
            {job.emoji}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[14.5px] font-semibold">{job.name}</span>
              <span className="rounded-[4px] border border-line px-1.5 py-px font-mono text-[10.5px] text-muted">
                {job.version}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[12.5px] text-muted">{job.description}</div>
            {job.status === "RUNNING" && (
              <div className="relative mt-2 h-[3px] overflow-hidden rounded-[3px] bg-line">
                <div className="absolute left-0 top-0 h-full w-[30%] animate-indet rounded-[3px] bg-accent" />
              </div>
            )}
          </div>

          <div className="hidden items-center gap-3.5 font-mono text-[11.5px] text-muted sm:flex">
            {job.endpoints != null && (
              <span className="inline-flex items-center gap-1">
                <Network className="h-3 w-3" />
                {job.endpoints} endpoints
              </span>
            )}
            {job.testsTotal != null && job.testsPassed != null && (
              <span className="inline-flex items-center gap-1">
                <CheckCheck className="h-3 w-3" />
                {Math.round((job.testsPassed / Math.max(1, job.testsTotal)) * 100)}% couv.
              </span>
            )}
            {job.authMode && (
              <span className="inline-flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {job.authMode}
              </span>
            )}
            {job.status === "FAILED" && job.errorMessage && (
              <span className="inline-flex items-center gap-1 text-danger">
                <AlertTriangle className="h-3 w-3" />
                {truncate(job.errorMessage, 28)}
              </span>
            )}
          </div>

          <div className="hidden font-mono text-[12px] text-muted sm:block">
            {job.status === "RUNNING"
              ? `en cours · ~ ${job.estimatedTime ? Math.ceil(job.estimatedTime / 60) : 2} min`
              : job.status === "DEPLOYED"
                ? `déployé · ${formatRelativeTime(job.completedAt ?? job.createdAt).replace("il y a ", "")}`
                : job.status === "READY"
                  ? `prêt · ${formatRelativeTime(job.completedAt ?? job.createdAt).replace("il y a ", "")}`
                  : job.status === "FAILED"
                    ? `échec · ${formatRelativeTime(job.completedAt ?? job.createdAt).replace("il y a ", "")}`
                    : "en file"}
          </div>

          <span
            className={
              "inline-flex items-center gap-1.5 self-center justify-self-start rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium tracking-[0.04em] " +
              STATUS_CLASS[job.status]
            }
          >
            <Dot status={job.status} />
            {STATUS_LABEL[job.status]}
          </span>

          <button
            aria-label="Options"
            className="hidden h-7 w-7 place-items-center rounded-[7px] text-muted opacity-0 transition group-hover:opacity-100 hover:bg-bg-2 hover:text-ink sm:grid"
            onClick={(e) => e.preventDefault()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </Link>
      ))}
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function JobsListSkeleton() {
  return (
    <div className="rounded-[14px] border border-line bg-surface">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-4 px-4 py-3.5"
          style={i > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
        >
          <div className="h-9 w-9 rounded-[9px] bg-bg-2" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-bg-2" />
            <div className="h-2.5 w-2/3 rounded bg-bg-2" />
          </div>
          <div className="h-5 w-16 rounded-full bg-bg-2" />
        </div>
      ))}
    </div>
  );
}

export { Activity };
