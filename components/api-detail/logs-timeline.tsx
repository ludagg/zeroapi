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

const LEVEL: Record<string, { label: string; cls: string }> = {
  done: { label: "OK  ", cls: "text-accent" },
  running: { label: "INFO", cls: "text-[#79B8FF]" },
  pending: { label: "WAIT", cls: "text-[#FFCC66]" },
  error: { label: "ERR ", cls: "text-[#FF8A8A]" },
};

function formatTime(d: Date): string {
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}.${ms}`;
}

export function LogsTimeline({ logs }: { logs: Log[] }) {
  if (!logs.length) {
    return (
      <div className="overflow-hidden rounded-[14px] border border-line bg-[#0E100E]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
          <h3 className="font-mono text-[12px] text-[#E5E7E3]">Logs · pipeline</h3>
        </div>
        <div className="px-5 py-8 text-center font-mono text-[12px] text-[#6A6E66]">
          -- aucune ligne de log pour ce job
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-[#0E100E]">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
        <h3 className="font-mono text-[12px] text-[#E5E7E3]">Logs · pipeline</h3>
        <span className="rounded-[6px] bg-white/5 px-2.5 py-1 font-mono text-[10.5px] text-[#6A6E66]">
          {logs.length} entrée{logs.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="max-h-[460px] overflow-y-auto px-5 py-4 font-mono text-[12px] leading-[1.75] scrollbar-thin">
        {logs.map((l) => {
          const lvl = LEVEL[l.status] ?? LEVEL.pending;
          const agentLabel = AGENT_LABEL[l.agent] ?? l.agent;
          return (
            <div key={l.id} className="flex gap-3">
              <span className="flex-shrink-0 text-[#6A6E66]">
                {formatTime(l.createdAt)}
              </span>
              <span className={"w-12 flex-shrink-0 font-semibold " + lvl.cls}>
                {lvl.label}
              </span>
              <span className="min-w-0 flex-1 text-[#E5E7E3]">
                <b className="font-medium text-white">{agentLabel}</b>
                {l.message ? ` · ${l.message}` : ""}
                {l.duration ? (
                  <span className="text-[#6A6E66]"> ({l.duration}ms)</span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
