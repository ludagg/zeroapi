"use client";

import { CheckCheck, MoreHorizontal, Network, Shield, AlertTriangle } from "lucide-react";
import type { JobStatus } from "@prisma/client";
import { formatRelativeTime } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Table, TableRow, TableSkeleton } from "@/components/ui/table";

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

const ROW_COLS =
  "grid-cols-[36px_minmax(0,1fr)_auto] sm:grid-cols-[36px_minmax(0,1fr)_200px_120px_120px_36px]";

export function JobsList({ jobs }: { jobs: DashboardJob[] }) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        title={
          <>
            Aucun job <em>pour l&apos;instant</em>.
          </>
        }
        description="Crée ta première API en 30 secondes."
        action={
          <Button href="/generate" variant="accent">
            Démarrer
          </Button>
        }
      />
    );
  }

  return (
    <Table>
      {jobs.map((job, i) => (
        <TableRow key={job.id} href={`/jobs/${job.id}`} index={i} cols={ROW_COLS}>
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

          <StatusPill status={job.status} className="self-center justify-self-start" />

          <button
            aria-label="Options"
            className="hidden h-7 w-7 place-items-center rounded-[7px] text-muted opacity-0 transition group-hover:opacity-100 hover:bg-bg-2 hover:text-ink sm:grid"
            onClick={(e) => e.preventDefault()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </TableRow>
      ))}
    </Table>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function JobsListSkeleton() {
  return <TableSkeleton rows={3} />;
}
