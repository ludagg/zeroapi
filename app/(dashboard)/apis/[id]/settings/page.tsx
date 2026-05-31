import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { ApiSubnav } from "@/components/api-detail/api-subnav";
import { VariablesPanel } from "@/components/api-detail/variables-panel";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function ApiSettingsPage({ params }: { params: { id: string } }) {
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
          { label: "Workspace", href: "/dashboard" },
          { label: "APIs", href: "/jobs" },
          { label: job.name, href: `/apis/${job.id}` },
          { label: "Variables" },
        ]}
      />

      <PageContainer width="narrow">
        <Link
          href={`/apis/${job.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-[12px] text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" />
          Retour à l&apos;aperçu
        </Link>

        <PageHeader
          title={<>Variables de <em>{job.name}</em>.</>}
          description="Chaque API a ses propres variables, isolées et chiffrées au repos (AES-256-GCM)."
        />

        <ApiSubnav id={job.id} />

        <VariablesPanel jobId={job.id} />
      </PageContainer>
    </>
  );
}
