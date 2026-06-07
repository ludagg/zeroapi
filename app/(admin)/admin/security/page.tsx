import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ActivityLog, ActivitySeverity, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;
type Tab = "all" | "activity" | "security";

const SEVERITY_CLASS: Record<ActivitySeverity, string> = {
  INFO: "text-muted border border-line",
  WARNING: "bg-warn-soft text-warn-ink",
  CRITICAL: "bg-danger-soft text-danger",
};

export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams?: { tab?: string; page?: string };
}) {
  const tab: Tab =
    searchParams?.tab === "activity" || searchParams?.tab === "security"
      ? searchParams.tab
      : "all";
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);

  const where: Prisma.ActivityLogWhereInput =
    tab === "all" ? {} : { kind: tab === "security" ? "SECURITY" : "ACTIVITY" };

  const [rows, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return (
    <SecurityContent rows={rows} total={total} page={page} tab={tab} />
  );
}

function SecurityContent({
  rows,
  total,
  page,
  tab,
}: {
  rows: ActivityLog[];
  total: number;
  page: number;
  tab: Tab;
}) {
  const t = useTranslations("admin");
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(total, page * PER_PAGE);

  const tabs: Tab[] = ["all", "activity", "security"];
  const tabHref = (tb: Tab) => (tb === "all" ? "/admin/security" : `/admin/security?tab=${tb}`);

  return (
    <>
      <header className="mb-6">
        <h1 className="font-serif text-[44px] leading-none tracking-[-0.01em]">
          {t("security.title")}<em className="italic">{t("security.titleEm")}</em>.
        </h1>
        <p className="mt-2 text-muted">{t("security.subtitle")}</p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {tabs.map((tb) => (
          <Link
            key={tb}
            href={tabHref(tb)}
            className={
              "rounded-[8px] px-3 py-1.5 text-[13px] transition " +
              (tab === tb
                ? "bg-ink text-bg"
                : "border border-line text-muted hover:border-line-2 hover:text-ink")
            }
          >
            {t(`security.tabs.${tb}`)}
          </Link>
        ))}
      </div>

      <p className="mb-3 text-[12px] text-muted">{t("security.legend")}</p>

      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <table className="w-full text-[13px]">
          <thead className="bg-bg-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t("security.cols.time")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("security.cols.event")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("security.cols.severity")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("security.cols.actor")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("security.cols.ip")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("security.cols.path")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line align-top hover:bg-bg">
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {formatRelativeTime(r.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="font-mono text-[12px] font-medium">{r.type}</div>
                  {r.message && (
                    <div className="line-clamp-2 text-[11.5px] text-muted">{r.message}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      "inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.04em] " +
                      SEVERITY_CLASS[r.severity]
                    }
                  >
                    {t(`security.severity.${r.severity}`)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-[11.5px] text-muted">
                  {r.actorEmail ?? r.userId ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-[11.5px] text-muted">{r.ip ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-muted">
                  {r.path ? `${r.method ?? ""} ${r.path}`.trim() : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  {t("security.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-[12.5px] text-muted">
          <span>{t("security.showingRange", { from, to, total })}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`${tab === "all" ? "/admin/security?" : `/admin/security?tab=${tab}&`}page=${page - 1}`}
                className="rounded-[7px] border border-line px-3 py-1.5 transition hover:border-line-2 hover:text-ink"
              >
                {t("security.prev")}
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={`${tab === "all" ? "/admin/security?" : `/admin/security?tab=${tab}&`}page=${page + 1}`}
                className="rounded-[7px] border border-line px-3 py-1.5 transition hover:border-line-2 hover:text-ink"
              >
                {t("security.next")}
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
