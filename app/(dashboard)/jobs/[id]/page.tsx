import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Shield, ShieldCheck, Gauge } from "lucide-react";
import { generateTests } from "@ludagg/zeroapi-runtime";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { deriveEndpoints, EndpointsList } from "@/components/api-detail/endpoints-list";
import { ModelsList } from "@/components/api-detail/models-list";
import { AgentsProgress } from "@/components/api-detail/agents-progress";
import { ExportButton } from "@/components/api-detail/export-button";
import { RegenerateButton } from "@/components/api-detail/regenerate-button";
import { StartGenerationButton } from "@/components/api-detail/start-generation-button";
import { JobTabs } from "@/components/api-detail/job-tabs";
import { JobStatusPoller } from "@/components/api-detail/job-status-poller";
import { CodeViewer } from "@/components/api-detail/code-viewer";
import { TestsPanel } from "@/components/api-detail/tests-panel";
import { LogsTimeline } from "@/components/api-detail/logs-timeline";
import { OpenApiEndpoints } from "@/components/api-detail/openapi-endpoints";
import { JobDeployPanel } from "@/components/api-detail/job-deploy-panel";
import { DatabasePanel } from "@/components/api-detail/database-panel";
import { VariablesPanel } from "@/components/api-detail/variables-panel";
import {
  buildDeployConfigs,
  buildOpenApiSpec,
  buildSourceFiles,
  listEndpointsFromOpenApi,
} from "@/lib/api-detail";
import { extractVersion, readSpec, extractAuthMode } from "@/lib/job-helpers";
import { formatRelativeTime } from "@/lib/utils";
import { computeSecurity, GRADE_TONE, type SecurityGrade } from "@/lib/security-grade";
import { coolifyConfigured } from "@/lib/coolify";
import type { DeployPlatform, DeploymentStatus, JobStatus } from "@prisma/client";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

const STATUS_PILL_CLASS: Record<JobStatus, string> = {
  DRAFT: "border border-dashed border-line-2 text-muted-2",
  PENDING: "border border-dashed border-line-2 text-muted",
  RUNNING: "bg-warn-soft text-warn-ink",
  READY: "bg-accent text-accent-ink",
  DEPLOYED: "bg-accent text-accent-ink",
  FAILED: "bg-danger-soft text-danger",
};

