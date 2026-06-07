import { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma";
import { formatNumber } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const [users, jobs, deployments, runningJobs, failedJobs] = await Promise.all([
    prisma.user.count(),
    prisma.job.count(),
    prisma.deployment.count(),
    prisma.job.count({ where: { status: "RUNNING" } }),
    prisma.job.count({ where: { status: "FAILED" } }),
  ]);

  return <AdminOverviewContent
    users={users}
    jobs={jobs}
    deployments={deployments}
    runningJobs={runningJobs}
    failedJobs={failedJobs}
  />;
}

function AdminOverviewContent({
  users,
  jobs,
  deployments,
  runningJobs,
  failedJobs,
}: {
  users: number;
  jobs: number;
  deployments: number;
  runningJobs: number;
  failedJobs: number;
}) {
  const t = useTranslations("admin");

  const cards = [
    { label: t("overview.cards.users.label"), value: users, hint: t("overview.cards.users.hint") },
    { label: t("overview.cards.totalJobs.label"), value: jobs, hint: t("overview.cards.totalJobs.hint") },
    { label: t("overview.cards.runningJobs.label"), value: runningJobs, hint: t("overview.cards.runningJobs.hint") },
    { label: t("overview.cards.deployments.label"), value: deployments, hint: t("overview.cards.deployments.hint") },
    { label: t("overview.cards.failures.label"), value: failedJobs, hint: t("overview.cards.failures.hint") },
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
    </>
  );
}
