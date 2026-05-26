import { BarChart3, Briefcase, DollarSign, Package } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { GenerateStrip } from "@/components/dashboard/generate-strip";
import { JobsList, type DashboardJob } from "@/components/dashboard/jobs-list";
import { JobFilters } from "@/components/dashboard/job-filters";
import { ActivityPanel } from "@/components/dashboard/activity-panel";
import { DeploymentsPanel } from "@/components/dashboard/deployments-panel";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { extractAuthMode, extractVersion, pickEmoji } from "@/lib/job-helpers";
import type { JobStatus } from "@prisma/client";

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

  const greeting = greetingFor(new Date());
  const firstName = (user.name ?? user.email).split(/\s+/)[0];

  return (
    <>
      <DashboardHeader
        crumbs={[
          { label: user.name ?? "Workspace", href: "/dashboard" },
          { label: "Vue d'ensemble" },
        ]}
        unread={runningCount}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-7">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="font-serif text-[clamp(36px,4.6vw,50px)] leading-[1.05] tracking-[-0.01em]">
                {greeting} <em className="italic">{firstName}</em>.
              </h1>
              <div className="mt-1.5 flex items-center gap-2.5 text-[14.5px] text-muted">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-accent"
                  style={{ boxShadow: "0 0 0 4px var(--accent-glow)" }}
                />
                {runningCount > 0 ? (
                  <span>
                    <b className="font-medium text-ink">
                      {runningCount} job{runningCount > 1 ? "s" : ""}
                    </b>{" "}
                    en cours · on te prévient quand c&apos;est prêt
                  </span>
                ) : (
                  <span>Aucun job en cours · prêt à démarrer</span>
                )}
              </div>
            </div>
          </div>

          <StatsCards
            stats={[
              {
                label: "Jobs ce mois",
                value: jobsThisMonth,
                hint: `${Math.max(0, user.generationsLimit - user.generationsUsed)} restants sur ton plan ${user.plan}`,
                icon: <Briefcase />,
                spark: "rise",
              },
              {
                label: "APIs déployées",
                value: deployedCount,
                hint: deployments.length
                  ? deployments.map((d) => d.platform).join(" · ").toLowerCase()
                  : "aucun déploiement actif",
                icon: <Package />,
                spark: "step",
              },
              {
                label: "Requêtes / 24 h",
                value: "—",
                hint: "métriques live arrivent au sprint 2",
                icon: <BarChart3 />,
                spark: "wave",
              },
              {
                label: "Coût ce mois",
                value: "—",
                hint: "FCFA · facturation arrive bientôt",
                icon: <DollarSign />,
                spark: "flat",
              },
            ]}
          />

          <GenerateStrip />

          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.01em]">
              Jobs récents
              <span className="rounded-full bg-bg-3 px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted">
                {totalJobs}
              </span>
            </h2>
            <JobFilters
              filters={[
                { id: "all", label: "Tous", n: totalJobs },
                { id: "running", label: "En cours", n: runningCount },
                { id: "ready", label: "Prêts", n: readyCount },
                { id: "failed", label: "Échoués", n: failedCount },
              ]}
            />
          </div>

          <JobsList jobs={mapped} />

          <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
            <ActivityPanel items={activity} />
            <DeploymentsPanel deployments={deployments} />
          </div>
        </div>
      </div>
    </>
  );
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 6) return "Bonne nuit,";
  if (h < 12) return "Bonjour,";
  if (h < 18) return "Bon après-midi,";
  return "Bonsoir,";
}
