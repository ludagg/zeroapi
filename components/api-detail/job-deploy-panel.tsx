"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Cloud, Copy, ExternalLink, Lock, Rocket, Sparkles, Terminal, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { DeployTarget } from "@/lib/api-detail";
import {
  parseDeploymentLogs,
  type DeploymentLogEntry,
} from "@/lib/deployment-logs";

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
  /** Persisted deployment journal (raw JSON from the DB). */
  logs?: unknown;
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
  const t = useTranslations("dashboard");
  const [active, setActive] = useState<DeployTarget | null>(null);

  return (
    <div className="space-y-4">
      <ZeroApiCloudCard jobId={jobId} state={zeroApiCloud} />

      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="text-[14px] font-semibold">{t("apiDetail.deploy.external")}</h3>
          <span className="font-mono text-[11px] text-muted">
            {t("apiDetail.deploy.providers", { count: targets.length })}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-4">
          {targets.map((target) => {
            const isLive = liveTargetId === target.id;
            return (
              <button
                key={target.id}
                type="button"
                onClick={() => setActive(target)}
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
                    ICON_BG[target.id],
                  )}
                >
                  {ICON[target.id]}
                </span>
                <div className="text-[13px] font-semibold">{target.label}</div>
                <div className="font-mono text-[10.5px] text-muted">
                  {isLive
                    ? liveVersion
                      ? t("apiDetail.deploy.liveVersion", { version: liveVersion })
                      : t("apiDetail.deploy.live")
                    : t("apiDetail.deploy.notConfigured")}
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

type Phase = "idle" | "deploying" | "online" | "error";

const POLL_MS = 4000;

function phaseFromStatus(status: ZeroApiCloudStatus["status"]): Phase {
  if (status === "ONLINE") return "online";
  if (status === "DEPLOYING" || status === "PENDING") return "deploying";
  if (status === "FAILED") return "error";
  return "idle";
}

type StatusResponse = {
  status?: "NONE" | "PENDING" | "DEPLOYING" | "ONLINE" | "FAILED";
  url?: string | null;
  error?: string;
  logs?: unknown;
};

function ZeroApiCloudCard({
  jobId,
  state,
}: {
  jobId: string;
  state: ZeroApiCloudStatus;
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(() => phaseFromStatus(state.status));
  const [liveUrl, setLiveUrl] = useState<string | null>(state.liveUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<DeploymentLogEntry[]>(() =>
    parseDeploymentLogs(state.logs),
  );

  useEffect(() => {
    if (phase !== "deploying") return;
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/deploy/zeroapi`, {
          cache: "no-store",
        });
        const data = (await res.json()) as StatusResponse;
        if (cancelled) return;
        if (Array.isArray(data.logs)) setLogs(parseDeploymentLogs(data.logs));
        if (data.url) setLiveUrl(data.url);
        if (data.status === "ONLINE") {
          setPhase("online");
          toast.success(t("apiDetail.deploy.cloudApiOnline"));
          router.refresh();
        } else if (data.status === "FAILED") {
          setPhase("error");
          setError(t("apiDetail.deploy.cloudFailed"));
        }
      } catch {
        // Transient network error — keep polling.
      }
    }

    const id = setInterval(tick, POLL_MS);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [phase, jobId, router, t]);

  const deploy = useCallback(async () => {
    if (!state.unlocked) {
      toast.error(t("apiDetail.deploy.cloudUpgradePro"));
      return;
    }
    if (!state.enabled) {
      toast.error(t("apiDetail.deploy.cloudNotConfigured"));
      return;
    }
    setError(null);
    setPhase("deploying");
    setLogs([]);
    try {
      const res = await fetch(`/api/jobs/${jobId}/deploy/zeroapi`, { method: "POST" });
      const data = (await res.json()) as StatusResponse;
      if (Array.isArray(data.logs)) setLogs(parseDeploymentLogs(data.logs));
      if (!res.ok || data.status === "FAILED") {
        throw new Error(data.error ?? t("apiDetail.deploy.cloudErrorFailed"));
      }
      if (data.url) setLiveUrl(data.url);
      toast.message(t("apiDetail.deploy.cloudLaunched"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("apiDetail.deploy.errorRetry");
      setError(message);
      setPhase("error");
      toast.error(message);
    }
  }, [jobId, state.enabled, state.unlocked, t]);

  const locked = !state.unlocked;
  const disabled = !state.enabled;
  const busy = phase === "deploying";

  return (
    <div className="overflow-hidden rounded-[14px] border border-accent/30 bg-gradient-to-br from-accent-soft via-surface to-surface">
      <div className="flex items-start gap-4 p-5">
        <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-[11px] bg-accent text-accent-ink">
          <Cloud className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold">{t("apiDetail.deploy.cloudTitle")}</h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-warn/40 bg-warn-soft px-2 py-0.5 font-mono text-[10.5px] tracking-[0.04em] text-warn-ink">
              {t("apiDetail.deploy.cloudBeta")}
            </span>
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-bg-3 px-2 py-0.5 font-mono text-[10.5px] tracking-[0.04em] text-muted">
                <Lock className="h-2.5 w-2.5" />
                {t("apiDetail.deploy.cloudPlanRequired")}
              </span>
            )}
            {phase === "online" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 font-mono text-[10.5px] tracking-[0.04em] text-accent-ink">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-accent-ink"
                  style={{ boxShadow: "0 0 0 3px rgba(0,0,0,.18)" }}
                />
                {t("apiDetail.deploy.cloudOnline")}
              </span>
            )}
            {busy && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-2 py-0.5 font-mono text-[10.5px] tracking-[0.04em] text-warn-ink">
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("apiDetail.deploy.cloudDeploying")}
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-muted">
            {t("apiDetail.deploy.cloudDesc")}
          </p>

          <p className="mt-2 rounded-[8px] border border-warn/30 bg-warn-soft/60 px-2.5 py-1.5 text-[12px] text-warn-ink">
            {t("apiDetail.deploy.cloudBetaNotice")}
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

          {phase === "error" && error && (
            <p className="mt-3 text-[12.5px] text-danger">{error}</p>
          )}

          {logs.length > 0 && <DeployLogs logs={logs} live={busy} />}
        </div>

        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={deploy}
            disabled={locked || disabled || busy}
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
                ? t("apiDetail.deploy.cloudLockedTitle")
                : disabled
                  ? t("apiDetail.deploy.cloudDisabledTitle")
                  : undefined
            }
          >
            {locked ? (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                {t("apiDetail.deploy.cloudUpgrade")}
              </>
            ) : phase === "online" ? (
              <>
                <Rocket className="h-3.5 w-3.5" />
                {t("apiDetail.deploy.cloudRedeploy")}
              </>
            ) : (
              <>
                <Rocket className="h-3.5 w-3.5" />
                {busy ? t("apiDetail.deploy.cloudDeploying2") : t("apiDetail.deploy.cloudDeploy")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeployLogs({ logs, live }: { logs: DeploymentLogEntry[]; live: boolean }) {
  const t = useTranslations("dashboard");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [logs.length]);

  return (
    <div className="mt-3 overflow-hidden rounded-[10px] border border-line bg-bg">
      <div className="flex items-center gap-1.5 border-b border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        <Terminal className="h-3 w-3" />
        {t("apiDetail.deploy.logsTitle")}
        {live && (
          <span className="ml-auto inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        )}
      </div>
      <div className="max-h-44 overflow-auto px-3 py-2 scrollbar-thin">
        {logs.map((l, i) => (
          <div
            key={`${l.ts}-${i}`}
            className={cn(
              "flex gap-2 py-0.5 font-mono text-[11.5px] leading-relaxed",
              l.level === "error" ? "text-danger" : "text-ink-2",
            )}
          >
            <span className="flex-shrink-0 text-muted-2">
              {new Date(l.ts).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
            <span className="min-w-0">{l.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function DeployModal({ target, onClose }: { target: DeployTarget; onClose: () => void }) {
  const t = useTranslations("dashboard");
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
              {t.rich("apiDetail.deploy.deployOn", {
                label: target.label,
                em: (chunks) => <em className="italic">{chunks}</em>,
              })}
            </h2>
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-[12.5px] text-muted">
            {t.rich("apiDetail.deploy.copyConfig", {
              filename: target.filename,
              code: (chunks) => <code className="font-mono">{chunks}</code>,
            })}
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <button
            aria-label={t("apiDetail.deploy.closeAriaLabel")}
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
              <Check className="h-3 w-3 text-accent-ink" /> {t("apiDetail.deploy.copied")}
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> {t("apiDetail.deploy.copyButton")}
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
          {t("apiDetail.deploy.docLink", { label: target.label })}
        </a>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 items-center rounded-[8px] border border-line bg-surface px-3 text-[12.5px] font-medium text-ink transition hover:border-line-2"
        >
          {t("apiDetail.deploy.close")}
        </button>
      </footer>
    </>
  );
}
