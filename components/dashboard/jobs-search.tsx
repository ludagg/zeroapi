"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function JobsSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params?.get("q") ?? "";
  const [value, setValue] = useState(initial);

  useEffect(() => {
    setValue(params?.get("q") ?? "");
  }, [params]);

  useEffect(() => {
    const id = setTimeout(() => {
      const current = params?.get("q") ?? "";
      if (value === current) return;
      const next = new URLSearchParams(params?.toString() ?? "");
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      next.delete("page");
      const qs = next.toString();
      router.push(qs ? `?${qs}` : "?", { scroll: false });
    }, 250);
    return () => clearTimeout(id);
  }, [value, params, router]);

  return (
    <div className="relative max-w-md flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Chercher par nom…"
        className="h-9 w-full rounded-[9px] border border-line bg-surface pl-9 pr-9 text-[13.5px] text-ink outline-none transition focus:border-ink"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Effacer"
          className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-[6px] text-muted transition hover:bg-bg-2 hover:text-ink"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
