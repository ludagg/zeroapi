import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Unified page header for dashboard/admin pages: optional eyebrow, large serif
 * title (use `<em>` for the italic accent word), muted description, actions slot.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="font-serif text-[34px] leading-[1.05] tracking-[-0.01em] [&_em]:italic sm:text-[44px] sm:leading-none">
          {title}
        </h1>
        {description && <p className="mt-2 text-[14.5px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
