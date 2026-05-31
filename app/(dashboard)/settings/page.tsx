import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { ProfileCard, SettingsCard } from "@/components/settings/profile-card";
import { PasswordCard } from "@/components/settings/password-card";
import { NotificationsCard } from "@/components/settings/notifications-card";
import { ApiKeysCard } from "@/components/settings/api-keys-card";
import { DangerCard } from "@/components/settings/danger-card";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

const PLAN_DESCRIPTION: Record<string, string> = {
  FREE: "3 générations par mois — sans paiement",
  STARTER: "20 générations par mois",
  PRO: "100 générations · bases dédiées · membres illimités",
  BUSINESS: "Illimité · support prioritaire · SLA 99,9 %",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const [account, apiKeys] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        name: true,
        plan: true,
        generationsUsed: true,
        generationsLimit: true,
        notifyOnReady: true,
        notifyOnFailed: true,
      },
    }),
    prisma.personalApiKey.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
    }),
  ]);

  if (!account) {
    return null;
  }

  const initialKeys = apiKeys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    createdAt: k.createdAt.toISOString(),
  }));

  return (
    <>
      <DashboardHeader
        crumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Paramètres" },
        ]}
      />
      <PageContainer width="narrow">
        <PageHeader
          title={
            <>
              Tes <em>paramètres</em>.
            </>
          }
          description="Profil, sécurité, notifications et plan."
        />

        <div className="grid grid-cols-1 gap-4">
            <ProfileCard
              email={account.email}
              initial={{ name: account.name ?? "" }}
            />
            <PasswordCard />
            <SettingsCard
              title="Plan"
              subtitle={PLAN_DESCRIPTION[account.plan] ?? "Plan personnalisé."}
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    Plan actuel
                  </div>
                  <div className="mt-1 inline-flex items-center gap-2">
                    <span className="rounded-[6px] bg-accent px-2 py-0.5 font-mono text-[12px] font-medium text-accent-ink">
                      {account.plan}
                    </span>
                    <span className="text-[13px] text-muted">
                      {account.generationsUsed} / {account.generationsLimit} générations utilisées
                    </span>
                  </div>
                </div>
                <Link
                  href="/#pricing"
                  className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3.5 text-[13px] font-medium text-ink-2 transition hover:-translate-y-px hover:border-line-2"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Voir les plans
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </SettingsCard>
            <NotificationsCard
              initial={{
                notifyOnReady: account.notifyOnReady,
                notifyOnFailed: account.notifyOnFailed,
              }}
            />
            <ApiKeysCard initial={initialKeys} />
            <DangerCard email={account.email} />
        </div>
      </PageContainer>
    </>
  );
}
