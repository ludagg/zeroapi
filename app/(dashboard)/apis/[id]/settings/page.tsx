import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import { ApiSubnav } from "@/components/api-detail/api-subnav";
import { EnvVarForm } from "@/components/api-detail/env-var-form";
import { EnvVarRow, type EnvVarRowData } from "@/components/api-detail/env-var-row";
import { decryptSecret, maskSecret } from "@/lib/crypto-secrets";

export const dynamic = "force-dynamic";

export default async function ApiSettingsPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const job = await prisma.job.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true, name: true },
  });
  if (!job) notFound();

  const vars = await prisma.envVariable.findMany({
    where: { jobId: job.id },
    orderBy: [{ managed: "desc" }, { key: "asc" }],
  });

  const rows: EnvVarRowData[] = await Promise.all(
    vars.map(async (v) => {
      let clear: string | null = null;
      try {
        clear = await decryptSecret(v.value);
      } catch {
        clear = null;
      }
      return {
        id: v.id,
        jobId: v.jobId,
        key: v.key,
        masked: clear ? maskSecret(clear) : "••••••••",
        clear,
        managed: v.managed,
        createdAt: v.createdAt.toISOString(),
      };
    }),
  );

  const customs = rows.filter((r) => !r.managed);
  const managed = rows.filter((r) => r.managed);

  return (
    <>
      <DashboardHeader
        crumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "APIs", href: "/jobs" },
          { label: job.name, href: `/apis/${job.id}` },
          { label: "Paramètres" },
        ]}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-[920px] px-6 py-7 lg:px-8">
          <Link
            href={`/apis/${job.id}`}
            className="mb-3 inline-flex items-center gap-1.5 text-[12px] text-muted transition hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" />
            Retour à l&apos;aperçu
          </Link>

          <h1 className="mb-1 font-serif text-[36px] leading-none tracking-[-0.01em]">
            Paramètres de <em className="italic">{job.name}</em>.
          </h1>
          <p className="mb-6 text-[14px] text-muted">
            Variables d&apos;environnement chiffrées au repos (AES-256-GCM).
          </p>

          <ApiSubnav id={job.id} />

          <section className="mb-6 overflow-hidden rounded-[14px] border border-line bg-surface">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[14px] font-semibold">Ajouter une variable</h2>
              <p className="mt-0.5 text-[12px] text-muted">
                La valeur est chiffrée avant d&apos;être stockée. Personne ne peut la lire en clair
                en base.
              </p>
            </header>
            <div className="p-4">
              <EnvVarForm jobId={job.id} />
            </div>
          </section>

          <section className="mb-6 overflow-hidden rounded-[14px] border border-line bg-surface">
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold">
                Tes variables
                <span className="rounded-full bg-bg-3 px-1.5 py-px font-mono text-[10.5px] font-medium text-muted">
                  {customs.length}
                </span>
              </h2>
            </header>
            {customs.length === 0 ? (
              <div className="px-4 py-10 text-center text-[13px] text-muted">
                Aucune variable personnalisée pour l&apos;instant.
              </div>
            ) : (
              <div>
                {customs.map((row) => (
                  <EnvVarRow key={row.id} row={row} />
                ))}
              </div>
            )}
          </section>

          {managed.length > 0 && (
            <section className="overflow-hidden rounded-[14px] border border-line bg-surface">
              <header className="flex items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <h2 className="flex items-center gap-2 text-[14px] font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                    Variables gérées par ZeroAPI
                    <span className="rounded-full bg-bg-3 px-1.5 py-px font-mono text-[10.5px] font-medium text-muted">
                      {managed.length}
                    </span>
                  </h2>
                  <p className="mt-0.5 text-[12px] text-muted">
                    Rotation automatique · lecture seule.
                  </p>
                </div>
              </header>
              <div>
                {managed.map((row) => (
                  <EnvVarRow key={row.id} row={row} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
