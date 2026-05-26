import { ExternalLink, Server } from "lucide-react";
import type { DeployPlatform } from "@prisma/client";

type DeploymentRow = {
  id: string;
  platform: DeployPlatform;
  url: string | null;
  job: { name: string };
};

const PLATFORM_LABEL: Record<DeployPlatform, string> = {
  RAILWAY: "Railway",
  RENDER: "Render",
  VERCEL: "Vercel",
  FLYIO: "Fly.io",
  ZEROAPI_CLOUD: "ZeroAPI Cloud",
};

export function DeploymentsPanel({ deployments }: { deployments: DeploymentRow[] }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
        <h3 className="text-[14px] font-semibold">Déploiements en ligne</h3>
      </div>

      <div className="py-1">
        {deployments.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-muted">
            Pas encore de déploiement actif.
          </div>
        )}
        {deployments.map((d, i) => (
          <div
            key={d.id}
            className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
            style={i > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
          >
            <div className="grid h-8 w-8 place-items-center rounded-[8px] border border-line bg-bg-2 text-ink">
              <Server className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{d.job.name}</div>
              <a
                href={d.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 truncate font-mono text-[11px] text-muted transition hover:text-ink"
              >
                {d.url ?? PLATFORM_LABEL[d.platform]}
                {d.url && <ExternalLink className="h-2.5 w-2.5" />}
              </a>
            </div>
            <span
              className="h-2 w-2 rounded-full bg-accent"
              style={{ boxShadow: "0 0 0 4px var(--accent-glow)" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
