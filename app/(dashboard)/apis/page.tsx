import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import {
  PlaygroundConsole,
  type PlaygroundApi,
  type PlaygroundEndpoint,
} from "@/components/playground/playground-console";
import { buildOpenApiSpec, listEndpointsFromOpenApi } from "@/lib/api-detail";
import { readSpec } from "@/lib/job-helpers";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

function extractPathParams(path: string): string[] {
  const out: string[] = [];
  const re = /[:{]([a-zA-Z0-9_-]+)\}?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path))) out.push(m[1]);
  return Array.from(new Set(out));
}

export default async function PlaygroundPage() {
  const user = await requireUser();

  const jobs = await prisma.job.findMany({
    where: {
      userId: user.id,
      status: { in: ["READY", "DEPLOYED"] },
    },
    include: { deployment: true },
    orderBy: [{ updatedAt: "desc" }],
  });

  const apis: PlaygroundApi[] = jobs
    .map((job): PlaygroundApi | null => {
      const spec = readSpec(job.spec);
      if (!spec) return null;
      const openapi = buildOpenApiSpec(spec);
      const endpoints: PlaygroundEndpoint[] = listEndpointsFromOpenApi(openapi)
        .filter((e) => ALLOWED_METHODS.has(e.method))
        .map((e) => ({
          method: e.method as PlaygroundEndpoint["method"],
          path: e.path,
          summary: e.summary ?? e.description,
          pathParams: extractPathParams(e.path),
          resource: e.tags?.[0],
        }));
      const isOnline = job.deployment?.status === "ONLINE" && Boolean(job.deployment.url);
      return {
        id: job.id,
        name: job.name,
        description: job.description,
        deploymentUrl: isOnline ? job.deployment!.url ?? null : null,
        isOnline,
        endpoints,
      };
    })
    .filter((a): a is PlaygroundApi => a !== null);

  apis.sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <DashboardHeader crumbs={[{ label: "Workspace", href: "/dashboard" }, { label: "Playground" }]} />
      <PageContainer width="wide">
        <PageHeader
          title={<em>Playground</em>}
          description="Choisis une API, sélectionne un endpoint, ajuste les paramètres et lance la requête. Le résultat s'affiche sous le formulaire."
          actions={
            <div className="flex items-center gap-2 rounded-[10px] border border-line bg-surface px-2.5 py-1.5 font-mono text-[10.5px] text-muted sm:gap-3 sm:px-3 sm:py-2 sm:text-[11px]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full bg-accent"
                  style={{ boxShadow: "0 0 0 3px var(--accent-glow)" }}
                />
                {apis.filter((a) => a.isOnline).length} en ligne
              </span>
              <span className="text-line-2">·</span>
              <span>{apis.length} total</span>
            </div>
          }
        />

        <PlaygroundConsole apis={apis} />
      </PageContainer>
    </>
  );
}
