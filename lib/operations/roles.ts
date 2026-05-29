/** Role operations (OPERATIONS.md §2.6 + §3.6). */

import type { RoleDefinition, ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type { AddRoleOp, RemoveRoleOp, RenameRoleOp } from "./types";
import { ConfirmationRequiredError, OperationError } from "./types";
import { clone, requireNonEmpty } from "./helpers";

function rolesOf(spec: ZeroAPISpec): RoleDefinition[] {
  return spec.roles ?? [];
}

export function addRole(spec: ZeroAPISpec, op: AddRoleOp): ZeroAPISpec {
  requireNonEmpty(op.name, "name");
  if (rolesOf(spec).some((r) => r.name === op.name)) {
    throw new OperationError(`Le rôle "${op.name}" existe déjà`);
  }
  const next = clone(spec);
  next.roles = [...rolesOf(next), { name: op.name }];
  return next;
}

/** Every place a role name appears (rbac arrays + permission rules). */
function roleReferences(spec: ZeroAPISpec, role: string): string[] {
  const refs: string[] = [];
  for (const r of spec.resources) {
    const rbac = r.rbac;
    if (!rbac) continue;
    for (const action of ["read", "write", "delete"] as const) {
      if (rbac[action]?.includes(role)) refs.push(`rbac.${action} de ${r.name}`);
    }
  }
  for (const perm of spec.permissions ?? []) {
    for (const rule of perm.rules) {
      if (rule.role === role) refs.push(`permission ${perm.resource} (rôle ${role})`);
    }
  }
  return refs;
}

export function removeRole(spec: ZeroAPISpec, op: RemoveRoleOp): ZeroAPISpec {
  if (!rolesOf(spec).some((r) => r.name === op.name)) {
    throw new OperationError(`Le rôle "${op.name}" n'existe pas`);
  }
  const refs = roleReferences(spec, op.name);
  if (refs.length > 0 && !op.confirmed) {
    throw new ConfirmationRequiredError(
      "removeRole",
      `Le rôle "${op.name}" est référencé par ${refs.length} élément(s). Confirmez pour les nettoyer en cascade.`,
      refs,
    );
  }
  const next = clone(spec);
  next.roles = rolesOf(next).filter((r) => r.name !== op.name);
  if (next.roles.length === 0) delete next.roles;
  // Cascade: scrub the role from rbac arrays and permission rules.
  for (const r of next.resources) {
    if (!r.rbac) continue;
    for (const action of ["read", "write", "delete"] as const) {
      if (r.rbac[action]) r.rbac[action] = r.rbac[action]!.filter((x) => x !== op.name);
    }
  }
  if (next.permissions) {
    for (const perm of next.permissions) {
      perm.rules = perm.rules.filter((rule) => rule.role !== op.name);
    }
    next.permissions = next.permissions.filter((p) => p.rules.length > 0);
    if (next.permissions.length === 0) delete next.permissions;
  }
  return next;
}

export function renameRole(spec: ZeroAPISpec, op: RenameRoleOp): ZeroAPISpec {
  requireNonEmpty(op.newName, "newName");
  if (!rolesOf(spec).some((r) => r.name === op.oldName)) {
    throw new OperationError(`Le rôle "${op.oldName}" n'existe pas`);
  }
  if (op.newName === op.oldName) {
    throw new OperationError("newName est identique à oldName");
  }
  if (rolesOf(spec).some((r) => r.name === op.newName)) {
    throw new OperationError(`Le rôle "${op.newName}" existe déjà`);
  }
  const next = clone(spec);
  for (const r of next.roles ?? []) {
    if (r.name === op.oldName) r.name = op.newName;
  }
  for (const r of next.resources) {
    if (!r.rbac) continue;
    for (const action of ["read", "write", "delete"] as const) {
      if (r.rbac[action]) {
        r.rbac[action] = r.rbac[action]!.map((x) => (x === op.oldName ? op.newName : x));
      }
    }
  }
  for (const perm of next.permissions ?? []) {
    for (const rule of perm.rules) {
      if (rule.role === op.oldName) rule.role = op.newName;
    }
  }
  return next;
}
