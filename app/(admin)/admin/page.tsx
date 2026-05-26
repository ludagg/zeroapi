import { prisma } from "@/lib/prisma";
import { formatNumber } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const [users, jobs, deployments, runningJobs, failedJobs] = await Promise.all([
    prisma.user.count(),
    prisma.job.count(),
    prisma.deployment.count(),
    prisma.job.count({ where: { status: "RUNNING" } }),
    prisma.job.count({ where: { status: "FAILED" } }),
  ]);

  const cards = [
    { label: "Utilisateurs", value: users, hint: "comptes créés" },
    { label: "Jobs totaux", value: jobs, hint: "tous statuts confondus" },
    { label: "Jobs en cours", value: runningJobs, hint: "génération active" },
    { label: "Déploiements", value: deployments, hint: "lifetime" },
    { label: "Échecs", value: failedJobs, hint: "à investiguer" },
  ];

  return (
    <>
      <header className="mb-7">
        <h1 className="font-serif text-[44px] leading-none tracking-[-0.01em]">
          Vue d&apos;<em className="italic">ensemble</em>.
        </h1>
        <p className="mt-2 text-muted">État global de la plateforme.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-[12px] border border-line bg-surface p-4 transition hover:border-line-2"
          >
            <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
              {c.label}
            </div>
            <div className="mt-2 font-serif text-[36px] leading-none tracking-[-0.01em]">
              {formatNumber(c.value)}
            </div>
            <div className="mt-1.5 text-[12px] text-muted">{c.hint}</div>
          </div>
        ))}
      </div>
    </>
  );
}
