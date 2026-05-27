"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function RegenerateButton({ jobId, disabled }: { jobId: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handle() {
    if (pending) return;
    const confirmed = window.confirm(
      "Régénérer va créer un nouveau job à partir de la même spec. Continuer ?",
    );
    if (!confirmed) return;
    setPending(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/regenerate`, { method: "POST" });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) {
        throw new Error(data.error ?? "Régénération impossible.");
      }
      toast.success("Régénération lancée.");
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
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
      {pending ? "Lancement…" : "Régénérer"}
    </button>
  );
}
