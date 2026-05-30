/** Aggregate operations (ResourceDefinition.aggregates, runtime 0.20.0+). */

import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type { AggregateDef, AggregateOp } from "../spec";
import type { AddAggregateOp, RemoveAggregateOp } from "./types";
import { OperationError } from "./types";
import { clone, getResource, requireNonEmpty } from "./helpers";

const VALID_OPS = ["count", "sum", "avg", "min", "max"] as const;

/** addAggregate — declare a read-only aggregate over a to-many relation. */
export function addAggregate(spec: ZeroAPISpec, op: AddAggregateOp): ZeroAPISpec {
  const r = getResource(spec, op.resource);
  requireNonEmpty(op.name, "name");
  requireNonEmpty(op.relation, "relation");
  if (!(VALID_OPS as readonly string[]).includes(op.op)) {
    throw new OperationError(
      `op invalide "${op.op}" (autorisées : ${VALID_OPS.join(", ")})`,
    );
  }
  // `field` is required for sum/avg/min/max and forbidden for count.
  if (op.op === "count") {
    if (typeof op.field === "string" && op.field.length > 0) {
      throw new OperationError(`l'op "count" ne prend pas de "field"`);
    }
  } else if (typeof op.field !== "string" || op.field.length === 0) {
    throw new OperationError(
      `l'op "${op.op}" exige un "field" (champ numérique de la relation)`,
    );
  }
  if ((r.aggregates ?? []).some((a) => a.name === op.name)) {
    throw new OperationError(
      `un aggregate nommé "${op.name}" existe déjà sur "${op.resource}"`,
    );
  }

  const aggregate: AggregateDef = {
    name: op.name,
    op: op.op as AggregateOp,
    relation: op.relation,
  };
  if (op.op !== "count" && op.field) aggregate.field = op.field;

  const next = clone(spec);
  const r2 = getResource(next, op.resource);
  r2.aggregates = [...(r2.aggregates ?? []), aggregate];
  return next;
}

/** removeAggregate — drop an aggregate by name (error if absent). */
export function removeAggregate(
  spec: ZeroAPISpec,
  op: RemoveAggregateOp,
): ZeroAPISpec {
  const r = getResource(spec, op.resource);
  if (!(r.aggregates ?? []).some((a) => a.name === op.name)) {
    throw new OperationError(
      `Aucun aggregate "${op.name}" sur "${op.resource}"`,
    );
  }
  const next = clone(spec);
  const r2 = getResource(next, op.resource);
  r2.aggregates = (r2.aggregates ?? []).filter((a) => a.name !== op.name);
  if (r2.aggregates.length === 0) delete r2.aggregates;
  return next;
}
