import { BarChart3, Briefcase, DollarSign, Package } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { DashboardChatbox } from "@/components/dashboard/dashboard-chatbox";
import { IntroOnce } from "@/components/dashboard/intro-once";
import { JobsList, type DashboardJob } from "@/components/dashboard/jobs-list";
import { JobFilters } from "@/components/dashboard/job-filters";
import { ActivityPanel } from "@/components/dashboard/activity-panel";
import { DeploymentsPanel } from "@/components/dashboard/deployments-panel";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { extractAuthMode, extractVersion, pickEmoji } from "@/lib/job-helpers";
import type { JobStatus } from "@prisma/client";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

const VALID_STATUSES: Record<string, JobStatus | "all"> = {
  all: "all",
  running: "RUNNING",
  ready: "READY",
  failed: "FAILED",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const t = useTranslations("dashboard");
  const user = await requireUser();
  const filterParam = searchParams?.status?.toLowerCase() ?? "all";
  const statusFilter = VALID_STATUSES[filterParam] ?? "all";

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [
    jobs,
    jobsThisMonth,
    runningCount,
    readyCount,
    failedCount,
    deployedCount,
    deployments,
    activity,
  ] = await Promise.all([
    prisma.job.findMany({
      where: {
        userId: user.id,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.job.count({ where: { userId: user.id, createdAt: { gte: startOfMonth } } }),
    prisma.job.count({ where: { userId: user.id, status: "RUNNING" } }),
    prisma.job.count({ where: { userId: user.id, status: "READY" } }),
    prisma.job.count({ where: { userId: user.id, status: "FAILED" } }),
    prisma.deployment.count({ where: { userId: user.id, status: "ONLINE" } }),
    prisma.deployment.findMany({
      where: { userId: user.id, status: "ONLINE" },
      include: { job: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.job.findMany({
      where: { userId: user.id, status: { in: ["READY", "DEPLOYED", "FAILED"] } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        status: true,
        endpoints: true,
        testsTotal: true,
        testsPassed: true,
        updatedAt: true,
      },
    }),
  ]);

  const totalJobs = await prisma.job.count({ where: { userId: user.id } });

  const mapped: DashboardJob[] = jobs.map((j) => ({
    id: j.id,
    name: j.name,
    description: j.description,
    status: j.status,
    endpoints: j.endpoints,
    testsTotal: j.testsTotal,
    testsPassed: j.testsPassed,
    securityScore: j.securityScore,
    errorMessage: j.errorMessage,
    estimatedTime: j.estimatedTime,
    emoji: pickEmoji(`${j.name} ${j.description}`),
    version: extractVersion(j),
    authMode: extractAuthMode(j.spec),
    createdAt: j.createdAt,
    startedAt: j.startedAt,
    completedAt: j.completedAt,
  }));

  return (
    <>
      <DashboardHeader
        crumbs={[
          { label: user.name ?? t("header.workspace"), href: "/dashboard" },
          { label: t("nav.overview") },
        ]}
        unread={runningCount}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <IntroOnce className="px-4 py-6 sm:px-6 sm:py-7 lg:px-7">
          <div className="mb-7 flex flex-col items-center">
            <span className="zi-eyebrow mb-2 font-mono text-[12px] uppercase tracking-[0.18em] text-muted">
              {greetingFor(new Date(), t)}
            </span>
            <div className="relative flex justify-center">
              <div
                aria-hidden
                className="zi-halo pointer-events-none absolute left-1/2 top-1/2 h-[150px] w-[460px] max-w-[90%] -translate-x-1/2 -translate-y-1/2 blur-2xl"
                style={{
                  background: "radial-gradient(ellipse at center, var(--accent-glow), transparent 70%)",
                }}
              />
              <svg
                aria-hidden
                viewBox="0 0 32 32"
                className="zi-ring"
              >
                <circle
                  className="zi-ring-circle"
                  cx="16"
                  cy="16"
                  r="9.2"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform="rotate(-90 16 16)"
                  style={{ stroke: "var(--ink)" }}
                />
                <circle
                  className="zi-ring-node"
                  cx="22.5"
                  cy="9.5"
                  r="3.6"
                  strokeWidth="1.4"
                  style={{ fill: "var(--accent)", stroke: "var(--ink)" }}
                />
              </svg>
              <div className="relative">
                <h1
                  className="zi-reveal relative text-center font-serif text-[clamp(28px,4.4vw,46px)] leading-[1.05] tracking-[-0.01em]"
                  style={{ "--d": "0.75s" } as React.CSSProperties}
                >
                  {t("home.headline")}
                </h1>
                <span aria-hidden className="zi-bar" />
              </div>
            </div>
          </div>

          <DashboardChatbox />

          <StatsCards
            stats={[
              {
                label: t("home.stats.jobsMonth"),
                value: jobsThisMonth,
                hint: t("home.stats.jobsMonthHint", {
                  remaining: Math.max(0, user.generationsLimit - user.generationsUsed),
                  plan: user.plan,
                }),
                icon: <Briefcase />,
                spark: "rise",
              },
              {
                label: t("home.stats.deployedApis"),
                value: deployedCount,
                hint: deployments.length
                  ? deployments.map((d) => d.platform).join(" · ").toLowerCase()
                  : t("home.stats.noActiveDeployment"),
                icon: <Package />,
                spark: "step",
              },
              {
                label: t("home.stats.requests24h"),
                value: "--",
                hint: t("home.stats.requests24hHint"),
                icon: <BarChart3 />,
                spark: "wave",
                tooltip: t("home.stats.requests24hTooltip"),
              },
              {
                label: t("home.stats.costMonth"),
                value: costForPlan(user.plan),
                hint: t(`home.planHint.${user.plan.toLowerCase()}` as "home.planHint.free"),
                icon: <DollarSign />,
                spark: "flat",
                tooltip: t("home.stats.planTooltip", { plan: user.plan }),
              },
            ]}
          />

          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.01em]">
              {t("home.recentJobs")}
              <span className="rounded-full bg-bg-3 px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted">
                {totalJobs}
              </span>
            </h2>
            <JobFilters
              filters={[
                { id: "all", label: t("home.filters.all"), n: totalJobs },
                { id: "running", label: t("home.filters.running"), n: runningCount },
                { id: "ready", label: t("home.filters.ready"), n: readyCount },
                { id: "failed", label: t("home.filters.failed"), n: failedCount },
              ]}
            />
          </div>

          <JobsList jobs={mapped} />

          <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
            <ActivityPanel items={activity} />
            <DeploymentsPanel deployments={deployments} />
          </div>
        </IntroOnce>
      </div>
    </>
  );
}

function greetingFor(d: Date, t: ReturnType<typeof useTranslations<"dashboard">>): string {
  const h = d.getHours();
  if (h < 6) return t("home.greeting.night");
  if (h < 12) return t("home.greeting.morning");
  if (h < 18) return t("home.greeting.afternoon");
  return t("home.greeting.evening");
}

function costForPlan(plan: "FREE" | "STARTER" | "PRO" | "BUSINESS"): string {
  switch (plan) {
    case "FREE":
      return "0 €";
    case "STARTER":
      return "19 €";
    case "PRO":
      return "49 €";
    case "BUSINESS":
      return "199 €";
  }
}

