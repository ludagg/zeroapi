/** Relation operations (OPERATIONS.md §2.4 + §3.7) — top-level + per-resource. */

import type {
  RelationDefinition,
  SpecRelation,
  ZeroAPISpec,
} from "@ludagg/zeroapi-runtime";
import type {
  AddRelationOp,
  AddResourceRelationOp,
  RemoveRelationOp,
  RemoveResourceRelationOp,
  SetRelationOnDeleteOp,
} from "./types";
import { OperationError } from "./types";
import { clone, getResource, validRelationTargets } from "./helpers";

const TOP_TYPES = ["one-to-one", "one-to-many", "many-to-one", "many-to-many"];
const PER_TYPES = ["oneToOne", "oneToMany", "manyToOne", "manyToMany"];
const TOP_ON_DELETE = ["cascade", "set-null", "restrict"];
const PER_ON_DELETE = ["Cascade", "SetNull", "Restrict", "NoAction"];

/** A FK field is valid when it's "id" (implicit PK) or an existing string/uuid. */
function assertFkField(spec: ZeroAPISpec, resource: string, field: string): void {
  if (field === "id") return;
  const r = getResource(spec, resource);
  const f = r.fields[field];
  if (!f) {
    throw new OperationError(
      `Le champ FK "${field}" n'existe pas sur "${resource}" — ajoutez-le d'abord (addField)`,
    );
  }
  if (f.type !== "string" && f.type !== "uuid") {
    throw new OperationError(
      `Le champ FK "${resource}.${field}" doit être de type "string" ou "uuid" (actuel : "${f.type}")`,
    );
  }
}

// ── Top-level relations (spec.relations) ────────────────────────────────────

export function addRelation(spec: ZeroAPISpec, op: AddRelationOp): ZeroAPISpec {
  if (!TOP_TYPES.includes(op.relationType)) {
    throw new OperationError(
      `type de relation top-level invalide "${op.relationType}" (autorisés : ${TOP_TYPES.join(", ")})`,
    );
  }
  const targets = validRelationTargets(spec);
  if (!targets.has(op.from)) {
    throw new OperationError(`Ressource source inconnue : "${op.from}"`);
  }
  if (!targets.has(op.to)) {
    throw new OperationError(`Ressource cible inconnue : "${op.to}"`);
  }
  if (op.relationType === "many-to-many" && !op.through) {
    throw new OperationError(
      `Une relation many-to-many exige "through" (nom de la table de jonction)`,
    );
  }
  const field = op.field ?? "id";
  assertFkField(spec, op.from, field);

  const exists = (spec.relations ?? []).some(
    (rel) => rel.from === op.from && rel.to === op.to && rel.type === op.relationType,
  );
  if (exists) {
    throw new OperationError(
      `Une relation ${op.from} → ${op.to} (${op.relationType}) existe déjà`,
    );
  }

  const relation: SpecRelation = {
    from: op.from,
    to: op.to,
    type: op.relationType,
    field,
  };
  if (op.through) relation.through = op.through;
  if (op.onDelete) relation.onDelete = op.onDelete;

  const next = clone(spec);
  next.relations = [...(next.relations ?? []), relation];
  return next;
}

export function removeRelation(
  spec: ZeroAPISpec,
  op: RemoveRelationOp,
): ZeroAPISpec {
  const before = spec.relations ?? [];
  const matches = before.filter(
    (rel) =>
      rel.from === op.from &&
      rel.to === op.to &&
      (op.relationType === undefined || rel.type === op.relationType),
  );
  if (matches.length === 0) {
    throw new OperationError(
      `Aucune relation top-level ${op.from} → ${op.to}${op.relationType ? ` (${op.relationType})` : ""} à retirer`,
    );
  }
  const next = clone(spec);
  next.relations = before.filter((rel) => !matches.includes(rel));
  if (next.relations.length === 0) delete next.relations;
  return next;
}

export function setRelationOnDelete(
  spec: ZeroAPISpec,
  op: SetRelationOnDeleteOp,
): ZeroAPISpec {
  if (!TOP_ON_DELETE.includes(op.onDelete)) {
    throw new OperationError(
      `onDelete invalide "${op.onDelete}" (autorisés : ${TOP_ON_DELETE.join(", ")})`,
    );
  }
  const matches = (spec.relations ?? []).filter(
    (rel) => rel.from === op.from && rel.to === op.to,
  );
  if (matches.length === 0) {
    throw new OperationError(`Aucune relation top-level ${op.from} → ${op.to}`);
  }
  const next = clone(spec);
  for (const rel of next.relations ?? []) {
    if (rel.from === op.from && rel.to === op.to) rel.onDelete = op.onDelete;
  }
  return next;
}

// ── Per-resource relations (resources[].relations) ──────────────────────────

export function addResourceRelation(
  spec: ZeroAPISpec,
  op: AddResourceRelationOp,
): ZeroAPISpec {
  getResource(spec, op.resource);
  if (!PER_TYPES.includes(op.relationType)) {
    throw new OperationError(
      `type de relation invalide "${op.relationType}" (autorisés : ${PER_TYPES.join(", ")})`,
    );
  }
  if (!validRelationTargets(spec).has(op.target)) {
    throw new OperationError(`Ressource cible inconnue : "${op.target}"`);
  }
  if (op.relationType === "manyToMany" && !op.through) {
    throw new OperationError(
      `Une relation manyToMany exige "through" (nom de la table de jonction)`,
    );
  }
  if (op.onDelete && !PER_ON_DELETE.includes(op.onDelete)) {
    throw new OperationError(
      `onDelete invalide "${op.onDelete}" (autorisés : ${PER_ON_DELETE.join(", ")})`,
    );
  }
  assertFkField(spec, op.resource, op.field);

  const r = getResource(spec, op.resource);
  const exists = (r.relations ?? []).some(
    (rel) => rel.resource === op.target && rel.type === op.relationType,
  );
  if (exists) {
    throw new OperationError(
      `Une relation ${op.resource} → ${op.target} (${op.relationType}) existe déjà`,
    );
  }

  const relation: RelationDefinition = {
    type: op.relationType,
    resource: op.target,
    field: op.field,
  };
  if (op.through) relation.through = op.through;
  if (op.onDelete) relation.onDelete = op.onDelete;

  const next = clone(spec);
  const nr = getResource(next, op.resource);
  nr.relations = [...(nr.relations ?? []), relation];
  return next;
}

export function removeResourceRelation(
  spec: ZeroAPISpec,
  op: RemoveResourceRelationOp,
): ZeroAPISpec {
  const r = getResource(spec, op.resource);
  const before = r.relations ?? [];
  const matches = before.filter(
    (rel) =>
      rel.resource === op.target &&
      (op.relationType === undefined || rel.type === op.relationType),
  );
  if (matches.length === 0) {
    throw new OperationError(
      `Aucune relation ${op.resource} → ${op.target}${op.relationType ? ` (${op.relationType})` : ""} à retirer`,
    );
  }
  const next = clone(spec);
  const nr = getResource(next, op.resource);
  nr.relations = before.filter((rel) => !matches.includes(rel));
  if (nr.relations.length === 0) delete nr.relations;
  return next;
}
