import { prisma } from "@/lib/prisma";
import { UserRowActions } from "./row-actions";
import { formatRelativeTime } from "@/lib/utils";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      generationsUsed: true,
      generationsLimit: true,
      createdAt: true,
      _count: { select: { jobs: true } },
    },
  });

  return (
    <>
      <header className="mb-6">
        <h1 className="font-serif text-[44px] leading-none tracking-[-0.01em]">
          <em className="italic">Utilisateurs</em>.
        </h1>
        <p className="mt-2 text-muted">{users.length} comptes récents</p>
      </header>

      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <table className="w-full text-[13.5px]">
          <thead className="bg-bg-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Utilisateur</th>
              <th className="px-4 py-3 text-left font-medium">Rôle</th>
              <th className="px-4 py-3 text-left font-medium">Plan</th>
              <th className="px-4 py-3 text-left font-medium">Gen.</th>
              <th className="px-4 py-3 text-left font-medium">Jobs</th>
              <th className="px-4 py-3 text-left font-medium">Inscrit</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-line hover:bg-bg">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.name ?? "—"}</div>
                  <div className="font-mono text-[11.5px] text-muted">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <RolePill role={u.role} />
                </td>
                <td className="px-4 py-3 font-mono text-[11.5px]">{u.plan}</td>
                <td className="px-4 py-3 font-mono text-[12px]">
                  {u.generationsUsed} / {u.generationsLimit}
                </td>
                <td className="px-4 py-3 font-mono text-[12px]">{u._count.jobs}</td>
                <td className="px-4 py-3 text-muted">{formatRelativeTime(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <UserRowActions userId={u.id} currentRole={u.role} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  Aucun utilisateur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RolePill({ role }: { role: "USER" | "ADMIN" }) {
  if (role === "ADMIN") {
    return (
      <span className="rounded-[5px] bg-danger px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-white">
        admin
      </span>
    );
  }
  return (
    <span className="rounded-[5px] border border-line bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-muted">
      user
    </span>
  );
}
