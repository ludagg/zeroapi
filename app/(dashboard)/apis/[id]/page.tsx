import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { ApiSubnav } from "@/components/api-detail/api-subnav";
import { DeployButtons } from "@/components/api-detail/deploy-buttons";
import { DownloadButton } from "@/components/api-detail/download-button";
import { OpenApiEndpoints } from "@/components/api-detail/openapi-endpoints";
import { SecurityCard, TestsCard } from "@/components/api-detail/security-test-cards";
import { PageContainer } from "@/components/ui/page-container";
import { StatusPill } from "@/components/ui/status-pill";
import { buildDeployConfigs, buildOpenApiSpec, listEndpointsFromOpenApi } from "@/lib/api-detail";
import { extractAuthMode, extractVersion, readSpec } from "@/lib/job-helpers";
import type { Job } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ApiDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const job = await prisma.job.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!job) notFound();

  const spec = readSpec(job.spec);
  const isReady = job.status === "READY" || job.status === "DEPLOYED";

  const openApiEndpoints = spec ? listEndpointsFromOpenApi(buildOpenApiSpec(spec)) : [];
  const deployTargets = spec ? buildDeployConfigs(spec) : [];

  return (
    <>
      <DashboardHeader
        crumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "APIs", href: "/jobs" },
          { label: job.name },
        ]}
      />

      <PageContainer width="default">
          <Link
            href={`/jobs/${job.id}`}
            className="mb-3 inline-flex items-center gap-1.5 text-[12px] text-muted transition hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" />
            Voir la progression du job
          </Link>

          <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-serif text-[32px] leading-[1.05] tracking-[-0.01em] sm:text-[42px] sm:leading-none break-words">
                  {job.name}
                </span>
                <span className="rounded-[5px] border border-line bg-bg-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">
                  {extractVersion(job)}
                </span>
                <StatusPill status={job.status} className="ml-1" />
              </div>
              <p className="mt-2 max-w-2xl text-[14.5px] text-muted">{job.description}</p>
            </div>
            <DownloadButton jobId={job.id} disabled={!isReady} />
          </div>

          <ApiSubnav id={job.id} />

          {!spec ? (
            <div className="rounded-[14px] border border-dashed border-line-2 bg-surface p-10 text-center text-muted">
              La spec n&apos;est pas encore prête.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <section className="lg:col-span-2 space-y-5">
                <div>
                  <h2 className="mb-2.5 flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]">
                    Endpoints générés
                    <span className="rounded-full bg-bg-3 px-1.5 py-px font-mono text-[10.5px] text-muted">
                      {openApiEndpoints.length}
                    </span>
                  </h2>
                  <OpenApiEndpoints endpoints={openApiEndpoints} />
                </div>

                <div>
                  <h2 className="mb-2.5 text-[15px] font-semibold tracking-[-0.01em]">
                    Déployer en un clic
                  </h2>
                  <p className="mb-3 text-[12.5px] text-muted">
                    Choisis ta cible pour voir la configuration générée et la copier.
                  </p>
                  <DeployButtons targets={deployTargets} />
                </div>
              </section>

              <aside className="space-y-4">
                <SecurityCard
                  score={job.securityScore}
                  authStrategy={extractAuthMode(spec as unknown as Job["spec"]) ?? undefined}
                  rbacRolesCount={spec.roles?.length}
                  rateLimit={spec.rateLimit}
                />
                <TestsCard total={job.testsTotal} passed={job.testsPassed} />

                {job.status === "FAILED" && job.errorMessage && (
                  <div className="rounded-[14px] border border-danger/30 bg-danger-soft p-4 text-[13px] text-danger">
                    {job.errorMessage}
                  </div>
                )}
              </aside>
            </div>
          )}
      </PageContainer>
    </>
  );
}
