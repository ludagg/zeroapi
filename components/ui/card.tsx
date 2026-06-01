import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared surface card. Replaces the repeated
 * `rounded-[14px] border border-line bg-surface` pattern.
 */
export function Card({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  /** Adds the standard lift + shadow on hover (for clickable cards). */
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border border-line bg-surface",
        hover &&
          "transition hover:-translate-y-px hover:border-line-2 hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-3 border-b border-line px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {subtitle && <p className="mt-1 text-[12.5px] text-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </header>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}
