import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";

export default async function AdminJobsPage() {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true, name: true } } },
  });

  return (
    <>
      <PageHeader
        title={<><em>Jobs</em>.</>}
        description={`${jobs.length} jobs récents · tous comptes confondus`}
      />

      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <table className="w-full text-[13.5px]">
          <thead className="bg-bg-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Nom</th>
              <th className="px-4 py-3 text-left font-medium">Propriétaire</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
              <th className="px-4 py-3 text-left font-medium">Endpoints</th>
              <th className="px-4 py-3 text-left font-medium">Créé</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-line hover:bg-bg">
                <td className="px-4 py-3">
                  <Link href={`/jobs/${j.id}`} className="font-medium hover:underline">
                    {j.name}
                  </Link>
                  <div className="line-clamp-1 text-[11.5px] text-muted">{j.description}</div>
                </td>
                <td className="px-4 py-3 font-mono text-[11.5px] text-muted">
                  {j.user.name ?? j.user.email}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={j.status} />
                </td>
                <td className="px-4 py-3 font-mono text-[12px]">{j.endpoints ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{formatRelativeTime(j.createdAt)}</td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  Aucun job.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
