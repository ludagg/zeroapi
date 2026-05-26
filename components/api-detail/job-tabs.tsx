"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Tab = { id: string; label: string; n?: number };

export function JobTabs({
  tabs,
  panels,
}: {
  tabs: Tab[];
  panels: Record<string, React.ReactNode>;
}) {
  const [active, setActive] = useState(tabs[0].id);
  return (
    <>
      <div
        role="tablist"
        className="mb-5 flex gap-1 overflow-x-auto border-b border-line scrollbar-thin"
      >
        {tabs.map((t) => {
          const isOn = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isOn}
              onClick={() => setActive(t.id)}
              className={cn(
                "relative inline-flex flex-shrink-0 items-center gap-1.5 px-3 py-2.5 text-[13.5px] transition",
                isOn ? "font-medium text-ink" : "text-muted hover:text-ink",
              )}
            >
              {t.label}
              {t.n !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px font-mono text-[10.5px]",
                    isOn ? "bg-accent text-accent-ink" : "bg-bg-2 text-muted",
                  )}
                >
                  {t.n}
                </span>
              )}
              {isOn && (
                <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-ink" />
              )}
            </button>
          );
        })}
      </div>
      <div>{panels[active] ?? null}</div>
    </>
  );
}
