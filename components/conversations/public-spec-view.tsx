"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { FileJson, ListTree, Share2 } from "lucide-react";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { EndpointsList } from "@/components/api-detail/endpoints-list";
import { useTranslations } from "next-intl";

function SpecGraphLoader() {
  const t = useTranslations("dashboard");
  return (
    <div className="grid h-full place-items-center text-[12px] text-muted">
      {t("conversations.spec.loadingGraph")}
    </div>
  );
}

const SpecGraph = dynamic(() => import("@/components/conversations/spec-graph"), {
  ssr: false,
  loading: () => <SpecGraphLoader />,
});

type TabKey = "graph" | "endpoints" | "spec";

/** Read-only viewer of a spec (no editing) for public share pages. */
export function PublicSpecView({ spec }: { spec: ZeroAPISpec }) {
  const t = useTranslations("dashboard");
  const [tab, setTab] = useState<TabKey>("graph");

  const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: "graph", label: t("conversations.spec.graphTab"), icon: <Share2 className="h-3 w-3" /> },
    { key: "endpoints", label: t("conversations.spec.endpointsTab"), icon: <ListTree className="h-3 w-3" /> },
    { key: "spec", label: t("conversations.spec.specTab"), icon: <FileJson className="h-3 w-3" /> },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b border-line bg-surface/40 px-3 py-2">
        {TABS.map((tb) => {
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className={
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition " +
                (active ? "bg-ink text-bg" : "text-muted hover:bg-bg-3 hover:text-ink-2")
              }
            >
              {tb.icon}
              {tb.label}
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
