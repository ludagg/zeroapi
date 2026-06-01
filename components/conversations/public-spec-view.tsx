"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { FileJson, ListTree, Share2 } from "lucide-react";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { EndpointsList } from "@/components/api-detail/endpoints-list";

const SpecGraph = dynamic(() => import("@/components/conversations/spec-graph"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-[12px] text-muted">Chargement du graphe…</div>
  ),
});

type TabKey = "graph" | "endpoints" | "spec";

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: "graph", label: "Graphe", icon: <Share2 className="h-3 w-3" /> },
  { key: "endpoints", label: "Endpoints", icon: <ListTree className="h-3 w-3" /> },
  { key: "spec", label: "Spec", icon: <FileJson className="h-3 w-3" /> },
];

/** Read-only viewer of a spec (no editing) for public share pages. */
export function PublicSpecView({ spec }: { spec: ZeroAPISpec }) {
  const [tab, setTab] = useState<TabKey>("graph");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b border-line bg-surface/40 px-3 py-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition " +
                (active ? "bg-ink text-bg" : "text-muted hover:bg-bg-3 hover:text-ink-2")
              }
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "graph" ? (
          <SpecGraph spec={spec} />
        ) : tab === "endpoints" ? (
          <div className="h-full overflow-y-auto p-4 scrollbar-thin">
            <EndpointsList resources={spec.resources} />
          </div>
        ) : (
          <div className="h-full overflow-auto p-4 scrollbar-thin">
            <pre className="rounded-[12px] border border-line bg-surface p-3.5 font-mono text-[11.5px] leading-relaxed text-ink-2">
              {JSON.stringify(spec, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
