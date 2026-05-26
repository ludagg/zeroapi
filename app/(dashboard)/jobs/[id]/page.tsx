import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, RefreshCw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { deriveEndpoints, EndpointsList } from "@/components/api-detail/endpoints-list";
import { ModelsList } from "@/components/api-detail/models-list";
import { AgentsProgress } from "@/components/api-detail/agents-progress";
import { DownloadButton } from "@/components/api-detail/download-button";
import { JobTabs } from "@/components/api-detail/job-tabs";
import { JobStatusPoller } from "@/components/api-detail/job-status-poller";
import { extractVersion, readSpec } from "@/lib/job-helpers";
import { formatRelativeTime } from "@/lib/utils";
import type { JobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<JobStatus, { label: string; className: string }> = {
  PENDING: { label: "EN FILE", className: "border border-dashed border-line-2 text-muted" },
  RUNNING: { label: "EN COURS", className: "bg-warn-soft text-warn-ink" },
  READY: { label: "PRÊT", className: "bg-accent text-accent-ink" },
  DEPLOYED: { label: "EN LIGNE", className: "bg-accent text-accent-ink" },
  FAILED: { label: "ÉCHEC", className: "bg-danger-soft text-danger" },
};

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const job = await prisma.job.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      deployment: true,
      agentLogs: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!job) notFound();

  const spec = readSpec(job.spec);
  const pill = STATUS_PILL[job.status];
  const testsPercent =
    job.testsTotal && job.testsPassed
      ? Math.round((job.testsPassed / job.testsTotal) * 100)
      : null;

  return (
    <>
      <JobStatusPoller status={job.status} />
      <DashboardHeader
        crumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Jobs", href: "/jobs" },
          { label: job.name },
        ]}
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-serif text-[30px] leading-[1.05] tracking-[-0.01em] sm:text-[42px] sm:leading-none break-words">
                  {job.name}
                </span>
                <span className="rounded-[5px] border border-line bg-bg-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">
                  {extractVersion(job)}
                </span>
                <span
                  className={
                    "ml-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] tracking-[0.04em] " +
                    pill.className
                  }
                >
                  {pill.label}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-[14.5px] text-muted">{job.description}</p>
            </div>

            <div className="flex gap-2">
              <button className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3 text-[13px] font-medium text-ink-2 transition hover:-translate-y-px hover:border-line-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Régénérer
              </button>
              {(job.status === "READY" || job.status === "DEPLOYED") && (
                <DownloadButton jobId={job.id} />
              )}
              {(job.status === "READY" || job.status === "DEPLOYED") && (
                <Link
                  href={`/jobs/${job.id}/deploy`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-accent px-3.5 text-[13px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)]"
                >
                  Déployer
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>

          <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Endpoints" value={job.endpoints ?? "—"} />
            <Stat
              label="Couverture tests"
              value={testsPercent !== null ? `${testsPercent}%` : "—"}
            />
            <Stat label="Score sécurité" value={job.securityScore ?? "—"} />
            <Stat
              label="Créé"
              value={formatRelativeTime(job.createdAt).replace("il y a ", "")}
            />
          </div>

          {job.status === "FAILED" && job.errorMessage && (
            <div className="mb-6 rounded-[12px] border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] text-danger">
              {job.errorMessage}
            </div>
          )}

          <JobTabs
            tabs={[
              { id: "overview", label: "Aperçu" },
              {
                id: "endpoints",
                label: "Endpoints",
                n: spec ? deriveEndpoints(spec.resources).length : (job.endpoints ?? 0),
              },
              { id: "models", label: "Ressources", n: spec?.resources.length ?? 0 },
              { id: "agents", label: "Agents", n: job.agentLogs.length },
            ]}
            panels={{
              overview: (
                <section className="space-y-5">
                  <div className="rounded-[14px] border border-line bg-surface p-5">
                    <h3 className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                      Authentification
                    </h3>
                    <p className="text-[14px] text-ink-2">
                      {spec?.auth?.strategy?.toUpperCase() ?? "—"}
                      {spec?.roles?.length ? ` · rôles : ${spec.roles.map((r) => r.name).join(", ")}` : ""}
                      {spec?.authFlows ? " · flux complets activés" : ""}
                    </p>
                  </div>
                  {spec?.rateLimit && (
                    <div className="rounded-[14px] border border-line bg-surface p-5">
                      <h3 className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                        Rate limit
                      </h3>
                      <p className="font-mono text-[13px] text-ink-2">
                        {spec.rateLimit.max} req / {Math.round(spec.rateLimit.windowMs / 1000)}s
                      </p>
                    </div>
                  )}
                </section>
              ),
              endpoints: <EndpointsList resources={spec?.resources ?? []} />,
              models: <ModelsList resources={spec?.resources ?? []} />,
              agents: <AgentsProgress logs={job.agentLogs} />,
            }}
          />
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[12px] border border-line bg-surface p-4">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">{label}</div>
      <div className="mt-2 font-serif text-[28px] leading-none tracking-[-0.01em]">{value}</div>
    </div>
  );
}
