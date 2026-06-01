import Link from "next/link";
import { ArrowRight, Database as DatabaseIcon, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { JobLinkChip } from "@/components/databases/job-link-chip";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
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

      <PageContainer width="default">
        <PageHeader
          title={
            <>
              Tes <em>bases de données</em>.
            </>
          }
          description={
            <>
              {dbs.length} base{dbs.length > 1 ? "s" : ""} · une par API générée
            </>
          }
        />

        {dbs.length === 0 ? (
          <EmptyState
            icon={<DatabaseIcon className="h-5 w-5" />}
            title={
              <>
                Aucune base <em>pour l&apos;instant</em>.
              </>
            }
            description="Une base est créée automatiquement pour chaque API prête."
            action={
              <Button href="/generate" variant="accent">
                Générer une API
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dbs.map((d) => {
                const isOnline = d.status === "online";
                return (
                  <Link
                    key={d.id}
                    href={`/databases/${d.id}`}
                    className="group overflow-hidden rounded-card border border-line bg-surface transition hover:-translate-y-px hover:border-line-2 hover:shadow-md"
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
                        <JobLinkChip jobId={d.jobId} jobName={d.job.name} />
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
      </PageContainer>
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
