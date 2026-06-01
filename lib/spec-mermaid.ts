import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";

/** Mermaid ER relationship symbol per (normalized) relation type. */
const REL_SYMBOL: Record<string, string> = {
  onetoone: "||--||",
  onetomany: "||--o{",
  manytoone: "}o--||",
  manytomany: "}o--o{",
};

function normType(t: string): string {
  return t.replace(/[^a-z]/gi, "").toLowerCase();
}

function safeType(t: string): string {
  if (t.startsWith("enum")) return "enum";
  return t.replace(/[^A-Za-z0-9_]/g, "_") || "string";
}

/**
 * Generate a Mermaid `erDiagram` from a ZeroAPISpec (pure). Devs can paste it
 * into mermaid.live, docs, or a README.
 */
export function specToMermaidER(spec: ZeroAPISpec | null | undefined): string {
  if (!spec || !Array.isArray(spec.resources) || spec.resources.length === 0) {
    return "erDiagram\n";
  }

  const lines: string[] = ["erDiagram"];

  for (const r of spec.resources) {
    const fkFields = new Set<string>();
    for (const rel of r.relations ?? []) if (rel.field) fkFields.add(rel.field);

    lines.push(`  ${r.name} {`);
    lines.push(`    uuid id PK`);
    for (const [name, def] of Object.entries(r.fields ?? {})) {
      const key = fkFields.has(name) ? " FK" : "";
      lines.push(`    ${safeType(def.type)} ${name}${key}`);
    }
    lines.push(`  }`);
  }

  const seen = new Set<string>();
  const pushRel = (from: string, to: string, type: string, label: string) => {
    const sym = REL_SYMBOL[normType(type)] ?? "||--o{";
    const key = `${from}|${to}|${sym}`;
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(`  ${from} ${sym} ${to} : "${label}"`);
  };

  for (const r of spec.resources) {
    for (const rel of r.relations ?? []) {
      pushRel(r.name, rel.resource, rel.type, rel.field ?? rel.type);
    }
  }
  for (const rel of spec.relations ?? []) {
    pushRel(rel.from, rel.to, rel.type, rel.field ?? rel.type);
  }

  return lines.join("\n") + "\n";
}
