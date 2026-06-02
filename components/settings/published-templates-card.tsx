"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, Store } from "lucide-react";
import { toast } from "sonner";

export type PublishedTemplate = {
  id: string;
  title: string;
  category: string;
  emoji: string;
  usageCount: number;
};

/**
 * Settings card listing the user's published community templates, with a
 * one-click "Retirer" that flips the template (and its job) back to PRIVATE.
 */
export function PublishedTemplatesCard({ templates }: { templates: PublishedTemplate[] }) {
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
      if (!res.ok) throw new Error(data.error ?? "Action impossible.");
      toast.success("Template retiré de la marketplace.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Store className="h-4 w-4 text-ink-2" />
        <h2 className="text-[14px] font-semibold text-ink">Mes templates publiés</h2>
      </div>

      {templates.length === 0 ? (
        <div className="px-4 py-6 text-[13px] text-muted">
          Tu n&apos;as publié aucun template. Depuis une conversation, passe un job en{" "}
          <span className="inline-flex items-center gap-1 align-middle text-ink-2">
            <Globe className="h-3 w-3" /> Public
          </span>{" "}
          pour le partager dans la marketplace.
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[9px] bg-bg-2 text-[17px] leading-none">
                {t.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-ink">{t.title}</div>
                <div className="mt-0.5 flex items-center gap-2 font-mono text-[10.5px] text-muted">
                  <span className="rounded-full bg-bg-2 px-1.5 py-px uppercase tracking-[0.06em]">
                    {t.category}
                  </span>
                  <span>{t.usageCount} util.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => retire(t.id)}
                disabled={busyId !== null}
                className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 text-[12.5px] font-medium text-ink-2 transition hover:border-line-2 disabled:opacity-50"
              >
                {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
