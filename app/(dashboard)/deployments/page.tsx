import Link from "next/link";
import { GitBranch, Server } from "lucide-react";
import type { DeployPlatform, DeploymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { DeploymentsFilter } from "@/components/deployments/deployments-filter";
import { ExternalUrlLink } from "@/components/deployments/external-url-link";
import { formatRelativeTime } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

const PLATFORM_LABEL: Record<DeployPlatform, string> = {
  RAILWAY: "Railway",
  RENDER: "Render",
  VERCEL: "Vercel",
  FLYIO: "Fly.io",
  ZEROAPI_CLOUD: "ZeroAPI Cloud",
};

const STATUS_CLASS: Record<DeploymentStatus, string> = {
  PENDING: "border border-dashed border-line-2 text-muted",
  DEPLOYING: "bg-warn-soft text-warn-ink",
  ONLINE: "bg-accent text-accent-ink",
  FAILED: "bg-danger-soft text-danger",
};

const FILTER_IDS: Array<{ id: string; statuses: DeploymentStatus[] | null }> = [
  { id: "all", statuses: null },
  { id: "online", statuses: ["ONLINE"] },
  { id: "pending", statuses: ["PENDING", "DEPLOYING"] },
  { id: "failed", statuses: ["FAILED"] },
];

export default async function DeploymentsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const t = await getTranslations("dashboard");
  const user = await requireUser();

  const all = await prisma.deployment.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { job: { select: { id: true, name: true } } },
  });

  const counts = {
    all: all.length,
    online: all.filter((d) => d.status === "ONLINE").length,
    pending: all.filter((d) => d.status === "PENDING" || d.status === "DEPLOYING").length,
    failed: all.filter((d) => d.status === "FAILED").length,
  };

  const current = FILTER_IDS.find((f) => f.id === (searchParams.status ?? "all")) ?? FILTER_IDS[0];
  const visible = current.statuses
    ? all.filter((d) => current.statuses!.includes(d.status))
    : all;

  return (
    <>
      <DashboardHeader
        crumbs={[
          { label: t("header.workspace"), href: "/dashboard" },
          { label: t("nav.deployments") },
        ]}
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-7">
          <header className="mb-6">
            <h1 className="font-serif text-[34px] leading-[1.05] tracking-[-0.01em] sm:text-[44px] sm:leading-none">
              {t.rich("deployments.pageTitle", { em: (chunks) => <em className="italic">{chunks}</em> })}
            </h1>
            <p className="mt-2 text-[14.5px] text-muted">
              {all.length > 1
                ? t("deployments.totalPlural", { count: all.length })
                : t("deployments.total", { count: all.length })}
            </p>
          </header>

          <div className="mb-5">
            <DeploymentsFilter
              filters={[
                { id: "all", label: t("deployments.filters.all"), n: counts.all },
                { id: "online", label: t("deployments.filters.online"), n: counts.online },
                { id: "pending", label: t("deployments.filters.pending"), n: counts.pending },
                { id: "failed", label: t("deployments.filters.failed"), n: counts.failed },
              ]}
            />
          </div>

          {all.length === 0 ? (
            <EmptyState />
          ) : visible.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-line-2 bg-surface px-6 py-10 text-center text-[13.5px] text-muted">
              {t("deployments.emptyFilter")}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
              {visible.map((d, i) => (
                <Link
                  key={d.id}
                  href={`/jobs/${d.job.id}`}
                  className="group grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3.5 transition hover:bg-bg sm:gap-4 sm:px-4 sm:grid-cols-[36px_minmax(0,1fr)_140px_180px_120px]"
                  style={i > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
                >
                  <div className="grid h-9 w-9 place-items-center rounded-[9px] border border-line bg-bg-2">
                    <Server className="h-3.5 w-3.5 text-ink" />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold">{d.job.name}</div>
                    {d.url ? (
                      <ExternalUrlLink url={d.url} />
                    ) : (
                      <span className="mt-0.5 inline-block font-mono text-[11.5px] text-muted-2">
                        {t("deployments.noUrl")}
                      </span>
                    )}
                  </div>

                  <div className="hidden font-mono text-[11.5px] text-muted sm:block">
                    {PLATFORM_LABEL[d.platform]}
                  </div>

                  <div className="hidden font-mono text-[11.5px] text-muted sm:block">
                    {formatRelativeTime(d.updatedAt)}
                  </div>

                  <span
                    className={
                      "inline-flex items-center gap-1.5 self-center justify-self-start rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium tracking-[0.04em] " +
                      STATUS_CLASS[d.status]
                    }
                  >
                    <Dot status={d.status} />
                    {t(`deployments.status.${d.status.toLowerCase()}` as "deployments.status.pending")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Dot({ status }: { status: DeploymentStatus }) {
  if (status === "DEPLOYING") {
    return (
      <span className="inline-block h-1.5 w-1.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
    );
  }
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />;
}

function EmptyState() {
  const t = useTranslations("dashboard");
  return (
    <div className="rounded-[14px] border border-dashed border-line-2 bg-surface px-6 py-12 text-center">
      <GitBranch className="mx-auto mb-3 h-5 w-5 text-muted-2" />
      <p className="font-serif text-[28px] leading-tight">
        {t("deployments.empty.headline")}
      </p>
      <p className="mt-2 text-muted">
        {t("deployments.empty.subtitle")}
      </p>
      <Link href="/conversations" className="btn-primary-accent mt-5 inline-flex">
        {t("deployments.empty.cta")}
      </Link>
    </div>
  );
}
