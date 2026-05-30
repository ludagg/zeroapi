/** Permission operations (OPERATIONS.md §2.6). */

import type {
  PermissionAction,
  PermissionDefinition,
  PermissionRule,
  ZeroAPISpec,
} from "@ludagg/zeroapi-runtime";
import type { PermissionScope } from "../spec";
import type {
  RemovePermissionRuleOp,
  RemovePermissionScopeOp,
  RemoveResourcePermissionsOp,
  SetPermissionRuleOp,
  SetPermissionScopeOp,
} from "./types";
import { OperationError } from "./types";
import { clone, getResource, requireNonEmpty } from "./helpers";

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

/** Find the (resource, role) rule or throw. Scope must attach to an existing rule. */
function findRule(
  spec: ZeroAPISpec,
  resource: string,
  role: string,
): PermissionRule {
  const entry = (spec.permissions ?? []).find((p) => p.resource === resource);
  const rule = entry?.rules.find((r) => r.role === role);
  if (!rule) {
    throw new OperationError(
      `Aucune règle de permission pour le rôle "${role}" sur "${resource}" — déclarez-la d'abord avec setPermissionRule`,
    );
  }
  return rule;
}

/**
 * setPermissionScope — attach a multi-tenant row scope to an existing rule.
 * The JWT requirement (scope reads a claim) is enforced by the validation gate.
 */
export function setPermissionScope(
  spec: ZeroAPISpec,
  op: SetPermissionScopeOp,
): ZeroAPISpec {
  getResource(spec, op.resource); // resource must exist
  requireNonEmpty(op.column, "column");
  findRule(spec, op.resource, op.role); // rule must exist

  const scope: PermissionScope = { column: op.column };
  if (op.claim !== undefined && op.claim !== "") scope.claim = op.claim;

  const next = clone(spec);
  findRule(next, op.resource, op.role).scope = scope;
  return next;
}

/** removePermissionScope — drop the scope from a rule (error if none). */
export function removePermissionScope(
  spec: ZeroAPISpec,
  op: RemovePermissionScopeOp,
): ZeroAPISpec {
  const rule = findRule(spec, op.resource, op.role);
  if (!rule.scope) {
    throw new OperationError(
      `La règle "${op.role}" sur "${op.resource}" n'a pas de scope`,
    );
  }
  const next = clone(spec);
  delete findRule(next, op.resource, op.role).scope;
  return next;
}
