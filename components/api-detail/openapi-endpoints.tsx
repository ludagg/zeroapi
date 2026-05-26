import { Lock } from "lucide-react";
import type { OpenApiEndpoint } from "@/lib/api-detail";

const METHOD_COLOR: Record<string, string> = {
  GET: "bg-[#E5F0FF] text-[#1554B5]",
  POST: "bg-accent-soft text-accent-ink",
  PUT: "bg-warn-soft text-warn-ink",
  PATCH: "bg-warn-soft text-warn-ink",
  DELETE: "bg-danger-soft text-danger",
  OPTIONS: "bg-bg-2 text-muted",
  HEAD: "bg-bg-2 text-muted",
};

export function OpenApiEndpoints({ endpoints }: { endpoints: OpenApiEndpoint[] }) {
  if (!endpoints.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-2 bg-surface p-10 text-center text-muted">
        Aucun endpoint dans l&apos;OpenAPI spec.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      {endpoints.map((e, i) => {
        const requiresAuth =
          e.tags?.some((t) => /auth|secured/i.test(t)) ||
          /auth required/i.test(e.description ?? "");
        return (
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
              {(e.summary || e.description) && (
                <div className="mt-0.5 truncate text-[12px] text-muted">
                  {e.summary ?? e.description}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 font-mono text-[10.5px] text-muted">
              {requiresAuth && (
                <span className="inline-flex items-center gap-1 rounded-[5px] border border-line bg-bg-2 px-1.5 py-0.5">
                  <Lock className="h-2.5 w-2.5" />
                  auth
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
