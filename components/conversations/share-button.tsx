"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Share2, X } from "lucide-react";
import { toast } from "sonner";

/** Header control to toggle + copy a public read-only share link for the spec. */
export function ShareButton({
  conversationId,
  initialSlug,
}: {
  conversationId: string;
  initialSlug: string | null;
}) {
  const [slug, setSlug] = useState<string | null>(initialSlug);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = slug && typeof window !== "undefined" ? `${window.location.origin}/s/${slug}` : "";

  async function toggle(enabled: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = (await res.json()) as { slug?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Échec.");
      setSlug(data.slug ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copie impossible.");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Partager"
        className={
          "inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border px-2.5 text-[12px] font-medium transition " +
          (slug
            ? "border-accent/40 bg-accent-soft text-accent-ink"
            : "border-line bg-surface text-ink-2 hover:border-line-2")
        }
      >
        <Share2 className="h-[15px] w-[15px]" />
        <span className="hidden sm:inline">Partager</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full z-30 mt-2 w-[300px] overflow-hidden rounded-[12px] border border-line bg-surface shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <span className="text-[12.5px] font-semibold text-ink">Partage public</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="grid h-5 w-5 place-items-center rounded-[6px] text-muted transition hover:bg-bg-2 hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2.5 p-3">
              <label className="flex cursor-pointer items-center justify-between gap-2 text-[12.5px] text-ink-2">
                <span>Lien en lecture seule</span>
                <input
                  type="checkbox"
                  checked={Boolean(slug)}
                  disabled={busy}
                  onChange={(e) => toggle(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
              </label>

              {busy && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  …
                </div>
              )}

              {slug && !busy && (
                <>
                  <div className="flex gap-1.5">
                    <input
                      readOnly
                      value={url}
                      onFocus={(e) => e.currentTarget.select()}
                      className="h-8 min-w-0 flex-1 rounded-[8px] border border-line bg-bg px-2.5 font-mono text-[11px] text-ink-2 outline-none"
                    />
                    <button
                      type="button"
                      onClick={copy}
                      title="Copier"
                      className="grid h-8 w-8 place-items-center rounded-[8px] border border-line bg-surface text-ink-2 transition hover:border-accent/50 hover:text-accent-ink"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-accent-ink" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      title="Ouvrir"
                      className="grid h-8 w-8 place-items-center rounded-[8px] border border-line bg-surface text-ink-2 transition hover:border-accent/50 hover:text-accent-ink"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <p className="text-[10.5px] leading-snug text-muted">
                    Quiconque a ce lien voit la spec (graphe, endpoints) en lecture seule. La
                    conversation reste privée.
                  </p>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
