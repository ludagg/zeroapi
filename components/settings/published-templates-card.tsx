"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export type PublishedTemplate = {
  id: string;
  title: string;
  category: string;
  emoji: string;
  usageCount: number;
};

export function PublishedTemplatesCard({ templates }: { templates: PublishedTemplate[] }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function retire(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "PRIVATE" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("settings.templates.errorRetire"));
      toast.success(t("settings.templates.successRetire"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.templates.errorRetry"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Store className="h-4 w-4 text-ink-2" />
        <h2 className="text-[14px] font-semibold text-ink">{t("settings.templates.title")}</h2>
      </div>

      {templates.length === 0 ? (
        <div className="px-4 py-6 text-[13px] text-muted">
          {t("settings.templates.empty")}
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {templates.map((tmpl) => (
            <li key={tmpl.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[9px] bg-bg-2 text-[17px] leading-none">
                {tmpl.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-ink">{tmpl.title}</div>
                <div className="mt-0.5 flex items-center gap-2 font-mono text-[10.5px] text-muted">
                  <span className="rounded-full bg-bg-2 px-1.5 py-px uppercase tracking-[0.06em]">
                    {tmpl.category}
                  </span>
                  <span>{t("settings.templates.usageCount", { count: tmpl.usageCount })}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => retire(tmpl.id)}
                disabled={busyId !== null}
                className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 text-[12.5px] font-medium text-ink-2 transition hover:border-line-2 disabled:opacity-50"
              >
                {busyId === tmpl.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {t("settings.templates.retire")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
