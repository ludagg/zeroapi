import { Clock, Database as DatabaseIcon, Lock, Zap } from "lucide-react";
import Link from "next/link";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { DangerActions } from "@/components/databases/danger-actions";
import { ExportButton } from "@/components/databases/export-button";
import { ConnectionString } from "@/components/databases/connection-string";
import { listTables, liveStatsFor } from "@/lib/db-tables";
import { formatNumber, formatRelativeTime } from "@/lib/utils";

const PROVIDER_LABEL: Record<string, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
  mongodb: "MongoDB",
};

function formatSize(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export type DatabasePanelData = {
  id: string;
  name: string;
  provider: string;
  sizeBytes: number | null;
  tables: number | null;
  status: string;
  managed: boolean;
  jobId: string;
  updatedAt: Date;
};

/**
 * The database view, embedded as a tab in the job page (the standalone
 * /databases pages were retired in favour of this). Pro/Business unlock the
 * live stats; Free sees the connection string instead.
 */
export function DatabasePanel({
  db,
  spec,
  plan,
}: {
  db: DatabasePanelData;
  spec: ZeroAPISpec | null;
  plan: string;
}) {
  const tables = spec ? listTables(spec) : [];
  const isOnline = db.status === "online";
  const isPro = plan === "PRO" || plan === "BUSINESS";
  const live = isPro ? liveStatsFor(db.id) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <DatabaseIcon className="h-5 w-5 text-muted" />
          <span className="font-mono text-[15px] font-medium">{db.name}</span>
          <span
            className={
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] tracking-[0.04em] " +
              (isOnline ? "bg-accent-soft text-accent-ink" : "bg-danger-soft text-danger")
            }
          >
            <span
              className={"h-1.5 w-1.5 rounded-full " + (isOnline ? "bg-accent" : "bg-danger")}
              style={isOnline ? { boxShadow: "0 0 0 3px var(--accent-glow)" } : undefined}
            />
            {isOnline ? "EN LIGNE" : "HORS LIGNE"}
          </span>
          {db.managed && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-2">
              <Lock className="h-2.5 w-2.5" /> gérée
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton jobId={db.jobId} />
          <DangerActions dbId={db.id} dbName={db.name} managed={db.managed} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Provider" value={PROVIDER_LABEL[db.provider] ?? db.provider} icon={<DatabaseIcon className="h-3 w-3" />} />
        <StatCard label="Taille" value={formatSize(db.sizeBytes)} icon={<DatabaseIcon className="h-3 w-3" />} />
        {isPro ? (
          <>
            <StatCard
              label="Requêtes / jour"
              value={live ? formatNumber(live.requestsPerDay) : "—"}
              icon={<Zap className="h-3 w-3" />}
            />
            <StatCard
              label="Temps moy."
              value={live ? `${live.avgResponseMs} ms` : "—"}
              hint={live ? `p99 ${live.p99Ms} ms` : undefined}
              icon={<Clock className="h-3 w-3" />}
            />
          </>
        ) : (
          <>
            <StatCard label="Requêtes / jour" value="Pro" hint="upgrade pour voir" icon={<Zap className="h-3 w-3" />} locked />
            <StatCard label="Temps moy." value="Pro" hint="upgrade pour voir" icon={<Clock className="h-3 w-3" />} locked />
          </>
        )}
      </div>

      {!isPro && (
        <section className="overflow-hidden rounded-[14px] border border-line bg-surface">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h3 className="text-[14px] font-semibold">Connexion à la base</h3>
              <p className="mt-0.5 text-[12px] text-muted">
                Plan {plan} · stats temps réel réservées au plan Pro et au-delà.
              </p>
            </div>
            <Link
              href="/settings/billing"
              className="inline-flex h-8 items-center rounded-[8px] bg-accent px-3 text-[12px] font-medium text-accent-ink transition hover:-translate-y-px"
            >
              Passer Pro
            </Link>
          </header>
          <div className="p-4">
            <ConnectionString dbName={db.name} />
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold">
            Tables
            <span className="rounded-full bg-bg-3 px-1.5 py-px font-mono text-[10.5px] font-medium text-muted">
              {tables.length}
            </span>
          </h3>
          <span className="font-mono text-[11px] text-muted">
            Mis à jour {formatRelativeTime(db.updatedAt)}
          </span>
        </header>

        {tables.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted">
            Pas encore de table — la spec du job n&apos;est pas disponible.
          </div>
        ) : (
          <table className="w-full text-[13.5px]">
            <thead className="bg-bg-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Table</th>
                <th className="px-4 py-2.5 text-left font-medium">Origine</th>
                <th className="px-4 py-2.5 text-right font-medium">Colonnes</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  {isPro ? "Lignes" : "Lignes (Pro)"}
                </th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.name} className="border-t border-line hover:bg-bg">
                  <td className="px-4 py-2.5 font-mono text-[13px] font-medium">{t.name}</td>
                  <td className="px-4 py-2.5">
                    <OriginPill origin={t.origin} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[12.5px]">{t.columns}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[12.5px]">
                    {isPro ? formatNumber(t.estimatedRows) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  locked,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <div
      className={
        "rounded-[12px] border bg-surface p-4 " +
        (locked ? "border-dashed border-line-2 opacity-70" : "border-line")
      }
    >
      <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
        {label}
        <span className="text-muted-2">{icon}</span>
      </div>
      <div className="mt-2 font-serif text-[28px] leading-none tracking-[-0.01em]">{value}</div>
      {hint && <div className="mt-1 font-mono text-[10.5px] text-muted">{hint}</div>}
    </div>
  );
}

function OriginPill({ origin }: { origin: "resource" | "join" | "auth" }) {
  if (origin === "resource")
    return (
      <span className="rounded-[5px] bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-accent-ink">
        ressource
      </span>
    );
  if (origin === "join")
    return (
      <span className="rounded-[5px] bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-ink-2">
        jointure
      </span>
    );
  return (
    <span className="rounded-[5px] border border-line bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-muted">
      auth
    </span>
  );
}
