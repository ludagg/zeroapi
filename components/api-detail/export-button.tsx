"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ExportButton({
  jobId,
  disabled,
  label = "Exporter",
}: {
  jobId: string;
  disabled?: boolean;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/download`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;

      if (res.status === 200 && data?.url) {
        window.location.href = data.url;
        return;
      }
      if (res.status === 202) {
        toast.info(data?.error ?? "ZIP en cours de génération...");
        return;
      }
      throw new Error(data?.error ?? `Erreur ${res.status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled || loading}
      className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3 text-[13px] font-medium text-ink transition hover:-translate-y-px hover:border-line-2 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
  );
}
