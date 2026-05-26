import type { ResourceDefinition } from "@ludagg/zeroapi-runtime";

export function ModelsList({ resources }: { resources: ResourceDefinition[] }) {
  if (!resources.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-2 bg-surface p-10 text-center text-muted">
        Aucune ressource dans la spec.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {resources.map((r) => {
        const entries = Object.entries(r.fields);
        return (
          <div key={r.name} className="overflow-hidden rounded-[14px] border border-line bg-surface">
            <div className="border-b border-line bg-bg-2 px-4 py-2.5 font-mono text-[12px]">
              <b className="font-semibold">{r.name}</b>
              <span className="ml-2 text-[10.5px] text-muted">{entries.length} champs</span>
            </div>
            <div className="px-4 py-2">
              {entries.map(([name, field]) => (
                <div
                  key={name}
                  className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-dashed border-line py-1.5 font-mono text-[12px] text-ink-2 last:border-b-0"
                >
                  <span>
                    {name}
                    {field.required && <span className="text-danger">*</span>}
                  </span>
                  <span className="text-[10.5px] text-muted">{field.type}</span>
                </div>
              ))}
              {r.relations && r.relations.length > 0 && (
                <div className="mt-2 border-t border-dashed border-line pt-2">
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    Relations
                  </div>
                  {r.relations.map((rel, i) => (
                    <div
                      key={`${rel.type}-${rel.resource}-${i}`}
                      className="font-mono text-[11.5px] text-ink-2"
                    >
                      <span className="text-muted">{rel.type}</span> → {rel.resource}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
