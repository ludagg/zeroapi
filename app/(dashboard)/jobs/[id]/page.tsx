import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, RefreshCw, Shield, ShieldCheck, Gauge } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { deriveEndpoints, EndpointsList } from "@/components/api-detail/endpoints-list";
import { ModelsList } from "@/components/api-detail/models-list";
import { AgentsProgress } from "@/components/api-detail/agents-progress";
import { ExportButton } from "@/components/api-detail/export-button";
import { JobTabs } from "@/components/api-detail/job-tabs";
import { JobStatusPoller } from "@/components/api-detail/job-status-poller";
import { CodeViewer } from "@/components/api-detail/code-viewer";
import { TestsPanel } from "@/components/api-detail/tests-panel";
import { LogsTimeline } from "@/components/api-detail/logs-timeline";
import { OpenApiEndpoints } from "@/components/api-detail/openapi-endpoints";
import { JobDeployPanel } from "@/components/api-detail/job-deploy-panel";
import {
  buildDeployConfigs,
  buildOpenApiSpec,
  buildSourceFiles,
  listEndpointsFromOpenApi,
} from "@/lib/api-detail";
import { extractVersion, readSpec } from "@/lib/job-helpers";
import { formatRelativeTime } from "@/lib/utils";
import type { DeployPlatform, JobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<JobStatus, { label: string; className: string }> = {
  PENDING: { label: "EN FILE", className: "border border-dashed border-line-2 text-muted" },
  RUNNING: { label: "EN COURS", className: "bg-warn-soft text-warn-ink" },
  READY: { label: "PRÊT", className: "bg-accent text-accent-ink" },
  DEPLOYED: { label: "EN LIGNE", className: "bg-accent text-accent-ink" },
  FAILED: { label: "ÉCHEC", className: "bg-danger-soft text-danger" },
};

const PLATFORM_TO_TARGET: Record<DeployPlatform, "railway" | "render" | "vercel" | "flyio" | null> = {
  RAILWAY: "railway",
  RENDER: "render",
  VERCEL: "vercel",
  FLYIO: "flyio",
  ZEROAPI_CLOUD: null,
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
  const isReady = job.status === "READY" || job.status === "DEPLOYED";
  const isCodeAvailable = isReady && spec !== null;
  const version = extractVersion(job);

  const sourceFiles = isCodeAvailable ? buildSourceFiles(spec) : [];
  const openApiEndpoints = spec ? listEndpointsFromOpenApi(buildOpenApiSpec(spec)) : [];
  const deployTargets = spec ? buildDeployConfigs(spec) : [];
  const endpointsList = spec ? deriveEndpoints(spec.resources) : [];

  const liveTargetId =
    job.deployment && job.deployment.status === "ONLINE"
      ? PLATFORM_TO_TARGET[job.deployment.platform]
      : null;

  const rateLimit = spec?.rateLimit;
  const authStrategy = spec?.auth?.strategy?.toUpperCase();
  const roles = spec?.roles?.map((r) => r.name) ?? [];

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
                  {version}
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
              <p className="mt-2 max-w-2xl text-[14.5px] text-muted">
                {job.description}
                {" · "}
                <span className="text-muted-2">
                  généré {formatRelativeTime(job.createdAt)}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3 text-[13px] font-medium text-ink-2 transition hover:-translate-y-px hover:border-line-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Régénérer
              </button>
              <ExportButton jobId={job.id} disabled={!isReady} />
              {isReady && (
                <Link
                  href={`/jobs/${job.id}/deploy`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-accent px-3.5 text-[13px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)]"
                >
                  Déployer une nouvelle version
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-x-7 gap-y-3 border-b border-line pb-5">
            <Meta label="Endpoints" value={job.endpoints ?? endpointsList.length ?? "—"} />
            <Meta
              label="Couverture"
              value={
                job.testsTotal && job.testsPassed
                  ? `${Math.round((job.testsPassed / job.testsTotal) * 100)} %`
                  : "—"
              }
            />
            <Meta label="Sécurité" value={job.securityScore ?? "—"} />
            <Meta label="Ressources" value={spec?.resources.length ?? "—"} />
            <Meta label="Auth" value={authStrategy ?? "—"} />
          </div>

          {job.status === "FAILED" && job.errorMessage && (
            <div className="mb-6 rounded-[12px] border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] text-danger">
              {job.errorMessage}
            </div>
          )}

          <JobTabs
            tabs={[
              { id: "overview", label: "Aperçu" },
              { id: "endpoints", label: "Endpoints", n: endpointsList.length },
              { id: "models", label: "Ressources", n: spec?.resources.length ?? 0 },
              { id: "code", label: "Code source" },
              { id: "tests", label: "Tests", n: job.testsTotal ?? undefined },
              { id: "docs", label: "Docs OpenAPI", n: openApiEndpoints.length || undefined },
              { id: "logs", label: "Logs", n: job.agentLogs.length || undefined },
              { id: "agents", label: "Agents", n: job.agentLogs.length || undefined },
              { id: "deploy", label: "Déploiement" },
            ]}
            panels={{
              overview: (
                <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
                  <div className="space-y-4">
                    <Card title="Modèles de données" count={spec?.resources.length}>
                      {spec ? (
                        <ModelsList resources={spec.resources} />
                      ) : (
                        <EmptyHint label="Spec indisponible." />
                      )}
                    </Card>
                    <Card title="Endpoints clés">
                      {endpointsList.length ? (
                        <EndpointsList resources={spec!.resources} />
                      ) : (
                        <EmptyHint label="Aucun endpoint dérivé." />
                      )}
                    </Card>
                  </div>
                  <div className="space-y-4">
                    <Card title="Sécurité">
                      <div className="space-y-3">
                        <SecRow
                          icon={<ShieldCheck className="h-3.5 w-3.5" />}
                          title="Authentification"
                          subtitle={
                            authStrategy
                              ? `${authStrategy}${roles.length ? ` · rôles : ${roles.join(", ")}` : ""}`
                              : "Aucune auth configurée"
                          }
                          enabled={Boolean(authStrategy)}
                        />
                        <SecRow
                          icon={<Shield className="h-3.5 w-3.5" />}
                          title="RBAC"
                          subtitle={
                            roles.length
                              ? `${roles.length} rôle${roles.length > 1 ? "s" : ""} · ${roles.join(", ")}`
                              : "Pas de rôles définis"
                          }
                          enabled={roles.length > 0}
                        />
                        <SecRow
                          icon={<Gauge className="h-3.5 w-3.5" />}
                          title="Rate limit"
                          subtitle={
                            rateLimit
                              ? `${rateLimit.max} req / ${Math.round(
                                  rateLimit.windowMs / 1000,
                                )}s · IP + user`
                              : "Désactivé"
                          }
                          enabled={Boolean(rateLimit)}
                        />
                      </div>
                    </Card>
                    <Card title="Tests">
                      <div className="grid grid-cols-3 gap-2">
                        <MiniStat
                          value={job.testsTotal !== null ? String(job.testsTotal) : "--"}
                          label="Tests"
                        />
                        <MiniStat
                          value={
                            job.testsTotal && job.testsPassed
                              ? `${Math.round((job.testsPassed / job.testsTotal) * 100)}%`
                              : "--"
                          }
                          label="Couverture"
                        />
                        <MiniStat value={job.securityScore ?? "--"} label="Sécurité" />
                      </div>
                    </Card>
                  </div>
                </section>
              ),
              endpoints: <EndpointsList resources={spec?.resources ?? []} />,
              models: <ModelsList resources={spec?.resources ?? []} />,
              code: isCodeAvailable ? (
                <div className="space-y-3">
                  <CodeViewer files={sourceFiles} />
                  <div className="flex justify-end">
                    <ExportButton jobId={job.id} />
                  </div>
                </div>
              ) : (
                <EmptyHint label="Code disponible après génération." />
              ),
              tests: (
                <TestsPanel
                  total={job.testsTotal}
                  passed={job.testsPassed}
                  durationMs={null}
                />
              ),
              docs: <OpenApiEndpoints endpoints={openApiEndpoints} />,
              logs: <LogsTimeline logs={job.agentLogs} />,
              agents: <AgentsProgress logs={job.agentLogs} />,
              deploy:
                deployTargets.length > 0 ? (
                  <JobDeployPanel
                    targets={deployTargets}
                    liveTargetId={liveTargetId}
                    liveVersion={liveTargetId ? version : null}
                  />
                ) : (
                  <EmptyHint label="Configuration disponible après génération." />
                ),
            }}
          />
        </div>
      </div>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      <span className="font-mono text-[13.5px] text-ink">{value}</span>
    </div>
  );
}

function Card({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold">
          {title}
          {count !== undefined && (
            <span className="rounded-full bg-bg-3 px-1.5 py-0.5 font-mono text-[10.5px] text-muted">
              {count}
            </span>
          )}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SecRow({
  icon,
  title,
  subtitle,
  enabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0 last:pb-0 first:pt-0">
      <span
        className={
          "grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] " +
          (enabled ? "bg-accent-soft text-accent-ink" : "bg-bg-2 text-muted")
        }
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium">{title}</div>
        <div className="text-[12px] text-muted">{subtitle}</div>
      </div>
      <span
        className={
          "rounded-full px-2 py-0.5 font-mono text-[10px] " +
          (enabled ? "bg-accent text-accent-ink" : "bg-bg-2 text-muted")
        }
      >
        {enabled ? "ACTIF" : "OFF"}
      </span>
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[10px] border border-line bg-bg p-3 text-center">
      <div className="font-serif text-[22px] leading-none">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
        {label}
      </div>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-line-2 bg-surface p-10 text-center text-[13px] text-muted">
      {label}
    </div>
  );
}
