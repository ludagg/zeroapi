import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { ApiSubnav } from "@/components/api-detail/api-subnav";
import { VariablesPanel } from "@/components/api-detail/variables-panel";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

export default async function ApiSettingsPage({ params }: { params: { id: string } }) {
  const t = useTranslations("dashboard");
  const user = await requireUser();
  const job = await prisma.job.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true, name: true },
  });
  if (!job) notFound();

  return (
    <>
      <DashboardHeader
        crumbs={[
          { label: t("header.workspace"), href: "/dashboard" },
          { label: t("apis.crumbApis"), href: "/jobs" },
          { label: job.name, href: `/apis/${job.id}` },
          { label: t("apis.tabVariables") },
        ]}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-[920px] px-6 py-7 lg:px-8">
          <Link
            href={`/apis/${job.id}`}
            className="mb-3 inline-flex items-center gap-1.5 text-[12px] text-muted transition hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" />
            {t("apis.backToOverview")}
          </Link>

          <h1 className="mb-1 font-serif text-[36px] leading-none tracking-[-0.01em]">
            {t("apis.variablesTitle", { name: job.name })}
          </h1>
          <p className="mb-6 text-[14px] text-muted">
            {t("apis.variablesSubtitle")}
          </p>

          <ApiSubnav id={job.id} />

          <VariablesPanel jobId={job.id} />
        </div>
      </div>
    </>
  );
}
