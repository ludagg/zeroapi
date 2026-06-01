"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

/** Launches the backend generation for a DRAFT job (DRAFT → PENDING). */
export function StartGenerationButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handle() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/start`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Lancement impossible.");
      }
      toast.success("Génération lancée — on te prévient quand c'est prêt.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-accent px-3.5 text-[13px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)] disabled:opacity-60 disabled:hover:translate-y-0"
    >
      {pending ? "Lancement…" : "Lancer la génération"}
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}
