"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DeployTarget } from "@/lib/api-detail";

const ICON_BG: Record<DeployTarget["id"], string> = {
  railway: "bg-[#0B0D0E] text-white",
  render: "bg-[#46E3B7] text-[#0A0A0A]",
  vercel: "bg-[#0A0A0A] text-white",
  flyio: "bg-[#5A45E1] text-white",
};

const ICON: Record<DeployTarget["id"], string> = {
  railway: "▲",
  render: "○",
  vercel: "▽",
  flyio: "✈",
};

export function DeployButtons({ targets }: { targets: DeployTarget[] }) {
  const [active, setActive] = useState<DeployTarget | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {targets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t)}
            className="group flex items-center gap-2.5 rounded-[10px] border border-line bg-surface px-3 py-2.5 text-left transition hover:-translate-y-px hover:border-line-2"
          >
            <span
              className={cn(
                "grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] text-[14px] font-semibold",
                ICON_BG[t.id],
              )}
            >
              {ICON[t.id]}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-medium">{t.label}</div>
              <div className="truncate font-mono text-[10.5px] text-muted">{t.filename}</div>
            </div>
          </button>
        ))}
      </div>

      <Dialog.Root open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-[state=open]:animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(720px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[16px] border border-line bg-surface shadow-lg data-[state=open]:animate-fade-in">
            {active && <DeployModal target={active} onClose={() => setActive(null)} />}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function DeployModal({ target, onClose }: { target: DeployTarget; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(target.config);
      setCopied(true);
      toast.success(`${target.filename} copié dans le presse-papiers.`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copie impossible — vérifie les permissions du navigateur.");
    }
  }

  return (
    <>
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <Dialog.Title asChild>
            <h2 className="font-serif text-[22px] leading-tight">
              Déployer sur <em className="italic">{target.label}</em>
            </h2>
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-[12.5px] text-muted">
            Copie le contenu ci-dessous dans <code className="font-mono">{target.filename}</code>
            {" à la racine de ton projet."}
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <button
            aria-label="Fermer"
            className="grid h-8 w-8 place-items-center rounded-[8px] text-muted transition hover:bg-bg-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </Dialog.Close>
      </header>

      <div className="flex items-center gap-2 border-b border-line bg-bg-2 px-5 py-2">
        <span className="font-mono text-[11px] text-muted">{target.filename}</span>
        <span className="ml-auto rounded-[5px] border border-line bg-surface px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.05em] text-muted">
          {target.language}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-7 items-center gap-1.5 rounded-[7px] border border-line bg-surface px-2.5 text-[12px] font-medium text-ink-2 transition hover:-translate-y-px hover:border-line-2"
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

      <pre className="max-h-[55vh] overflow-auto bg-bg px-5 py-4 font-mono text-[12.5px] leading-relaxed text-ink-2 scrollbar-thin">
        {target.config}
      </pre>

      <footer className="flex items-center justify-between border-t border-line px-5 py-3">
        <a
          href={target.docs}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-muted transition hover:text-ink"
        >
          <ExternalLink className="h-3 w-3" />
          Doc {target.label}
        </a>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 items-center rounded-[8px] border border-line bg-surface px-3 text-[12.5px] font-medium text-ink transition hover:border-line-2"
        >
          Fermer
        </button>
      </footer>
    </>
  );
}
