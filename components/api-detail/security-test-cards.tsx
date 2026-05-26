import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

const SCORE_COLOR: Record<string, string> = {
  A: "text-accent-ink bg-accent",
  B: "text-accent-ink bg-accent-soft",
  C: "text-warn-ink bg-warn-soft",
  D: "text-warn-ink bg-warn-soft",
  F: "text-danger bg-danger-soft",
};

export function SecurityCard({
  score,
  authStrategy,
  rbacRolesCount,
  rateLimit,
}: {
  score: string | null;
  authStrategy?: string;
  rbacRolesCount?: number;
  rateLimit?: { windowMs: number; max: number };
}) {
  const cls = score ? (SCORE_COLOR[score] ?? "text-ink bg-bg-2") : "text-muted bg-bg-2";
  return (
    <div className="rounded-[14px] border border-line bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-accent" />
        <h3 className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
          Score sécurité
        </h3>
      </div>
      <div className="flex items-baseline gap-3">
        <span
          className={`grid h-12 w-12 place-items-center rounded-[12px] font-serif text-[28px] leading-none ${cls}`}
        >
          {score ?? "—"}
        </span>
        <div className="text-[13px] text-muted">
          {authStrategy ? (
            <>
              <span className="font-mono uppercase text-ink-2">{authStrategy}</span>
              {rbacRolesCount ? ` + RBAC (${rbacRolesCount} rôle${rbacRolesCount > 1 ? "s" : ""})` : ""}
            </>
          ) : (
            <span>Pas d&apos;auth configurée</span>
          )}
          {rateLimit && (
            <div className="mt-1 font-mono text-[11.5px]">
              rate-limit {rateLimit.max}/{Math.round(rateLimit.windowMs / 1000)}s
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TestsCard({
  total,
  passed,
}: {
  total: number | null;
  passed: number | null;
}) {
  const hasData = total !== null && passed !== null && total > 0;
  const failed = hasData ? total - passed : 0;
  const percent = hasData ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="rounded-[14px] border border-line bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-accent" />
        <h3 className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
          Tests générés
        </h3>
      </div>
      {hasData ? (
        <>
          <div className="flex items-baseline gap-2 font-serif text-[28px] leading-none">
            {percent}%<span className="font-sans text-[12px] text-muted">passés</span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-[12.5px]">
            <span className="inline-flex items-center gap-1 text-accent-ink">
              <CheckCircle2 className="h-3 w-3" /> {passed} OK
            </span>
            <span
              className={
                "inline-flex items-center gap-1 " + (failed > 0 ? "text-danger" : "text-muted")
              }
            >
              <XCircle className="h-3 w-3" /> {failed} KO
            </span>
            <span className="ml-auto font-mono text-[11px] text-muted">{total} cas</span>
          </div>
          <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-bg-3">
            <div
              className="h-full bg-accent transition-[width] duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
        </>
      ) : (
        <p className="text-[13px] text-muted">Aucun test exécuté pour ce job.</p>
      )}
    </div>
  );
}
