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
  clarifier: "Clarificateur",
  orchestrator: "Orchestrateur",
  code: "Génération du code",
  security: "Audit de sécurité",
  tests: "Suite de tests",
  upload: "Upload du ZIP",
};

export function AgentsProgress({ logs }: { logs: Log[] }) {
  // dedup par agent en gardant le dernier
  const byAgent = new Map<string, Log>();
  for (const l of logs) byAgent.set(l.agent, l);
  const ordered = ["clarifier", "orchestrator", "code", "security", "tests", "upload"];
  const items = ordered
    .map((a) => byAgent.get(a))
    .filter(Boolean) as Log[];

  if (!items.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-2 bg-surface p-10 text-center text-muted">
        Le pipeline n&apos;a pas encore démarré.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      {items.map((l, i) => (
        <div
          key={l.id}
          className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
          style={i > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
        >
          <Icon status={l.status} />
          <div>
            <div className="text-[13.5px] font-medium">
              {AGENT_LABEL[l.agent] ?? l.agent}
            </div>
            {l.message && (
              <div
                className={cn(
                  "mt-0.5 line-clamp-1 font-mono text-[11.5px]",
                  l.status === "error" ? "text-danger" : "text-muted",
                )}
              >
                {l.message}
              </div>
            )}
          </div>
          <div className="font-mono text-[11px] text-muted">
            {l.duration ? `${l.duration} ms` : "—"}
          </div>
        </div>
      ))}
    </div>
  );
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