const PLATFORM_TO_TARGET: Record<DeployPlatform, "railway" | "render" | "vercel" | "flyio" | null> = {
  RAILWAY: "railway",
  RENDER: "render",
  VERCEL: "vercel",
  FLYIO: "flyio",
  ZEROAPI_CLOUD: null,
};

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { tab?: string };
}) {
  const t = await getTranslations("dashboard");
  const user = await requireUser();
  const job = await prisma.job.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      deployment: true,
      database: true,
      agentLogs: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!job) notFound();
  const planUnlocksCloud = user.plan === "PRO" || user.plan === "BUSINESS";
  const isZeroApiCloud = job.deployment?.platform === "ZEROAPI_CLOUD";
  const zeroApiCloudStatus: DeploymentStatus | null = isZeroApiCloud
    ? job.deployment!.status
    : null;
  const zeroApiCloudUrl = isZeroApiCloud ? job.deployment!.url : null;
  const zeroApiCloudLogs = isZeroApiCloud ? job.deployment!.logs : undefined;

  const spec = readSpec(job.spec);
  const pillClass = STATUS_PILL_CLASS[job.status];
  const isReady = job.status === "READY" || job.status === "DEPLOYED";
  const isCodeAvailable = isReady && spec !== null;
  const version = extractVersion(job);

  const sourceFiles = isCodeAvailable ? buildSourceFiles(spec) : [];
  const openApiEndpoints = spec ? listEndpointsFromOpenApi(buildOpenApiSpec(spec)) : [];
  const deployTargets = spec ? buildDeployConfigs(spec) : [];
  const endpointsList = spec ? deriveEndpoints(spec.resources) : [];
  const testSuite = isCodeAvailable ? generateTests(spec) : null;

  const liveTargetId =
    job.deployment && job.deployment.status === "ONLINE"
      ? PLATFORM_TO_TARGET[job.deployment.platform]
      : null;

  const rateLimit = spec?.rateLimit;
  const authStrategy = extractAuthMode(job.spec) ?? undefined;
  const roles = spec?.roles?.map((r) => r.name) ?? [];
  const security = spec ? computeSecurity(spec) : null;
  const securityGrade: SecurityGrade | null =
    (job.securityScore as SecurityGrade | null) ?? security?.grade ?? null;

  return (
    <>
      <JobStatusPoller status={job.status} />
      <DashboardHeader
        crumbs={[
          { label: t("header.workspace"), href: "/dashboard" },
          { label: t("nav.jobs"), href: "/jobs" },
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
                    pillClass
                  }
                >
                  {t(`apis.status.${job.status.toLowerCase()}` as "apis.status.draft")}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-[14.5px] text-muted">
                {job.description}
                {" · "}
                <span className="text-muted-2">
                  {t("apis.generated", { time: formatRelativeTime(job.createdAt) })}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {job.status === "DRAFT" ? (
                <StartGenerationButton jobId={job.id} />
              ) : (
                <>
                  <RegenerateButton jobId={job.id} disabled={!spec} />
                  <ExportButton jobId={job.id} disabled={!isReady} />
                  {isReady && (
                    <Link
                      href={`/jobs/${job.id}/deploy`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-accent px-3.5 text-[13px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)]"
                    >
                      {t("apis.deployNewVersion")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-x-7 gap-y-3 border-b border-line pb-5">
            <Meta label={t("apis.meta.endpoints")} value={job.endpoints ?? endpointsList.length ?? "—"} />
            <Meta
              label={t("apis.meta.coverage")}
              value={
                job.testsTotal && job.testsPassed
                  ? `${Math.round((job.testsPassed / job.testsTotal) * 100)} %`
                  : "—"
              }
            />
            <Meta label={t("apis.meta.security")} value={job.securityScore ?? "—"} />
            <Meta label={t("apis.meta.resources")} value={spec?.resources.length ?? "—"} />
            <Meta label={t("apis.meta.auth")} value={authStrategy ?? "—"} />
          </div>

          {job.status === "DRAFT" && (
            <div className="mb-6 rounded-[12px] border border-dashed border-line-2 bg-bg-2 px-4 py-3 text-[13px] text-muted">
              {t("apis.draftNotice")}
            </div>
          )}

          {job.status === "FAILED" && job.errorMessage && (
            <div className="mb-6 rounded-[12px] border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] text-danger">
              {job.errorMessage}
            </div>
          )}

          <JobTabs
            defaultTab={searchParams?.tab}
            tabs={[
              { id: "overview", label: t("apis.tabs.overview") },
              { id: "endpoints", label: t("apis.tabs.endpoints"), n: endpointsList.length },
              { id: "models", label: t("apis.tabs.models"), n: spec?.resources.length ?? 0 },
              { id: "database", label: t("apis.tabs.database") },
              { id: "code", label: t("apis.tabs.code") },
              { id: "tests", label: t("apis.tabs.tests"), n: job.testsTotal ?? undefined },
              { id: "docs", label: t("apis.tabs.docs"), n: openApiEndpoints.length || undefined },
              { id: "logs", label: t("apis.tabs.logs"), n: job.agentLogs.length || undefined },
              { id: "agents", label: t("apis.tabs.agents"), n: job.agentLogs.length || undefined },
              { id: "variables", label: t("apis.tabs.variables") },
              { id: "deploy", label: t("apis.tabs.deploy") },
            ]}
            panels={{
              overview: (
                <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
                  <div className="space-y-4">
                    <Card title={t("apis.overview.dataModels")} count={spec?.resources.length}>
                      {spec ? (
                        <ModelsList resources={spec.resources} />
                      ) : (
                        <EmptyHint label={t("apis.overview.emptySpec")} />
                      )}
                    </Card>
                    <Card title={t("apis.overview.keyEndpoints")}>
                      {endpointsList.length ? (
                        <EndpointsList resources={spec!.resources} />
                      ) : (
                        <EmptyHint label={t("apis.overview.noEndpoints")} />
                      )}
                    </Card>
                  </div>
                  <div className="space-y-4">
                    <Card title={t("apis.overview.security")}>
                      {securityGrade && (
                        <div className="mb-3 flex items-center justify-between rounded-[10px] border border-line bg-bg p-3">
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                              {t("apis.overview.securityScore")}
                            </div>
                            <div className="mt-0.5 text-[12.5px] text-muted">
                              {security
                                ? `${security.score}/100 · ${security.hasAuth ? "auth" : "no-auth"}`
                                : t("apis.overview.securityAutoCalc")}
                            </div>
                          </div>
                          <span
                            className={
                              "grid h-10 w-10 place-items-center rounded-[10px] font-serif text-[20px] " +
                              GRADE_TONE[securityGrade]
                            }
                          >
                            {securityGrade}
                          </span>
                        </div>
                      )}
                      <div className="space-y-3">
                        <SecRow
                          icon={<ShieldCheck className="h-3.5 w-3.5" />}
                          title={t("apis.overview.authSection")}
                          subtitle={
                            authStrategy
                              ? `${authStrategy}${roles.length ? ` · ${roles.join(", ")}` : ""}`
                              : t("apis.overview.noAuth")
                          }
                          enabled={Boolean(authStrategy)}
                          activeLabel={t("apis.overview.active")}
                          offLabel={t("apis.overview.off")}
                        />
                        <SecRow
                          icon={<Shield className="h-3.5 w-3.5" />}
                          title={t("apis.overview.rbacSection")}
                          subtitle={
                            roles.length
                              ? roles.length > 1
                                ? t("apis.overview.rbacRolesPlural", { count: roles.length, list: roles.join(", ") })
                                : t("apis.overview.rbacRoles", { count: roles.length, list: roles.join(", ") })
                              : t("apis.overview.noRoles")
                          }
                          enabled={roles.length > 0}
                          activeLabel={t("apis.overview.active")}
                          offLabel={t("apis.overview.off")}
                        />
                        <SecRow
                          icon={<Gauge className="h-3.5 w-3.5" />}
                          title="Rate limit"
                          subtitle={
                            rateLimit
                              ? `${rateLimit.max} req / ${Math.round(
                                  rateLimit.windowMs / 1000,
                                )}s · IP + user`
                              : t("apis.overview.rateDisabled")
                          }
                          enabled={Boolean(rateLimit)}
                          activeLabel={t("apis.overview.active")}
                          offLabel={t("apis.overview.off")}
                        />
                      </div>
                    </Card>
                    <Card title={t("apis.overview.tests")}>
                      <div className="grid grid-cols-3 gap-2">
                        <MiniStat
                          value={job.testsTotal !== null ? String(job.testsTotal) : "--"}
                          label={t("apis.tabs.tests")}
                        />
                        <MiniStat
                          value={
                            job.testsTotal && job.testsPassed
                              ? `${Math.round((job.testsPassed / job.testsTotal) * 100)}%`
                              : "--"
                          }
                          label={t("apis.overview.coverage")}
                        />
                        <MiniStat value={job.securityScore ?? "--"} label={t("apis.overview.security")} />
                      </div>
                    </Card>
                  </div>
                </section>
              ),
              endpoints: <EndpointsList resources={spec?.resources ?? []} />,
              models: <ModelsList resources={spec?.resources ?? []} />,
              database: job.database ? (
                <DatabasePanel
                  db={{
                    id: job.database.id,
                    name: job.database.name,
                    provider: job.database.provider,
                    sizeBytes: job.database.sizeBytes,
                    tables: job.database.tables,
                    status: job.database.status,
                    managed: job.database.managed,
                    jobId: job.id,
                    updatedAt: job.database.updatedAt,
                  }}
                  spec={spec}
                  plan={user.plan}
                />
              ) : (
                <EmptyHint label={t("apis.overview.dbAutoCreated")} />
              ),
              code: isCodeAvailable ? (
                <div className="space-y-3">
                  <CodeViewer files={sourceFiles} />
                  <div className="flex justify-end">
                    <ExportButton jobId={job.id} />
                  </div>
                </div>
              ) : (
                <EmptyHint label={t("apis.overview.codeAfterGen")} />
              ),
              tests: (
                <TestsPanel
                  total={job.testsTotal}
                  passed={job.testsPassed}
                  durationMs={null}
                  testSuite={testSuite}
                />
              ),
              docs: <OpenApiEndpoints endpoints={openApiEndpoints} />,
              logs: <LogsTimeline logs={job.agentLogs} />,
              agents: <AgentsProgress logs={job.agentLogs} />,
              variables: <VariablesPanel jobId={job.id} />,
              deploy:
                deployTargets.length > 0 ? (
                  <JobDeployPanel
                    jobId={job.id}
                    targets={deployTargets}
                    liveTargetId={liveTargetId}
                    liveVersion={liveTargetId ? version : null}
                    zeroApiCloud={{
                      enabled: coolifyConfigured(),
                      unlocked: planUnlocksCloud,
                      liveUrl: zeroApiCloudUrl,
                      status: zeroApiCloudStatus,
                      logs: zeroApiCloudLogs,
                    }}
                  />
                ) : (
                  <EmptyHint label={t("apis.overview.configAfterGen")} />
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
  activeLabel,
  offLabel,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  enabled: boolean;
  activeLabel: string;
  offLabel: string;
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
        {enabled ? activeLabel : offLabel}
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
