import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Job versioning helpers.
 *
 * A "lineage" is the set of all versions of one logical API. Every version is
 * a real Job row; they share a `lineageId` (the root version's id) and carry
 * an incrementing `version` number. Pre-existing jobs may have a null
 * `lineageId`; we treat such a job as its own lineage root, so the key is
 * always `job.lineageId ?? job.id`.
 */

type LineageJob = { id: string; lineageId: string | null };

/** Stable key identifying the lineage a job belongs to. */
export function lineageKeyOf(job: LineageJob): string {
  return job.lineageId ?? job.id;
}

/** Prisma `where` matching every version in a lineage (incl. a null-lineage root). */
export function lineageWhere(userId: string, key: string): Prisma.JobWhereInput {
  return {
    userId,
    OR: [{ lineageId: key }, { id: key, lineageId: null }],
  };
}

/** Short label like "v3". */
export function versionLabel(version: number | null | undefined): string {
  return `v${version && version > 0 ? version : 1}`;
}

type Tx = PrismaClient | Prisma.TransactionClient;

/**
 * Resolves the lineage id + next version number for a new build derived from
 * `source`. Lazily backfills the source's `lineageId` when it was null so the
 * whole lineage stays queryable by a single key afterwards.
 *
 * Returns `{ lineageId: null }` when there is no source — the caller creates a
 * root job and then sets `lineageId = created.id`.
 */
export async function resolveNextVersion(
  tx: Tx,
  userId: string,
  source: LineageJob | null,
): Promise<{ lineageId: string | null; version: number }> {
  if (!source) return { lineageId: null, version: 1 };

  const key = lineageKeyOf(source);
  // Backfill a null-lineage root so siblings share a concrete key.
  if (!source.lineageId) {
    await tx.job.update({ where: { id: source.id }, data: { lineageId: key } });
  }
  const max = await tx.job.aggregate({
    where: lineageWhere(userId, key),
    _max: { version: true },
  });
  return { lineageId: key, version: (max._max.version ?? 1) + 1 };
}
