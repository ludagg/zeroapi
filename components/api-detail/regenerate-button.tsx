"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function RegenerateButton({ jobId, disabled }: { jobId: string; disabled?: boolean }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handle() {
    if (pending) return;
    const confirmed = window.confirm(t("apiDetail.regenerate.confirm"));
    if (!confirmed) return;
    setPending(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/regenerate`, { method: "POST" });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) {
        throw new Error(data.error ?? t("apiDetail.regenerate.errorImpossible"));
      }
      toast.success(t("apiDetail.regenerate.successLaunched"));
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("apiDetail.regenerate.errorRetry"));
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending || disabled}
      className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3 text-[13px] font-medium text-ink-2 transition hover:-translate-y-px hover:border-line-2 disabled:opacity-60 disabled:hover:translate-y-0"
    >
      <RefreshCw className={"h-3.5 w-3.5 " + (pending ? "animate-spin" : "")} />
      {pending ? t("apiDetail.regenerate.launching") : t("apiDetail.regenerate.button")}
    </button>
  );
}
