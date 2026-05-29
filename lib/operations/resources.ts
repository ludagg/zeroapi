/** Resource operations (OPERATIONS.md §2.2 + §3.1, §3.2, §3.7). */

import type {
  FieldDefinition,
  ResourceDefinition,
  ZeroAPISpec,
} from "@ludagg/zeroapi-runtime";
import type {
  AddResourceOp,
  RemoveResourceOp,
  RenameResourceOp,
  SetResourceDescriptionOp,
  SetResourceEndpointsOp,
  SetResourceRbacOp,
  SetSearchableFieldsOp,
} from "./types";
import { ConfirmationRequiredError, OperationError } from "./types";
import {
  clone,
  getReservedResources,
  getResource,
  requireNonEmpty,
} from "./helpers";

const ALLOWED_CRUD = ["list", "create", "read", "update", "delete"] as const;

/** addResource — §3.7: refuse reserved names and collisions. */
export function addResource(spec: ZeroAPISpec, op: AddResourceOp): ZeroAPISpec {
  requireNonEmpty(op.name, "name");
  if (spec.resources.some((r) => r.name === op.name)) {
    throw new OperationError(`Une ressource nommée "${op.name}" existe déjà`);
  }
  if (getReservedResources(spec).has(op.name)) {
    throw new OperationError(
      `"${op.name}" est un nom réservé par le runtime sous l'auth courante — choisissez un autre nom`,
    );
  }

  const fields: Record<string, FieldDefinition> = {};
  if (op.fields) {
    for (const [name, def] of Object.entries(op.fields)) {
      if (def.type === "enum" && (!def.values || def.values.length === 0)) {
        throw new OperationError(
          `Le champ enum "${name}" doit déclarer des "values"`,
        );
      }
      fields[name] = { ...def } as FieldDefinition;
    }
  }
  if (Object.keys(fields).length === 0) {
    // A resource must always declare at least one field (lib/spec.ts:727).
    fields.id = { type: "uuid", required: true };
  }

  const resource: ResourceDefinition = { name: op.name, fields };
  if (op.description) resource.description = op.description;
  if (op.endpoints) resource.endpoints = [...op.endpoints];
  if (op.rbac) resource.rbac = clone(op.rbac);

  const next = clone(spec);
  next.resources.push(resource);
  return next;
}

/** Collect every inbound reference to a resource (relations, permissions). */
function inboundReferences(spec: ZeroAPISpec, name: string): string[] {
  const refs: string[] = [];
  for (const rel of spec.relations ?? []) {
    if (rel.from === name || rel.to === name) {
      refs.push(`relation top-level ${rel.from} → ${rel.to} (${rel.type})`);
    }
  }
  for (const r of spec.resources) {
    if (r.name === name) continue;
    for (const rel of r.relations ?? []) {
      if (rel.resource === name) {
        refs.push(`relation ${r.name} → ${name} (${rel.type})`);
      }
    }
  }
  for (const perm of spec.permissions ?? []) {
    if (perm.resource === name) refs.push(`permissions sur ${name}`);
  }
  return refs;
}

/** removeResource — §3.1: detect orphan references, cascade only when confirmed. */
export function removeResource(
  spec: ZeroAPISpec,
  op: RemoveResourceOp,
): ZeroAPISpec {
  getResource(spec, op.name); // throws if missing
  const refs = inboundReferences(spec, op.name);
  if (refs.length > 0 && !op.confirmed) {
    throw new ConfirmationRequiredError(
      "removeResource",
      `Supprimer "${op.name}" casserait ${refs.length} référence(s). Confirmez pour supprimer en cascade.`,
      refs,
    );
  }

  const next = clone(spec);
  next.resources = next.resources.filter((r) => r.name !== op.name);
  // Cascade: drop top-level relations touching it, per-resource relations
  // targeting it, and its permissions. FK fields on other resources are left
  // intact — a dangling `uuid` is still valid (OPERATIONS.md §3.1.2).
  if (next.relations) {
    next.relations = next.relations.filter(
      (rel) => rel.from !== op.name && rel.to !== op.name,
    );
  }
  for (const r of next.resources) {
    if (r.relations) {
      r.relations = r.relations.filter((rel) => rel.resource !== op.name);
    }
  }
  if (next.permissions) {
    next.permissions = next.permissions.filter((p) => p.resource !== op.name);
  }
  return next;
}

/** renameResource — §3.2: rename + propagate to every name reference. */
export function renameResource(
  spec: ZeroAPISpec,
  op: RenameResourceOp,
): ZeroAPISpec {
  getResource(spec, op.oldName); // throws if missing
  requireNonEmpty(op.newName, "newName");
  if (op.newName === op.oldName) {
    throw new OperationError("newName est identique à oldName");
  }
  if (spec.resources.some((r) => r.name === op.newName)) {
    throw new OperationError(`Une ressource nommée "${op.newName}" existe déjà`);
  }
  if (getReservedResources(spec).has(op.newName)) {
    throw new OperationError(
      `"${op.newName}" est un nom réservé par le runtime sous l'auth courante`,
    );
  }

  const next = clone(spec);
  for (const r of next.resources) {
    if (r.name === op.oldName) r.name = op.newName;
    for (const rel of r.relations ?? []) {
      if (rel.resource === op.oldName) rel.resource = op.newName;
    }
  }
  for (const rel of next.relations ?? []) {
    if (rel.from === op.oldName) rel.from = op.newName;
    if (rel.to === op.oldName) rel.to = op.newName;
  }
  for (const perm of next.permissions ?? []) {
    if (perm.resource === op.oldName) perm.resource = op.newName;
  }
  return next;
}

export function setResourceDescription(
  spec: ZeroAPISpec,
  op: SetResourceDescriptionOp,
): ZeroAPISpec {
  getResource(spec, op.name);
  const next = clone(spec);
  const r = getResource(next, op.name);
  if (op.description === undefined || op.description === "") {
    delete r.description;
  } else {
    r.description = op.description;
  }
  return next;
}

export function setResourceEndpoints(
  spec: ZeroAPISpec,
  op: SetResourceEndpointsOp,
): ZeroAPISpec {
  getResource(spec, op.name);
  if (!Array.isArray(op.endpoints) || op.endpoints.length === 0) {
    throw new OperationError("endpoints doit être un tableau non vide");
  }
  for (const ep of op.endpoints) {
    if (!(ALLOWED_CRUD as readonly string[]).includes(ep)) {
      throw new OperationError(
        `endpoint invalide "${ep}" (autorisés : ${ALLOWED_CRUD.join(", ")})`,
      );
    }
  }
  const next = clone(spec);
  getResource(next, op.name).endpoints = [...op.endpoints];
  return next;
}

export function setResourceRbac(
  spec: ZeroAPISpec,
  op: SetResourceRbacOp,
): ZeroAPISpec {
  getResource(spec, op.name);
  const next = clone(spec);
  getResource(next, op.name).rbac = clone(op.rbac);
  return next;
}

export function setSearchableFields(
  spec: ZeroAPISpec,
  op: SetSearchableFieldsOp,
): ZeroAPISpec {
  const r = getResource(spec, op.name);
  for (const f of op.fields) {
    if (!(f in r.fields)) {
      throw new OperationError(
        `Le champ "${f}" n'existe pas sur "${op.name}" et ne peut pas être searchable`,
      );
    }
  }
  const next = clone(spec);
  getResource(next, op.name).searchable = [...op.fields];
  return next;
}
