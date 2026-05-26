"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DownloadButton({ jobId, disabled }: { jobId: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/download`, { cache: "no-store" });
      if (res.status === 200 && res.headers.get("content-type")?.includes("application/json")) {
        const data = (await res.json()) as { url?: string; error?: string };
        if (!data.url) throw new Error(data.error ?? "Lien indisponible.");
        // Navigation directe vers l'URL signée → déclenche le download natif.
        window.location.href = data.url;
      } else if (res.status === 200) {
        // Bundle local (dev) → réponse stream zip, on déclenche le download via blob.
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
      toast.error(err instanceof Error ? err.message : "Téléchargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled || loading}
      className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-ink px-4 text-[14px] font-medium text-bg transition hover:-translate-y-px disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {loading ? "Préparation…" : "Télécharger le ZIP"}
    </button>
  );
}
