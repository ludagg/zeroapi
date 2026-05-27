import { Crown, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { initials, requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { InviteButton } from "@/components/members/invite-button";
import { RemoveButton } from "@/components/members/remove-button";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const user = await requireUser();

  const owner = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, name: true, plan: true, createdAt: true },
  });

  const members = await prisma.teamMember.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!owner) return null;

  const locked = owner.plan === "FREE";

  return (
    <>
      <DashboardHeader
        crumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Membres" },
        ]}
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-7">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-[34px] leading-[1.05] tracking-[-0.01em] sm:text-[44px] sm:leading-none">
                Ton <em className="italic">équipe</em>.
              </h1>
              <p className="mt-2 text-[14.5px] text-muted">
                {members.length + 1} membre{members.length > 0 ? "s" : ""} · plan {owner.plan}
              </p>
            </div>
            <InviteButton plan={owner.plan} />
          </header>

          {locked && (
            <div className="mb-5 rounded-[12px] border border-line bg-bg-2 px-4 py-3 text-[13px] text-muted">
              Le plan <b className="text-ink">FREE</b> est limité à un seul utilisateur. Passe à
              Pro pour inviter des coéquipiers.
            </div>
          )}

          <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
            <Row
              avatar={initials(owner.name ?? owner.email)}
              name={owner.name ?? owner.email.split("@")[0]}
              email={owner.email}
              role="owner"
              joined={owner.createdAt}
            />
            {members.map((m) => (
              <Row
                key={m.id}
                memberId={m.id}
                avatar={initials(m.email)}
                name={m.email.split("@")[0]}
                email={m.email}
                role={m.role === "admin" ? "admin" : "member"}
                joined={m.createdAt}
              />
            ))}

            {members.length === 0 && !locked && (
              <div className="border-t border-line px-4 py-8 text-center">
                <Users className="mx-auto mb-2 h-4 w-4 text-muted-2" />
                <p className="text-[13.5px] text-muted">
                  Pas encore de coéquipier. Invite quelqu&apos;un pour commencer.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({
  avatar,
  name,
  email,
  role,
  joined,
  memberId,
}: {
  avatar: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  joined: Date;
  memberId?: string;
}) {
  const ROLE_LABEL = { owner: "OWNER", admin: "ADMIN", member: "MEMBRE" } as const;
  const ROLE_CLASS = {
    owner: "bg-accent text-accent-ink",
    admin: "bg-bg-3 text-ink",
    member: "border border-line bg-bg-2 text-muted",
  } as const;

  return (
    <div
      className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-3.5 py-3.5 last:border-b-0 sm:gap-4 sm:px-4 sm:grid-cols-[36px_minmax(0,1fr)_140px_140px_44px]"
    >
      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#2A6FDB] to-accent font-mono text-[12px] font-semibold text-accent-ink">
        {avatar}
      </div>

      <div className="min-w-0">
        <div className="truncate text-[14px] font-semibold">{name}</div>
        <div className="mt-0.5 truncate font-mono text-[11.5px] text-muted">{email}</div>
      </div>

      <span
        className={
          "hidden self-center justify-self-start rounded-full px-2.5 py-1 font-mono text-[10.5px] tracking-[0.04em] sm:inline-flex sm:items-center sm:gap-1.5 " +
          ROLE_CLASS[role]
        }
      >
        {role === "owner" && <Crown className="h-3 w-3" />}
        {ROLE_LABEL[role]}
      </span>

      <div className="hidden font-mono text-[11.5px] text-muted sm:block">
        {role === "owner" ? "créateur" : `ajouté ${formatRelativeTime(joined)}`}
      </div>

      <div className="justify-self-end">
        {role !== "owner" && memberId && <RemoveButton id={memberId} email={email} />}
      </div>
    </div>
  );
}
