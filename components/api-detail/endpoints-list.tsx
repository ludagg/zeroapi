import { Lock } from "lucide-react";
import pluralize from "pluralize";
import type { ResourceDefinition } from "@ludagg/zeroapi-runtime";

type DerivedEndpoint = {
  method: string;
  path: string;
  description?: string;
  auth: boolean;
  roles?: string[];
};

const METHOD_COLOR: Record<string, string> = {
  GET: "bg-[#E5F0FF] text-[#1554B5]",
  POST: "bg-accent-soft text-accent-ink",
  PUT: "bg-warn-soft text-warn-ink",
  PATCH: "bg-warn-soft text-warn-ink",
  DELETE: "bg-danger-soft text-danger",
};

const CRUD: Record<string, { method: string; suffix: string; verb: string }> = {
  list: { method: "GET", suffix: "", verb: "Liste" },
  create: { method: "POST", suffix: "", verb: "Crée" },
  read: { method: "GET", suffix: "/:id", verb: "Lit" },
  update: { method: "PUT", suffix: "/:id", verb: "Met à jour" },
  delete: { method: "DELETE", suffix: "/:id", verb: "Supprime" },
};

export function deriveEndpoints(resources: ResourceDefinition[]): DerivedEndpoint[] {
  const out: DerivedEndpoint[] = [];
  for (const r of resources) {
    const slug = pluralize(r.name.toLowerCase());
    const ep = r.endpoints ?? ["list", "create", "read", "update", "delete"];
    for (const action of ep) {
      const cfg = CRUD[action];
      if (!cfg) continue;
      out.push({
        method: cfg.method,
        path: `/${slug}${cfg.suffix}`,
        description: `${cfg.verb} ${r.name}`,
        auth: r.auth?.required ?? false,
        roles: r.auth?.roles,
      });
    }
    for (const c of r.customEndpoints ?? []) {
      out.push({
        method: c.method,
        path: `/${slug}${c.path}`,
        description: c.handler,
        auth: c.auth ?? false,
        roles: c.roles,
      });
    }
  }
  return out;
}

export function EndpointsList({ resources }: { resources: ResourceDefinition[] }) {
  const endpoints = deriveEndpoints(resources);
  if (!endpoints.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-2 bg-surface p-10 text-center text-muted">
        Aucun endpoint dérivé de la spec.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      {endpoints.map((e, i) => (
        <div
          key={`${e.method}-${e.path}-${i}`}
          className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
          style={i > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
        >
          <span
            className={
              "inline-flex justify-center rounded-[6px] px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-[0.04em] " +
              (METHOD_COLOR[e.method] ?? "bg-bg-2 text-ink-2")
            }
          >
            {e.method}
          </span>
          <div className="min-w-0">
            <div className="truncate font-mono text-[13px]">{e.path}</div>
            {e.description && (
              <div className="mt-0.5 truncate text-[12px] text-muted">{e.description}</div>
            )}
          </div>
          <div className="flex items-center gap-2 font-mono text-[10.5px] text-muted">
            {e.auth && (
              <span className="inline-flex items-center gap-1 rounded-[5px] border border-line bg-bg-2 px-1.5 py-0.5">
                <Lock className="h-2.5 w-2.5" />
                {e.roles?.length ? e.roles.join(", ") : "auth"}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
