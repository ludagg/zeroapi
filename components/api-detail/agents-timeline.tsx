import { AlertTriangle, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Log = {
  id: string;
  agent: string;
  status: string;
  message: string | null;
  duration: number | null;
  createdAt: Date;
};

const AGENT_LABEL: Record<string, string> = {
  spec_generation: "Spec generation",
  clarifier: "Clarificateur",
  orchestrator: "Orchestrateur",
  code: "Code",
  security: "Sécurité",
  tests: "Tests",
  upload: "Upload du ZIP",
};

const ORDER = ["spec_generation", "clarifier", "orchestrator", "code", "security", "tests", "upload"];

export function AgentsTimeline({ logs }: { logs: Log[] }) {
  if (!logs.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-2 bg-surface p-10 text-center text-muted">
        Le pipeline n&apos;a pas encore démarré.
      </div>
    );
  }

  const byAgent = new Map<string, Log>();
  for (const l of logs) byAgent.set(l.agent, l);
  const ordered = ORDER.map((a) => byAgent.get(a)).filter(Boolean) as Log[];
  // tack on any unknown agents at the end (preserve their original order)
  for (const l of logs) {
    if (!ORDER.includes(l.agent) && !ordered.includes(l)) ordered.push(l);
  }

  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap items-center gap-2 rounded-[12px] border border-line bg-surface p-3">
        {ordered.map((l, i) => (
          <li key={l.id} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] tracking-[0.04em]",
                l.status === "done" && "bg-accent-soft text-accent-ink",
                l.status === "error" && "bg-danger-soft text-danger",
                l.status === "running" && "bg-warn-soft text-warn-ink",
                l.status !== "done" &&
                  l.status !== "error" &&
                  l.status !== "running" &&
                  "border border-line bg-bg-2 text-muted",
              )}
            >
              <BulletIcon status={l.status} />
              {AGENT_LABEL[l.agent] ?? l.agent}
            </span>
            {i < ordered.length - 1 && (
              <span className="text-muted-2" aria-hidden>
                →
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <div className="grid grid-cols-[28px_minmax(0,1fr)_120px_auto] gap-3 border-b border-line bg-bg-2 px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.05em] text-muted">
          <span></span>
          <span>Agent</span>
          <span>Statut</span>
          <span className="text-right">Durée</span>
        </div>
        {ordered.map((l, i) => (
          <div
            key={l.id}
            className="grid grid-cols-[28px_minmax(0,1fr)_120px_auto] items-center gap-3 px-4 py-3"
            style={i > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
          >
            <Icon status={l.status} />
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium">
                {AGENT_LABEL[l.agent] ?? l.agent}
              </div>
              {l.message && (
                <div
                  className={cn(
                    "mt-0.5 line-clamp-2 font-mono text-[11.5px]",
                    l.status === "error" ? "text-danger" : "text-muted",
                  )}
                >
                  {l.message}
                </div>
              )}
            </div>
            <div className="font-mono text-[11px] text-ink-2 uppercase tracking-[0.04em]">
              {l.status}
            </div>
            <div className="text-right font-mono text-[11px] text-muted">
              {l.duration ? `${l.duration} ms` : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BulletIcon({ status }: { status: string }) {
  if (status === "done") return <Check className="h-2.5 w-2.5" strokeWidth={3} />;
  if (status === "error") return <AlertTriangle className="h-2.5 w-2.5" />;
  if (status === "running")
    return (
      <span className="block h-2 w-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
    );
  return <Clock className="h-2.5 w-2.5" />;
}

function Icon({ status }: { status: string }) {
  if (status === "done")
    return (
      <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-accent-ink">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  if (status === "error")
    return (
      <span className="grid h-7 w-7 place-items-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="h-3.5 w-3.5" />
      </span>
    );
  if (status === "running")
    return (
      <span className="grid h-7 w-7 place-items-center rounded-full bg-warn-soft text-warn-ink">
        <span className="block h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </span>
    );
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full border border-line text-muted">
      <Clock className="h-3.5 w-3.5" />
    </span>
  );
}
