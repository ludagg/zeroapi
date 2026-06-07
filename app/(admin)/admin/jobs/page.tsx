import Link from "next/link";
import { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import type { Job, JobStatus, User } from "@prisma/client";

const STATUS_CLASS: Record<JobStatus, string> = {
  DRAFT: "text-muted-2 border border-dashed border-line-2",
  PENDING: "text-muted border border-dashed border-line-2",
  RUNNING: "bg-warn-soft text-warn-ink",
  READY: "bg-accent text-accent-ink",
  DEPLOYED: "bg-accent text-accent-ink",
  FAILED: "bg-danger-soft text-danger",
};

type JobWithUser = Job & { user: Pick<User, "email" | "name"> };

export default async function AdminJobsPage() {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true, name: true } } },
  });

  return <AdminJobsContent jobs={jobs} />;
}

function AdminJobsContent({ jobs }: { jobs: JobWithUser[] }) {
  const t = useTranslations("admin");

  return (
    <>
      <header className="mb-6">
        <h1 className="font-serif text-[44px] leading-none tracking-[-0.01em]">
          <em className="italic">{t("jobs.title")}</em>.
        </h1>
        <p className="mt-2 text-muted">{t("jobs.subtitle", { count: jobs.length })}</p>
      </header>

      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <table className="w-full text-[13.5px]">
          <thead className="bg-bg-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t("jobs.cols.name")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("jobs.cols.owner")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("jobs.cols.status")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("jobs.cols.endpoints")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("jobs.cols.createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-line hover:bg-bg">
                <td className="px-4 py-3">
                  <Link href={`/jobs/${j.id}`} className="font-medium hover:underline">
                    {j.name}
                  </Link>
                  <div className="line-clamp-1 text-[11.5px] text-muted">{j.description}</div>
                </td>
                <td className="px-4 py-3 font-mono text-[11.5px] text-muted">
                  {j.user.name ?? j.user.email}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      "inline-flex rounded-full px-2 py-0.5 font-mono text-[10.5px] tracking-[0.04em] " +
                      STATUS_CLASS[j.status]
                    }
                  >
                    {t(`jobs.status.${j.status}`)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-[12px]">{j.endpoints ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{formatRelativeTime(j.createdAt)}</td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  {t("jobs.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
