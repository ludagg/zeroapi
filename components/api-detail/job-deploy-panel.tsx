"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Cloud, Copy, ExternalLink, Lock, Rocket, Sparkles, X } from "lucide-react";
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

export type ZeroApiCloudStatus = {
  enabled: boolean;
  unlocked: boolean;
  liveUrl?: string | null;
  status?: "PENDING" | "DEPLOYING" | "ONLINE" | "FAILED" | null;
};

export function JobDeployPanel({
  jobId,
  targets,
  liveTargetId,
  liveVersion,
  zeroApiCloud,
}: {
  jobId: string;
  targets: DeployTarget[];
  liveTargetId?: DeployTarget["id"] | null;
  liveVersion?: string | null;
  zeroApiCloud: ZeroApiCloudStatus;
}) {
  const [active, setActive] = useState<DeployTarget | null>(null);

  return (
    <div className="space-y-4">
      <ZeroApiCloudCard jobId={jobId} state={zeroApiCloud} />

      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="text-[14px] font-semibold">Déploiement externe</h3>
          <span className="font-mono text-[11px] text-muted">
            {targets.length} fournisseurs
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-4">
          {targets.map((t) => {
            const isLive = liveTargetId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t)}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-[11px] border bg-surface px-3 py-3.5 text-center transition hover:-translate-y-px",
                  isLive
                    ? "border-accent bg-accent-soft"
                    : "border-line hover:border-line-2",
                )}
              >
                {isLive && (
                  <span
                    className="absolute right-2 top-2 inline-block h-1.5 w-1.5 rounded-full bg-accent"
                    style={{ boxShadow: "0 0 0 3px var(--accent-glow)" }}
                  />
                )}
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-[8px] text-[14px] font-semibold",
                    ICON_BG[t.id],
                  )}
                >
                  {ICON[t.id]}
                </span>
                <div className="text-[13px] font-semibold">{t.label}</div>
                <div className="font-mono text-[10.5px] text-muted">
                  {isLive
                    ? liveVersion
                      ? `live · ${liveVersion}`
                      : "live"
                    : "non configuré"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog.Root open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-[state=open]:animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(720px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[16px] border border-line bg-surface shadow-lg data-[state=open]:animate-fade-in">
            {active && <DeployModal target={active} onClose={() => setActive(null)} />}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

type Phase = "idle" | "provisioning" | "starting" | "online" | "error";

function ZeroApiCloudCard({
  jobId,
  state,
}: {
  jobId: string;
  state: ZeroApiCloudStatus;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(() => {
    if (state.status === "ONLINE") return "online";
    if (state.status === "DEPLOYING") return "starting";
    return "idle";
  });
  const [liveUrl, setLiveUrl] = useState<string | null>(state.liveUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  async function deploy() {
    if (!state.unlocked) {
      toast.error("Passe au plan Pro ou Business pour activer ZeroAPI Cloud.");
      return;
    }
    if (!state.enabled) {
      toast.error("ZeroAPI Cloud n'est pas activé sur cette instance.");
      return;
    }
    setError(null);
    setPhase("provisioning");
    try {
      // Tiny client-side step animation to give feedback before the long call.
      await new Promise((r) => setTimeout(r, 600));
      setPhase("starting");
      const res = await fetch(`/api/jobs/${jobId}/deploy/zeroapi`, { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Échec du déploiement.");
      }
      setLiveUrl(data.url);
      setPhase("online");
      toast.success("API live ✓");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Réessaie dans un instant.";
      setError(message);
      setPhase("error");
      toast.error(message);
    }
  }

  const locked = !state.unlocked;
  const disabled = !state.enabled;

  return (
    <div className="overflow-hidden rounded-[14px] border border-accent/30 bg-gradient-to-br from-accent-soft via-surface to-surface">
      <div className="flex items-start gap-4 p-5">
        <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-[11px] bg-accent text-accent-ink">
          <Cloud className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold">ZeroAPI Cloud</h3>
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-bg-3 px-2 py-0.5 font-mono text-[10.5px] tracking-[0.04em] text-muted">
                <Lock className="h-2.5 w-2.5" />
                plan PRO
              </span>
            )}
            {phase === "online" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 font-mono text-[10.5px] tracking-[0.04em] text-accent-ink">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-accent-ink"
                  style={{ boxShadow: "0 0 0 3px rgba(0,0,0,.18)" }}
                />
                EN LIGNE
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-muted">
            Container Docker isolé, Postgres dédié, sous-domaine{" "}
            <code className="rounded bg-bg-2 px-1.5 py-0.5 font-mono text-[11.5px]">
              api-….zeroapi.app
            </code>{" "}
            · sans config.
          </p>

          {liveUrl ? (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-mono text-[12.5px] font-medium text-ink hover:text-accent-ink"
            >
              {liveUrl}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}

          {phase === "provisioning" && (
            <ProgressLine label="Provisionnement de la base Postgres…" />
          )}
          {phase === "starting" && (
            <ProgressLine label="Démarrage du container Docker…" />
          )}
          {phase === "error" && error && (
            <p className="mt-3 text-[12.5px] text-danger">{error}</p>
          )}
        </div>

        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={deploy}
            disabled={locked || disabled || phase === "provisioning" || phase === "starting"}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-medium transition",
              locked || disabled
                ? "cursor-not-allowed bg-bg-3 text-muted"
                : phase === "online"
                  ? "bg-bg-2 text-ink hover:bg-bg-3"
                  : "bg-accent text-accent-ink hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)]",
            )}
            title={
              locked
                ? "Passe Pro pour activer"
                : disabled
                  ? "ZeroAPI Cloud n'est pas configuré sur cette instance"
                  : undefined
            }
          >
            {locked ? (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Passer Pro
              </>
            ) : phase === "online" ? (
              <>
                <Rocket className="h-3.5 w-3.5" />
                Redéployer
              </>
            ) : (
              <>
                <Rocket className="h-3.5 w-3.5" />
                {phase === "provisioning" || phase === "starting"
                  ? "Déploiement…"
                  : "Déployer"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressLine({ label }: { label: string }) {
  return (
    <div className="mt-3 flex items-center gap-2 text-[12.5px] text-muted">
      <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label}
    </div>
  );
}

function DeployModal({ target, onClose }: { target: DeployTarget; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(target.config);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop
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
            Copie le contenu ci-dessous dans{" "}
            <code className="font-mono">{target.filename}</code> à la racine de ton
            projet.
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
