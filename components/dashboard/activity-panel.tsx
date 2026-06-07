import Link from "next/link";
import { AlertTriangle, Check, ServerCrash } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatRelativeTime } from "@/lib/utils";
import type { JobStatus } from "@prisma/client";

type ActivityItem = {
  id: string;
  name: string;
  status: JobStatus;
  endpoints: number | null;
  testsTotal: number | null;
  testsPassed: number | null;
  updatedAt: Date;
};

export function ActivityPanel({ items }: { items: ActivityItem[] }) {
  const t = useTranslations("dashboard");
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold">{t("activity.title")}</h3>
        <Link href="/jobs" className="text-[12px] text-muted transition hover:text-ink">
          {t("activity.viewAll")}
        </Link>
      </div>

      <div className="py-2">
        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-muted">
            {t("activity.empty")}
          </div>
        )}

        {items.map((it, i) => (
          <div
            key={it.id}
            className="relative grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3"
          >
            {i < items.length - 1 && (
              <span className="absolute left-[30px] top-[38px] bottom-[-12px] w-px bg-line" />
            )}
            <ActivityIcon status={it.status} />
            <div className="text-[13px] leading-snug">
              <ActivityText
                name={it.name}
                status={it.status}
                tests={
                  it.testsTotal && it.testsPassed
                    ? Math.round((it.testsPassed / it.testsTotal) * 100)
                    : null
                }
                endpoints={it.endpoints}
              />
            </div>
            <div className="whitespace-nowrap font-mono text-[10.5px] text-muted">
              {formatRelativeTime(it.updatedAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityIcon({ status }: { status: JobStatus }) {
  if (status === "READY")
    return (
      <div className="relative z-10 grid h-[26px] w-[26px] place-items-center rounded-[7px] border border-accent bg-accent text-accent-ink">
        <Check className="h-3 w-3" strokeWidth={3} />
      </div>
    );
  if (status === "DEPLOYED")
    return (
      <div className="relative z-10 grid h-[26px] w-[26px] place-items-center rounded-[7px] border border-accent bg-accent text-accent-ink">
        <Check className="h-3 w-3" strokeWidth={3} />
      </div>
    );
  if (status === "FAILED")
    return (
      <div className="relative z-10 grid h-[26px] w-[26px] place-items-center rounded-[7px] border border-warn-soft bg-warn-soft text-warn-ink">
        <AlertTriangle className="h-3 w-3" />
      </div>
    );
  return (
    <div className="relative z-10 grid h-[26px] w-[26px] place-items-center rounded-[7px] border border-line bg-bg-2 text-ink-2">
      <ServerCrash className="h-3 w-3" />
    </div>
  );
}

function ActivityText({
  name,
  status,
  tests,
  endpoints,
}: {
  name: string;
  status: JobStatus;
  tests: number | null;
  endpoints: number | null;
}) {
  const t = useTranslations("dashboard");
  if (status === "READY")
    return (
      <>
        {tests !== null
          ? t.rich("activity.readyTests", { name, tests, b: (c) => <b className="font-semibold">{c}</b> })
          : t.rich("activity.ready", { name, b: (c) => <b className="font-semibold">{c}</b> })}
      </>
    );
  if (status === "DEPLOYED")
    return (
      <>
        {endpoints
          ? t.rich("activity.deployedEndpoints", { name, endpoints, b: (c) => <b className="font-semibold">{c}</b> })
          : t.rich("activity.deployed", { name, b: (c) => <b className="font-semibold">{c}</b> })}
      </>
    );
  if (status === "FAILED")
    return (
      <>
        {t.rich("activity.failed", { name, b: (c) => <b className="font-semibold">{c}</b> })}
      </>
    );
  return (
    <>
      {t.rich("activity.other", { name, b: (c) => <b className="font-semibold">{c}</b> })}
    </>
  );
}
