type Field = { name: string; type: string; required?: boolean; relation?: string };
type Model = { name: string; fields: Field[] };

export function ModelsList({ models }: { models: Model[] }) {
  if (!models.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-2 bg-surface p-10 text-center text-muted">
        Aucun modèle dans la spec.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {models.map((m) => (
        <div key={m.name} className="overflow-hidden rounded-[14px] border border-line bg-surface">
          <div className="border-b border-line bg-bg-2 px-4 py-2.5 font-mono text-[12px]">
            <b className="font-semibold">{m.name}</b>
            <span className="ml-2 text-[10.5px] text-muted">{m.fields.length} champs</span>
          </div>
          <div className="px-4 py-2">
            {m.fields.map((f) => (
              <div
                key={f.name}
                className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-dashed border-line py-1.5 font-mono text-[12px] text-ink-2 last:border-b-0"
              >
                <span>
                  {f.name}
                  {f.required && <span className="text-danger">*</span>}
                </span>
                <span className="text-[10.5px] text-muted">
                  {f.relation ? `→ ${f.relation}` : f.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
