import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Canonical empty state: dashed surface, serif headline, muted subtext,
 * optional accent CTA. Replaces the ad-hoc empty boxes across pages.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  /** Use `<em>` inside for the italic accent word, e.g. `Aucun job <em>pour l'instant</em>.` */
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-dashed border-line-2 bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-[11px] border border-line bg-bg-2 text-muted">
          {icon}
        </div>
      )}
      <p className="font-serif text-[28px] leading-tight [&_em]:italic">{title}</p>
      {description && <p className="mt-2 text-muted">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
