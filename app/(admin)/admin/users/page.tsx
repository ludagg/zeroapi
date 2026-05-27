import { headers } from "next/headers";
import { Search } from "lucide-react";
import type { Plan, Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS, PLAN_ORDER } from "@/lib/plans";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import { UserRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

type Props = {
  searchParams?: { q?: string; plan?: string };
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await auth.api.getSession({ headers: headers() });
  const meId = session?.user.id ?? "";

  const rawQuery = (searchParams?.q ?? "").trim();
  const rawPlan = (searchParams?.plan ?? "").trim().toUpperCase();
  const planFilter: Plan | null = (PLAN_ORDER as string[]).includes(rawPlan)
    ? (rawPlan as Plan)
    : null;

  const where: Prisma.UserWhereInput = {
    ...(rawQuery
      ? {
          OR: [
            { email: { contains: rawQuery, mode: "insensitive" } },
            { name: { contains: rawQuery, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(planFilter ? { plan: planFilter } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
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
    }),
    prisma.user.count({ where }),
  ]);

  return (
    <>
      <header className="mb-6">
        <h1 className="font-serif text-[44px] leading-none tracking-[-0.01em]">
          <em className="italic">Utilisateurs</em>.
        </h1>
        <p className="mt-2 text-muted">
          {formatNumber(total)} compte{total > 1 ? "s" : ""}
          {users.length < total ? ` · ${users.length} affichés` : ""}
          {rawQuery || planFilter ? " · filtré" : ""}
        </p>
      </header>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            name="q"
            defaultValue={rawQuery}
            placeholder="Rechercher par email ou nom…"
            className="input-base h-10 w-full pl-9 text-[13px]"
          />
        </label>
        <select
          name="plan"
          defaultValue={planFilter ?? ""}
          className="input-base h-10 px-2 font-mono text-[12px]"
        >
          <option value="">Tous les plans</option>
          {PLAN_ORDER.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-1.5 rounded-[9px] bg-ink px-3 text-[12.5px] font-medium text-bg transition hover:-translate-y-px"
        >
          Filtrer
        </button>
        {(rawQuery || planFilter) && (
          <a
            href="/admin/users"
            className="inline-flex h-10 items-center rounded-[9px] border border-line bg-surface px-3 text-[12.5px] font-medium text-ink-2 transition hover:border-line-2"
          >
            Réinitialiser
          </a>
        )}
      </form>

      <div className="overflow-x-auto overflow-y-visible rounded-[14px] border border-line bg-surface">
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
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{u.name ?? "—"}</span>
                    {u.id === meId && (
                      <span className="rounded-[5px] border border-line bg-bg-2 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.05em] text-muted">
                        toi
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11.5px] text-muted">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <RolePill role={u.role} />
                </td>
                <td className="px-4 py-3">
                  <PlanPill plan={u.plan} />
                </td>
                <td className="px-4 py-3 font-mono text-[12px]">
                  <span
                    className={
                      u.generationsUsed >= u.generationsLimit
                        ? "text-danger"
                        : "text-ink-2"
                    }
                  >
                    {u.generationsUsed}
                  </span>
                  <span className="text-muted"> / {u.generationsLimit}</span>
                </td>
                <td className="px-4 py-3 font-mono text-[12px]">{u._count.jobs}</td>
                <td className="px-4 py-3 text-muted">{formatRelativeTime(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <UserRowActions
                    userId={u.id}
                    email={u.email}
                    currentRole={u.role}
                    currentPlan={u.plan}
                    currentLimit={u.generationsLimit}
                    isSelf={u.id === meId}
                  />
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

function PlanPill({ plan }: { plan: Plan }) {
  const styles: Record<Plan, string> = {
    FREE: "border border-line bg-bg-2 text-muted",
    STARTER: "border border-line bg-surface text-ink-2",
    PRO: "bg-accent-soft text-accent-ink",
    BUSINESS: "bg-ink text-bg",
  };
  return (
    <span
      className={
        "rounded-[5px] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] " +
        styles[plan]
      }
      title={`${PLAN_LIMITS[plan].generations} gén · ${PLAN_LIMITS[plan].priceEUR}€`}
    >
      {plan}
    </span>
  );
}
