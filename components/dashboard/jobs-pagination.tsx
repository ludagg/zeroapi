"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function JobsPagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  if (total <= pageSize) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  function go(next: number) {
    const sp = new URLSearchParams(params?.toString() ?? "");
    if (next <= 1) sp.delete("page");
    else sp.set("page", String(next));
    const qs = sp.toString();
    router.push(qs ? `?${qs}` : "?", { scroll: false });
  }

  return (
    <div className="mt-4 flex items-center justify-between font-mono text-[11.5px] text-muted">
      <span>
        Aff. <b className="font-medium text-ink">{first}</b>–
        <b className="font-medium text-ink">{last}</b> sur{" "}
        <b className="font-medium text-ink">{total}</b>
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label="Page précédente"
          className="grid h-8 w-8 place-items-center rounded-[7px] border border-line bg-surface text-ink-2 transition hover:border-line-2 disabled:opacity-40 disabled:hover:border-line"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="px-2">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          aria-label="Page suivante"
          className="grid h-8 w-8 place-items-center rounded-[7px] border border-line bg-surface text-ink-2 transition hover:border-line-2 disabled:opacity-40 disabled:hover:border-line"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
