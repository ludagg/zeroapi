/** Custom endpoint operations (OPERATIONS.md §2.10). */

import type { CustomEndpointDef, ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type { AddCustomEndpointOp, RemoveCustomEndpointOp } from "./types";
import { OperationError } from "./types";
import { clone, getResource } from "./helpers";

const VALID_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function addCustomEndpoint(
  spec: ZeroAPISpec,
  op: AddCustomEndpointOp,
): ZeroAPISpec {
  const r = getResource(spec, op.resource);
  const def = op.definition;
  if (!def || typeof def !== "object") {
    throw new OperationError("definition est requise (objet)");
  }
  if (!VALID_METHODS.includes(def.method)) {
    throw new OperationError(
      `method invalide "${def.method}" (autorisées : ${VALID_METHODS.join(", ")})`,
    );
  }
  if (typeof def.path !== "string" || def.path.length === 0) {
    throw new OperationError("definition.path est requis");
  }
  if (typeof def.handler !== "string" || def.handler.length === 0) {
    throw new OperationError("definition.handler est requis");
  }
  const exists = (r.customEndpoints ?? []).some(
    (e) => e.path === def.path && e.method === def.method,
  );
  if (exists) {
    throw new OperationError(
      `Un endpoint custom ${def.method} ${def.path} existe déjà sur "${op.resource}"`,
    );
  }

  const next = clone(spec);
  const nr = getResource(next, op.resource);
  nr.customEndpoints = [...(nr.customEndpoints ?? []), clone(def) as CustomEndpointDef];
  return next;
}

export function removeCustomEndpoint(
  spec: ZeroAPISpec,
  op: RemoveCustomEndpointOp,
): ZeroAPISpec {
  const r = getResource(spec, op.resource);
  const before = r.customEndpoints ?? [];
  const matches = before.filter(
    (e) => e.path === op.path && (op.method === undefined || e.method === op.method),
  );
  if (matches.length === 0) {
    throw new OperationError(
      `Aucun endpoint custom "${op.path}"${op.method ? ` (${op.method})` : ""} sur "${op.resource}"`,
    );
  }
  const next = clone(spec);
  const nr = getResource(next, op.resource);
  nr.customEndpoints = before.filter((e) => !matches.includes(e));
  if (nr.customEndpoints.length === 0) delete nr.customEndpoints;
  return next;
}
