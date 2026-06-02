"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Cloud, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn, formatRelativeTime } from "@/lib/utils";

export type VersionRow = {
  id: string;
  version: number;
  status: "DRAFT" | "PENDING" | "RUNNING" | "READY" | "DEPLOYED" | "FAILED";
  createdAt: string;
  deployStatus: "PENDING" | "DEPLOYING" | "ONLINE" | "FAILED" | null;
  liveUrl: string | null;
};

const STATUS_PILL: Record<VersionRow["status"], { label: string; className: string }> = {
  DRAFT: { label: "BROUILLON", className: "border border-dashed border-line-2 text-muted-2" },
  PENDING: { label: "EN FILE", className: "border border-dashed border-line-2 text-muted" },
  RUNNING: { label: "EN COURS", className: "bg-warn-soft text-warn-ink" },
  READY: { label: "PRÊT", className: "bg-accent-soft text-accent-ink" },
  DEPLOYED: { label: "EN LIGNE", className: "bg-accent text-accent-ink" },
  FAILED: { label: "ÉCHEC", className: "bg-danger-soft text-danger" },
};

/**
 * Lists every version of the API (one row per build in the lineage), with the
 * live one highlighted. Lets the owner open, deploy or branch a new version
 * off any past build.
 */
export function VersionPanel({
  versions,
  currentId,
}: {
  versions: VersionRow[];
  currentId: string;
}) {
  const router = useRouter();
  const [reverting, setReverting] = useState<string | null>(null);
  const latestVersion = versions.reduce((m, v) => Math.max(m, v.version), 0);

  async function revert(v: VersionRow) {
    if (
      !confirm(
        `Repartir de la v${v.version} ? Une nouvelle version sera créée à partir de sa spec (la version en ligne continue de tourner jusqu'à ce que tu la redéploies).`,
      )
    )
      return;
    setReverting(v.id);
    try {
      const res = await fetch(`/api/jobs/${v.id}/regenerate`, { method: "POST" });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "Échec.");
      toast.success(`Nouvelle version créée à partir de la v${v.version}.`);
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de créer la version.");
      setReverting(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h3 className="text-[14px] font-semibold">
          Versions
          <span className="ml-2 rounded-full bg-bg-3 px-1.5 py-0.5 font-mono text-[10.5px] text-muted">
            {versions.length}
          </span>
        </h3>
        <span className="font-mono text-[11px] text-muted">la plus récente en haut</span>
      </div>
      <ul className="divide-y divide-line">
        {versions.map((v) => {
          const pill = STATUS_PILL[v.status];
          const isCurrent = v.id === currentId;
          const isLive = v.deployStatus === "ONLINE" || v.status === "DEPLOYED";
          return (
            <li
              key={v.id}
              className={cn(
                "flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5",
                isCurrent && "bg-bg-2/60",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="font-serif text-[20px] leading-none tracking-[-0.01em]">
                  v{v.version}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.04em]",
                    pill.className,
                  )}
                >
                  {pill.label}
                </span>
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] tracking-[0.04em] text-accent-ink">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-accent-ink"
                      style={{ boxShadow: "0 0 0 3px rgba(0,0,0,.18)" }}
                    />
                    EN LIGNE
                  </span>
                )}
                {v.version === latestVersion && (
                  <span className="font-mono text-[10.5px] text-muted">la plus récente</span>
                )}
                {isCurrent && (
                  <span className="rounded-[5px] border border-line bg-surface px-1.5 py-px font-mono text-[10px] text-muted">
                    affichée
                  </span>
                )}
                <span className="ml-auto font-mono text-[11px] text-muted-2 sm:ml-0">
                  {formatRelativeTime(new Date(v.createdAt))}
                </span>
              </div>

              <div className="flex flex-shrink-0 items-center gap-1.5">
                {!isCurrent && (
                  <Link
                    href={`/jobs/${v.id}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-2.5 text-[12px] font-medium text-ink-2 transition hover:border-line-2"
                  >
                    Ouvrir
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                )}
                {(v.status === "READY" || v.status === "DEPLOYED") && (
                  <Link
                    href={`/jobs/${v.id}?tab=deploy`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-2.5 text-[12px] font-medium text-ink-2 transition hover:border-line-2"
                  >
                    <Cloud className="h-3 w-3" />
                    Déployer
                  </Link>
                )}
                {v.version !== latestVersion && (
                  <button
                    type="button"
                    onClick={() => revert(v)}
                    disabled={reverting !== null}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-2.5 text-[12px] font-medium text-ink-2 transition hover:border-line-2 disabled:opacity-50"
                    title="Créer une nouvelle version à partir de celle-ci"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {reverting === v.id ? "Création…" : "Repartir de là"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
