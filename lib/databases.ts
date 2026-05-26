import type { Prisma, PrismaClient } from "@prisma/client";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Counts the database tables generated for a spec.
 * Each resource maps to one table, manyToMany relations add a join table,
 * and the runtime emits dedicated tables for the auth flows.
 */
export function countTables(spec: ZeroAPISpec): number {
  let n = spec.resources.length;
  for (const r of spec.resources) {
    for (const rel of r.relations ?? []) {
      if (rel.type === "manyToMany") n += 1;
    }
  }
  if (spec.authFlows) {
    if (spec.authFlows.refreshTokens) n += 1;
    if (spec.authFlows.passwordReset) n += 1;
    if (spec.authFlows.emailVerification) n += 1;
  }
  return n;
}

/**
 * Deterministic, postgres-friendly database name.
 * `Sahara Foo!` → `sahara_foo_db`
 */
export function buildDatabaseName(specName: string): string {
  const slug = specName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return (slug || "api") + "_db";
}

/**
 * Idempotent: creates the Database row for a job, or refreshes its
 * `tables` count if it already exists (e.g. after a Régénérer).
 */
export async function ensureDatabaseForJob(
  tx: Tx,
  args: { jobId: string; userId: string; specName: string; tables: number },
): Promise<void> {
  await tx.database.upsert({
    where: { jobId: args.jobId },
    create: {
      jobId: args.jobId,
      userId: args.userId,
      name: buildDatabaseName(args.specName),
      provider: "postgresql",
      tables: args.tables,
      status: "online",
      managed: true,
    },
    update: {
      tables: args.tables,
      status: "online",
    },
  });
}
