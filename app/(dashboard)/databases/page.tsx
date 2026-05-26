import Link from "next/link";
import { ArrowRight, Database as DatabaseIcon, ExternalLink, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { formatNumber, formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

export default async function DatabasesPage() {
  const user = await requireUser();
  const dbs = await prisma.database.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { job: { select: { name: true, status: true } } },
  });

  return (
    <>
      <DashboardHeader
        crumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Bases de données" },
        ]}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-6 py-7 lg:px-7">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-[44px] leading-none tracking-[-0.01em]">
                Tes <em className="italic">bases de données</em>.
              </h1>
              <p className="mt-2 text-[14.5px] text-muted">
                {dbs.length} base{dbs.length > 1 ? "s" : ""} · une par API générée
              </p>
            </div>
          </header>

          {dbs.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-line-2 bg-surface px-6 py-12 text-center">
              <DatabaseIcon className="mx-auto mb-3 h-5 w-5 text-muted-2" />
              <p className="font-serif text-[26px] leading-tight">
                Aucune base <em className="italic">pour l&apos;instant</em>.
              </p>
              <p className="mt-2 text-muted">
                Une base est créée automatiquement pour chaque API prête.
              </p>
              <Link href="/generate" className="btn-primary-accent mt-5 inline-flex">
                Générer une API
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dbs.map((d) => {
                const isOnline = d.status === "online";
                return (
                  <Link
                    key={d.id}
                    href={`/databases/${d.id}`}
                    className="group overflow-hidden rounded-[14px] border border-line bg-surface transition hover:-translate-y-px hover:border-line-2 hover:shadow-md"
                  >
                    <header className="flex items-center justify-between border-b border-line bg-bg-2 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <DatabaseIcon className="h-3.5 w-3.5 text-muted" />
                        <span className="font-mono text-[12px] font-medium">{d.name}</span>
                      </div>
                      <span
                        className={
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.04em] " +
                          (isOnline
                            ? "bg-accent-soft text-accent-ink"
                            : "bg-danger-soft text-danger")
                        }
                      >
                        <span
                          className={
                            "h-1.5 w-1.5 rounded-full " +
                            (isOnline ? "bg-accent" : "bg-danger")
                          }
                          style={
                            isOnline
                              ? { boxShadow: "0 0 0 3px var(--accent-glow)" }
                              : undefined
                          }
                        />
                        {isOnline ? "EN LIGNE" : "HORS LIGNE"}
                      </span>
                    </header>

                    <div className="px-4 py-3.5">
                      <div className="grid grid-cols-3 gap-3">
                        <Stat label="Tables" value={d.tables != null ? formatNumber(d.tables) : "—"} />
                        <Stat label="Taille" value={formatSize(d.sizeBytes)} />
                        <Stat
                          label="Provider"
                          value={PROVIDER_LABEL[d.provider] ?? d.provider}
                          mono
                        />
                      </div>

                      <div className="mt-3.5 flex items-center justify-between border-t border-dashed border-line pt-3 text-[12px] text-muted">
                        <Link
                          href={`/apis/${d.jobId}`}
                          className="inline-flex items-center gap-1 transition hover:text-ink"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                          {d.job.name}
                        </Link>
                        <span className="font-mono text-[11px]">
                          créée {formatRelativeTime(d.createdAt)}
                        </span>
                      </div>

                      {d.managed && (
                        <div className="mt-2 inline-flex items-center gap-1 font-mono text-[10.5px] text-muted-2">
                          <Lock className="h-2.5 w-2.5" />
                          gérée par ZeroAPI
                        </div>
                      )}

                      <div className="mt-3.5 flex items-center justify-end font-mono text-[11px] text-muted opacity-0 transition group-hover:opacity-100">
                        Détails <ArrowRight className="ml-1 h-3 w-3" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div
        className={
          "mt-1 text-[14.5px] " + (mono ? "font-mono text-[12.5px]" : "font-serif tracking-[-0.01em]")
        }
      >
        {value}
      </div>
    </div>
  );
}
