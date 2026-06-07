import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { ProfileCard, SettingsCard } from "@/components/settings/profile-card";
import { PasswordCard } from "@/components/settings/password-card";
import { NotificationsCard } from "@/components/settings/notifications-card";
import { ApiKeysCard } from "@/components/settings/api-keys-card";
import { PublishedTemplatesCard } from "@/components/settings/published-templates-card";
import { DangerCard } from "@/components/settings/danger-card";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const t = useTranslations("dashboard");
  const user = await requireUser();
  const [account, apiKeys, publishedTemplates] = await Promise.all([
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
    prisma.template.findMany({
      where: { authorId: user.id, isOfficial: false, visibility: "PUBLIC" },
      orderBy: { usageCount: "desc" },
      select: { id: true, title: true, category: true, emoji: true, usageCount: true },
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

  const planDescKey = `settings.plan.descriptions.${account.plan.toLowerCase()}` as "settings.plan.descriptions.free";

  return (
    <>
      <DashboardHeader
        crumbs={[
          { label: t("header.workspace"), href: "/dashboard" },
          { label: t("nav.settings") },
        ]}
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-7">
          <header className="mb-6">
            <h1 className="font-serif text-[34px] leading-[1.05] tracking-[-0.01em] sm:text-[44px] sm:leading-none">
              {t.rich("settings.pageTitle", { em: (chunks) => <em className="italic">{chunks}</em> })}
            </h1>
            <p className="mt-2 text-[14.5px] text-muted">
              {t("settings.subtitle")}
            </p>
          </header>

          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4">
            <ProfileCard
              email={account.email}
              initial={{ name: account.name ?? "" }}
            />
            <PasswordCard />
            <SettingsCard
              title={t("settings.plan.title")}
              subtitle={t(planDescKey)}
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    {t("settings.plan.current")}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-2">
                    <span className="rounded-[6px] bg-accent px-2 py-0.5 font-mono text-[12px] font-medium text-accent-ink">
                      {account.plan}
                    </span>
                    <span className="text-[13px] text-muted">
                      {t("settings.plan.generationsUsed", {
                        used: account.generationsUsed,
                        limit: account.generationsLimit,
                      })}
                    </span>
                  </div>
                </div>
                <Link
                  href="/#pricing"
                  className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3.5 text-[13px] font-medium text-ink-2 transition hover:-translate-y-px hover:border-line-2"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("settings.plan.viewPlans")}
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
            <PublishedTemplatesCard templates={publishedTemplates} />
            <DangerCard email={account.email} />
          </div>
        </div>
      </div>
    </>
  );
}
