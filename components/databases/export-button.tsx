"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ExportButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/download`, { cache: "no-store" });
      if (res.status === 200 && res.headers.get("content-type")?.includes("application/json")) {
        const data = (await res.json()) as { url?: string; error?: string };
        if (!data.url) throw new Error(data.error ?? "Lien indisponible.");
        window.location.href = data.url;
      } else if (res.status === 200) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${jobId}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Erreur ${res.status}`);
      }
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
      disabled={loading}
      className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3 text-[13px] font-medium text-ink-2 transition hover:border-line-2 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {loading ? "Préparation…" : "Exporter le schéma"}
    </button>
  );
}
