"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VersionRow } from "@/components/api-detail/version-panel";

/**
 * Compact version picker shown in the job header. Defaults to the viewed
 * version; switching navigates to that version's page. The live version is
 * flagged with a dot.
 */
export function VersionSwitcher({
  versions,
  currentId,
  currentVersion,
}: {
  versions: VersionRow[];
  currentId: string;
  currentVersion: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // A lone version doesn't need a dropdown — just show the badge.
  if (versions.length <= 1) {
    return (
      <span className="rounded-[5px] border border-line bg-bg-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">
        v{currentVersion}
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-[5px] border border-line bg-bg-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-2 transition hover:border-line-2"
        title="Changer de version"
      >
        v{currentVersion}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 max-h-72 w-56 overflow-auto rounded-[10px] border border-line bg-surface p-1 shadow-lg scrollbar-thin">
          {versions.map((v) => {
            const isCurrent = v.id === currentId;
            const isLive = v.deployStatus === "ONLINE" || v.status === "DEPLOYED";
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (!isCurrent) router.push(`/jobs/${v.id}`);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-left text-[13px] transition",
                  isCurrent ? "bg-bg-2 text-ink" : "text-ink-2 hover:bg-bg-2",
                )}
              >
                <span className="font-mono">v{v.version}</span>
                {isLive && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-accent"
                    style={{ boxShadow: "0 0 0 3px var(--accent-glow)" }}
                    title="En ligne"
                  />
                )}
                <span className="ml-auto">
                  {isCurrent && <Check className="h-3.5 w-3.5 text-accent-ink" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
