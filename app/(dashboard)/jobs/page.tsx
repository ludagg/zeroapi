import type { JobStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { JobsList, type DashboardJob } from "@/components/dashboard/jobs-list";
import { JobsSearch } from "@/components/dashboard/jobs-search";
import { JobsPagination } from "@/components/dashboard/jobs-pagination";
import { JobFilters } from "@/components/dashboard/job-filters";
import { extractAuthMode, extractVersion, pickEmoji } from "@/lib/job-helpers";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const STATUS_GROUPS: Record<string, JobStatus[]> = {
  all: [],
  running: ["PENDING", "RUNNING"],
  ready: ["READY", "DEPLOYED"],
  failed: ["FAILED"],
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const user = await requireUser();
  const q = (searchParams.q ?? "").trim();
  const statusKey = searchParams.status ?? "all";
  const statuses = STATUS_GROUPS[statusKey] ?? [];
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);

  const where: Prisma.JobWhereInput = {
    userId: user.id,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(statuses.length ? { status: { in: statuses } } : {}),
  };

  const [counts, total, jobs] = await Promise.all([
    prisma.job.groupBy({
      by: ["status"],
      where: { userId: user.id, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
      _count: { _all: true },
    }),
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const countByStatus = (s: JobStatus[]) =>
    counts
      .filter((c) => s.includes(c.status))
      .reduce((acc, c) => acc + c._count._all, 0);
  const allCount = counts.reduce((acc, c) => acc + c._count._all, 0);

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
          { label: "Workspace", href: "/dashboard" },
          { label: "Jobs" },
        ]}
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-7">
          <header className="mb-6">
            <h1 className="font-serif text-[34px] leading-[1.05] tracking-[-0.01em] sm:text-[44px] sm:leading-none">
              Tous tes <em className="italic">jobs</em>.
            </h1>
            <p className="mt-2 text-muted">
              {allCount} job{allCount > 1 ? "s" : ""} au total
              {q && ` · ${total} résultat${total > 1 ? "s" : ""} pour « ${q} »`}
            </p>
          </header>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <JobsSearch />
            <JobFilters
              filters={[
                { id: "all", label: "Tous", n: allCount },
                { id: "running", label: "En cours", n: countByStatus(["PENDING", "RUNNING"]) },
                { id: "ready", label: "Prêts", n: countByStatus(["READY", "DEPLOYED"]) },
                { id: "failed", label: "Échoués", n: countByStatus(["FAILED"]) },
              ]}
            />
          </div>

          <JobsList jobs={mapped} />
          <JobsPagination page={page} pageSize={PAGE_SIZE} total={total} />
        </div>
      </div>
    </>
  );
}
