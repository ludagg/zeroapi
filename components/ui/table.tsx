import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Dense list/table surface (Supabase-style). Rows are CSS-grid based so each
 * page can define its own column template via Tailwind `grid-cols-*` classes
 * (including responsive variants), while sharing the surface, dividers, hover
 * and skeleton. Generalises the pattern from jobs-list.tsx.
 */
export function Table({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-card border border-line bg-surface", className)}>
      {children}
    </div>
  );
}

type TableRowProps = {
  children: ReactNode;
  /**
   * Tailwind grid-template classes for this row, e.g.
   * "grid-cols-[36px_minmax(0,1fr)_auto] sm:grid-cols-[...]".
   */
  cols: string;
  /** Makes the row a clickable link. */
  href?: string;
  /** Renders as a muted header row (no hover). */
  header?: boolean;
  className?: string;
  /** Position in the list — draws a top divider for rows after the first. */
  index?: number;
};

const rowBase = "grid items-center gap-3 px-3.5 py-3.5 sm:gap-4 sm:px-4";

export function TableRow({ children, cols, href, header, className, index }: TableRowProps) {
  const style =
    index && index > 0 ? ({ borderTop: "1px solid var(--line)" } as React.CSSProperties) : undefined;

  if (header) {
    return (
      <div
        className={cn(
          "grid gap-3 border-b border-line px-3.5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted sm:gap-4 sm:px-4",
          cols,
          className,
        )}
      >
        {children}
      </div>
    );
  }

  if (href) {
    return (
      <Link
        href={href}
        className={cn(rowBase, cols, "group cursor-pointer transition hover:bg-bg", className)}
        style={style}
      >
        {children}
      </Link>
    );
  }

  return (
    <div className={cn(rowBase, cols, className)} style={style}>
      {children}
    </div>
  );
}

export function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Table>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-4 px-4 py-3.5"
          style={i > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
        >
          <div className="h-9 w-9 rounded-[9px] bg-bg-2" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-bg-2" />
            <div className="h-2.5 w-2/3 rounded bg-bg-2" />
          </div>
          <div className="h-5 w-16 rounded-full bg-bg-2" />
        </div>
      ))}
    </Table>
  );
}
