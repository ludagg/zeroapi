import type { JobStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

/** Single source of truth for how a job/API status looks across the app. */
export const STATUS_CLASS: Record<JobStatus, string> = {
  PENDING: "text-muted border border-dashed border-line-2",
  RUNNING: "bg-warn-soft text-warn-ink",
  READY: "bg-accent text-accent-ink",
  DEPLOYED: "bg-accent text-accent-ink",
  FAILED: "bg-danger-soft text-danger",
};

export const STATUS_LABEL: Record<JobStatus, string> = {
  PENDING: "EN FILE",
  RUNNING: "EN COURS",
  READY: "PRÊT",
  DEPLOYED: "EN LIGNE",
  FAILED: "ÉCHEC",
};

/** A11y: a textual description so status is never conveyed by colour alone. */
const STATUS_ARIA: Record<JobStatus, string> = {
  PENDING: "Statut : en file d'attente",
  RUNNING: "Statut : génération en cours",
  READY: "Statut : prêt",
  DEPLOYED: "Statut : en ligne",
  FAILED: "Statut : échec",
};

export function StatusDot({ status }: { status: JobStatus }) {
  if (status === "RUNNING") {
    return (
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
    );
  }
  return <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />;
}

export function StatusPill({
  status,
  className,
}: {
  status: JobStatus;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label={STATUS_ARIA[status]}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium tracking-[0.04em]",
        STATUS_CLASS[status],
        className,
      )}
    >
      <StatusDot status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}
