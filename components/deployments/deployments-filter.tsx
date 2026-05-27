"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Filter = { id: string; label: string; n: number };

export function DeploymentsFilter({ filters }: { filters: Filter[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params?.get("status") ?? "all";

  return (
    <div className="inline-flex items-center gap-1.5 rounded-[8px] border border-line bg-surface p-1">
      {filters.map((f) => {
        const isOn = f.id === current;
        return (
          <button
            key={f.id}
            onClick={() => {
              const next = new URLSearchParams(params?.toString() ?? "");
              if (f.id === "all") next.delete("status");
              else next.set("status", f.id);
              const query = next.toString();
              router.push(query ? `?${query}` : "?", { scroll: false });
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-[5px] text-[12.5px] transition",
              isOn ? "bg-bg-3 font-medium text-ink" : "text-muted hover:text-ink",
            )}
          >
            {f.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-px font-mono text-[10.5px]",
                isOn ? "bg-surface text-ink" : "bg-bg-2 text-muted",
              )}
            >
              {f.n}
            </span>
          </button>
        );
      })}
    </div>
  );
}
