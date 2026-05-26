import type { OpenAPISpec } from "@ludagg/zeroapi-runtime";
import { OpenApiTable } from "@/components/api-detail/openapi-table";

export function OpenApiPanel({ openApi }: { openApi: OpenAPISpec }) {
  const endpointCount = Object.entries(openApi.paths).reduce(
    (sum, [, methods]) => sum + Object.keys(methods as Record<string, unknown>).length,
    0,
  );
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Documentation OpenAPI</h2>
          <p className="mt-1 text-[12.5px] text-muted">
            Spec <span className="font-mono">{openApi.openapi}</span> · accessible sur{" "}
            <code className="font-mono">/openapi.json</code> · doc Scalar sur{" "}
            <code className="font-mono">/docs</code>.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-[11.5px]">
          <span className="font-semibold text-ink">{endpointCount}</span>
          <span className="text-muted">endpoint{endpointCount > 1 ? "s" : ""}</span>
        </span>
      </header>
      <OpenApiTable openApi={openApi} />
    </section>
  );
}
