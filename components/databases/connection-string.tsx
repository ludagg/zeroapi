"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

/**
 * Connection string placeholder for the free plan — credentials are
 * intentionally masked. The pro plan reveals live stats instead.
 */
export function ConnectionString({ dbName }: { dbName: string }) {
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);

  const raw = `postgresql://zeroapi:••••••••@db.zeroapi.app:5432/${dbName}?sslmode=require`;
  const shown = reveal
    ? raw.replace(
        /zeroapi:••••••••/,
        "zeroapi:demo-replace-in-prod",
      )
    : raw;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shown);
      setCopied(true);
      toast.success("Connection string copiée.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copie impossible — vérifie les permissions du navigateur.");
    }
  }

  return (
    <div className="rounded-[10px] border border-line bg-bg-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <code className="overflow-hidden truncate font-mono text-[12px] text-ink-2">{shown}</code>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setReveal((s) => !s)}
            aria-label={reveal ? "Masquer" : "Afficher"}
            className="grid h-7 w-7 place-items-center rounded-[6px] text-muted transition hover:bg-bg-3 hover:text-ink"
          >
            {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-7 items-center gap-1 rounded-[6px] border border-line bg-surface px-2 text-[11.5px] font-medium text-ink-2 transition hover:-translate-y-px"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-accent-ink" /> Copié
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copier
              </>
            )}
          </button>
        </div>
      </div>
      <p className="mt-2 font-mono text-[10.5px] text-muted">
        Les identifiants sont régénérés à chaque rotation. Active la rotation auto dans
        l&apos;onglet Paramètres de ton API.
      </p>
    </div>
  );
}
