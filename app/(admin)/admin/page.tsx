import { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ANALYTICS_DAYS = 30;

/** Bucket a list of timestamps into per-day counts over the trailing window. */
function bucketDaily(dates: Date[], days = ANALYTICS_DAYS): number[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const start = startOfToday.getTime() - (days - 1) * 86_400_000;
  const buckets = new Array<number>(days).fill(0);
  for (const d of dates) {
    const day = new Date(d).setHours(0, 0, 0, 0);
    const idx = Math.floor((day - start) / 86_400_000);
    if (idx >= 0 && idx < days) buckets[idx] += 1;
  }
  return buckets;
}

export default async function AdminOverviewPage() {
  const since = new Date(Date.now() - ANALYTICS_DAYS * 86_400_000);
  const createdAt = { select: { createdAt: true } } as const;

  const [
    users,
    jobs,
    deployments,
    runningJobs,
    failedJobs,
    recentUsers,
    recentJobs,
    recentDeployments,
    recentSecurity,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.job.count(),
    prisma.deployment.count(),
    prisma.job.count({ where: { status: "RUNNING" } }),
    prisma.job.count({ where: { status: "FAILED" } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, ...createdAt }),
    prisma.job.findMany({ where: { createdAt: { gte: since } }, ...createdAt }),
    prisma.deployment.findMany({ where: { createdAt: { gte: since } }, ...createdAt }),
    prisma.activityLog.findMany({
      where: { kind: "SECURITY", createdAt: { gte: since } },
      ...createdAt,
    }),
  ]);

  return (
    <AdminOverviewContent
      users={users}
      jobs={jobs}
      deployments={deployments}
      runningJobs={runningJobs}
      failedJobs={failedJobs}
      series={{
        signups: bucketDaily(recentUsers.map((r) => r.createdAt)),
        jobs: bucketDaily(recentJobs.map((r) => r.createdAt)),
        deployments: bucketDaily(recentDeployments.map((r) => r.createdAt)),
        security: bucketDaily(recentSecurity.map((r) => r.createdAt)),
      }}
    />
  );
}

type Series = {
  signups: number[];
  jobs: number[];
  deployments: number[];
  security: number[];
};

function AdminOverviewContent({
  users,
  jobs,
  deployments,
  runningJobs,
  failedJobs,
  series,
}: {
  users: number;
  jobs: number;
  deployments: number;
  runningJobs: number;
  failedJobs: number;
  series: Series;
}) {
  const t = useTranslations("admin");

  const cards = [
    { label: t("overview.cards.users.label"), value: users, hint: t("overview.cards.users.hint") },
    { label: t("overview.cards.totalJobs.label"), value: jobs, hint: t("overview.cards.totalJobs.hint") },
    { label: t("overview.cards.runningJobs.label"), value: runningJobs, hint: t("overview.cards.runningJobs.hint") },
    { label: t("overview.cards.deployments.label"), value: deployments, hint: t("overview.cards.deployments.hint") },
    { label: t("overview.cards.failures.label"), value: failedJobs, hint: t("overview.cards.failures.hint") },
  ];

  const charts: Array<{ label: string; data: number[]; danger?: boolean }> = [
    { label: t("overview.analytics.signups"), data: series.signups },
    { label: t("overview.analytics.jobs"), data: series.jobs },
    { label: t("overview.analytics.deployments"), data: series.deployments },
    { label: t("overview.analytics.security"), data: series.security, danger: true },
  ];

  return (
    <>
      <header className="mb-7">
        <h1 className="font-serif text-[44px] leading-none tracking-[-0.01em]">
          {t("overview.title")}<em className="italic">{t("overview.titleEm")}</em>.
        </h1>
        <p className="mt-2 text-muted">{t("overview.subtitle")}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-[12px] border border-line bg-surface p-4 transition hover:border-line-2"
          >
            <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
              {c.label}
            </div>
            <div className="mt-2 font-serif text-[36px] leading-none tracking-[-0.01em]">
              {formatNumber(c.value)}
            </div>
            <div className="mt-1.5 text-[12px] text-muted">{c.hint}</div>
          </div>
        ))}
      </div>

      <div className="mt-7">
        <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
          {t("overview.analytics.title")}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {charts.map((c) => (
            <MiniBars key={c.label} label={c.label} data={c.data} danger={c.danger} />
          ))}
        </div>
      </div>
    </>
  );
}

function MiniBars({ label, data, danger }: { label: string; data: number[]; danger?: boolean }) {
  const total = data.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...data);
  return (
    <div className="rounded-[12px] border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[12.5px] font-medium">{label}</div>
        <div className="font-serif text-[22px] leading-none">{formatNumber(total)}</div>
      </div>
      <div className="mt-3 flex h-[44px] items-end gap-[2px]">
        {data.map((v, i) => (
          <div
            key={i}
            title={String(v)}
            style={{ height: `${Math.max(3, (v / max) * 100)}%` }}
            className={
              "flex-1 rounded-[1px] " +
              (danger ? "bg-danger/70" : "bg-accent") +
              (v === 0 ? " opacity-25" : "")
            }
          />
        ))}
      </div>
    </div>
  );
}
