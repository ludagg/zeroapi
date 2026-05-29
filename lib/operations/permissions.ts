/** Permission operations (OPERATIONS.md §2.6). */

import type {
  PermissionAction,
  PermissionDefinition,
  PermissionRule,
  ZeroAPISpec,
} from "@ludagg/zeroapi-runtime";
import type {
  RemovePermissionRuleOp,
  RemoveResourcePermissionsOp,
  SetPermissionRuleOp,
} from "./types";
import { OperationError } from "./types";
import { clone, getResource } from "./helpers";

const VALID_ACTIONS = ["create", "read", "update", "delete"] as const;

/** Upsert a single (resource, role) rule. ownOnly/JWT validity is enforced by the gate. */
export function setPermissionRule(
  spec: ZeroAPISpec,
  op: SetPermissionRuleOp,
): ZeroAPISpec {
  getResource(spec, op.resource); // resource must exist
  if (!Array.isArray(op.actions) || op.actions.length === 0) {
    throw new OperationError("actions doit être un tableau non vide");
  }
  for (const a of op.actions) {
    if (!(VALID_ACTIONS as readonly string[]).includes(a)) {
      throw new OperationError(
        `action invalide "${a}" (autorisées : ${VALID_ACTIONS.join(", ")})`,
      );
    }
  }

  const rule: PermissionRule = {
    role: op.role,
    actions: [...op.actions] as PermissionAction[],
  };
  if (op.ownOnly !== undefined) rule.ownOnly = op.ownOnly;

  const next = clone(spec);
  const permissions = next.permissions ?? [];
  let entry = permissions.find((p) => p.resource === op.resource);
  if (!entry) {
    entry = { resource: op.resource, rules: [] } as PermissionDefinition;
    permissions.push(entry);
  }
  const idx = entry.rules.findIndex((r) => r.role === op.role);
  if (idx >= 0) entry.rules[idx] = rule;
  else entry.rules.push(rule);
  next.permissions = permissions;
  return next;
}

export function removePermissionRule(
  spec: ZeroAPISpec,
  op: RemovePermissionRuleOp,
): ZeroAPISpec {
  const entry = (spec.permissions ?? []).find((p) => p.resource === op.resource);
  if (!entry || !entry.rules.some((r) => r.role === op.role)) {
    throw new OperationError(
      `Aucune règle de permission pour le rôle "${op.role}" sur "${op.resource}"`,
    );
  }
  const next = clone(spec);
  const permissions = next.permissions ?? [];
  const nentry = permissions.find((p) => p.resource === op.resource)!;
  nentry.rules = nentry.rules.filter((r) => r.role !== op.role);
  next.permissions = permissions.filter((p) => p.rules.length > 0);
  if (next.permissions.length === 0) delete next.permissions;
  return next;
}

export function removeResourcePermissions(
  spec: ZeroAPISpec,
  op: RemoveResourcePermissionsOp,
): ZeroAPISpec {
  if (!(spec.permissions ?? []).some((p) => p.resource === op.resource)) {
    throw new OperationError(`Aucune permission déclarée sur "${op.resource}"`);
  }
  const next = clone(spec);
  next.permissions = (next.permissions ?? []).filter((p) => p.resource !== op.resource);
  if (next.permissions.length === 0) delete next.permissions;
  return next;
}
