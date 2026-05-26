import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";

export type DerivedTable = {
  name: string;
  origin: "resource" | "join" | "auth";
  columns: number;
  /** Deterministic placeholder count for the UI in absence of live metrics. */
  estimatedRows: number;
};

/**
 * Deterministically hashes a string to a positive 32-bit int — used to
 * give each table a stable, plausible "row count" without faking it
 * differently on every render.
 */
function seedFrom(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function listTables(spec: ZeroAPISpec): DerivedTable[] {
  const out: DerivedTable[] = [];

  for (const r of spec.resources) {
    const columns = Object.keys(r.fields).length + 1; // + id
    out.push({
      name: r.name,
      origin: "resource",
      columns,
      estimatedRows: seedFrom(`${spec.name}/${r.name}`) % 1500,
    });

    for (const rel of r.relations ?? []) {
      if (rel.type === "manyToMany" && rel.through) {
        out.push({
          name: rel.through,
          origin: "join",
          columns: 2 + Object.keys(rel.fields ?? {}).length,
          estimatedRows: seedFrom(`${spec.name}/${rel.through}`) % 800,
        });
      }
    }
  }

  if (spec.authFlows?.refreshTokens)
    out.push({ name: "RefreshToken", origin: "auth", columns: 5, estimatedRows: 0 });
  if (spec.authFlows?.passwordReset)
    out.push({ name: "PasswordReset", origin: "auth", columns: 4, estimatedRows: 0 });
  if (spec.authFlows?.emailVerification)
    out.push({ name: "EmailVerification", origin: "auth", columns: 4, estimatedRows: 0 });

  return out;
}

/**
 * Live stats placeholder values. Returns deterministic numbers based on
 * the database id, so the page doesn't fluctuate between renders.
 */
export function liveStatsFor(dbId: string): {
  requestsPerDay: number;
  avgResponseMs: number;
  p99Ms: number;
} {
  const seed = seedFrom(dbId);
  return {
    requestsPerDay: 800 + (seed % 12000),
    avgResponseMs: 35 + (seed % 90),
    p99Ms: 180 + (seed % 220),
  };
}
