import { Lock } from "lucide-react";
import type { OpenAPISpec } from "@ludagg/zeroapi-runtime";

type OperationLike = {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Array<{ name: string; in: string; required?: boolean; description?: string }>;
  requestBody?: { content?: Record<string, unknown> };
  responses?: Record<string, { description?: string }>;
  security?: Array<Record<string, string[]>>;
};

type Row = {
  method: string;
  path: string;
  op: OperationLike;
};

const METHOD_COLOR: Record<string, string> = {
  GET: "bg-[#E5F0FF] text-[#1554B5]",
  POST: "bg-accent-soft text-accent-ink",
  PUT: "bg-warn-soft text-warn-ink",
  PATCH: "bg-warn-soft text-warn-ink",
  DELETE: "bg-danger-soft text-danger",
};

const KNOWN = new Set(["get", "post", "put", "patch", "delete"]);

function rowsFrom(openApi: OpenAPISpec): Row[] {
  const out: Row[] = [];
  for (const [path, methods] of Object.entries(openApi.paths)) {
    for (const [method, op] of Object.entries(methods as Record<string, unknown>)) {
      if (!KNOWN.has(method.toLowerCase())) continue;
      out.push({ method: method.toUpperCase(), path, op: (op as OperationLike) ?? {} });
    }
  }
  return out;
}

export function OpenApiTable({ openApi }: { openApi: OpenAPISpec }) {
  const rows = rowsFrom(openApi);
  if (!rows.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-2 bg-surface p-10 text-center text-muted">
        Aucun endpoint dans l&apos;OpenAPI spec.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <div className="grid grid-cols-[72px_minmax(0,1.4fr)_minmax(0,1.2fr)_auto] gap-3 border-b border-line bg-bg-2 px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.05em] text-muted">
          <span>Méthode</span>
          <span>Path</span>
          <span>Description</span>
          <span>Réponses</span>
        </div>
        {rows.map((r, i) => {
          const responses = r.op.responses
            ? Object.keys(r.op.responses).sort().join(" · ")
            : "—";
          const params = r.op.parameters ?? [];
          const requiresAuth = (r.op.security?.length ?? 0) > 0;
          return (
            <div
              key={`${r.method}-${r.path}-${i}`}
              className="grid grid-cols-[72px_minmax(0,1.4fr)_minmax(0,1.2fr)_auto] items-start gap-3 px-4 py-3"
              style={i > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
            >
              <span
                className={
                  "inline-flex h-5 justify-center self-start rounded-[6px] px-1.5 font-mono text-[11px] font-semibold tracking-[0.04em] " +
                  (METHOD_COLOR[r.method] ?? "bg-bg-2 text-ink-2")
                }
              >
                {r.method}
              </span>
              <div className="min-w-0">
                <div className="truncate font-mono text-[13px]">{r.path}</div>
                {params.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {params.map((p, k) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1 rounded-[5px] border border-line bg-bg-2 px-1.5 py-px font-mono text-[10px] text-muted"
                        title={p.description}
                      >
                        {p.name}
                        <span className="text-muted-2">·{p.in}</span>
                        {p.required && <span className="text-danger">*</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="min-w-0 text-[12.5px] text-ink-2">
                {r.op.summary || r.op.description || "—"}
                {requiresAuth && (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-[5px] border border-line bg-bg-2 px-1.5 py-0.5 font-mono text-[10.5px] text-muted">
                    <Lock className="h-2.5 w-2.5" />
                    auth
                  </div>
                )}
              </div>
              <div className="font-mono text-[10.5px] text-muted">{responses}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
