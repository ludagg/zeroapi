/**
 * Tests for the runtime 0.18–0.20 operations added to the engine:
 *   scope RBAC, state machine, aggregates, softDelete/timestamps, transactions.
 *
 * Same contract as the existing engine tests: each op does the right thing AND
 * leaves the rest of the spec intact (deep-equality on the untouched parts),
 * and every mutation passes the validation gate (applyOperation returns ok).
 *
 * Usage: pnpm test:ops020
 */
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { applyOperation, type Operation } from "../lib/operations";

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Apply and assert success, returning the new spec. */
function ok(name: string, spec: ZeroAPISpec, op: Operation): ZeroAPISpec {
  const res = applyOperation(spec, op);
  if (!res.ok) {
    failed++;
    console.error(`  FAIL: ${name} — expected ok, got error: ${res.error}`);
    return spec;
  }
  passed++;
  return res.spec;
}

/** Apply and assert it failed (optionally that the message contains `frag`). */
function ko(name: string, spec: ZeroAPISpec, op: Operation, frag?: string): void {
  const res = applyOperation(spec, op);
  if (res.ok) {
    failed++;
    console.error(`  FAIL: ${name} — expected failure, but it succeeded`);
    return;
  }
  if (frag && !res.error.includes(frag)) {
    failed++;
    console.error(`  FAIL: ${name} — wrong error: ${res.error}`);
    return;
  }
  passed++;
}

// Base spec: JWT on, two resources, an enum field, a to-many relation, a rule.
function base(): ZeroAPISpec {
  return {
    version: "1.0",
    name: "shop",
    auth: { enabled: true, strategies: ["jwt"], jwt: { enabled: true } },
    roles: [{ name: "admin" }, { name: "user" }, { name: "member" }],
    resources: [
      {
        name: "Order",
        fields: {
          userId: { type: "uuid", required: true },
          tenantId: { type: "uuid" },
          status: { type: "enum", values: ["pending", "paid", "shipped", "cancelled"] },
        },
        relations: [
          { type: "manyToOne", resource: "User", field: "userId" },
          { type: "oneToMany", resource: "Item", field: "id" },
        ],
      },
      {
        name: "Item",
        fields: { orderId: { type: "uuid" }, price: { type: "integer" } },
      },
    ],
    permissions: [
      {
        resource: "Order",
        rules: [
          { role: "member", actions: ["read"] },
          { role: "admin", actions: ["create", "read", "update", "delete"] },
        ],
      },
    ],
  } as ZeroAPISpec;
}

const order = (s: ZeroAPISpec) => s.resources.find((r) => r.name === "Order")!;
const orderRule = (s: ZeroAPISpec, role: string) =>
  s.permissions!.find((p) => p.resource === "Order")!.rules.find((r) => r.role === role)!;

// ── scope RBAC ──────────────────────────────────────────────────────────────
{
  let s = base();
  s = ok("setPermissionScope adds scope", s, {
    type: "setPermissionScope", resource: "Order", role: "member", column: "tenantId", claim: "tenantId",
  });
  check("scope.column set", orderRule(s, "member").scope?.column === "tenantId");
  check("scope.claim set", orderRule(s, "member").scope?.claim === "tenantId");
  check("other rule untouched", orderRule(s, "admin").scope === undefined);
  check("actions preserved", orderRule(s, "member").actions.join() === "read");

  // claim defaults: omit it
  let s2 = ok("setPermissionScope no claim", base(), {
    type: "setPermissionScope", resource: "Order", role: "member", column: "tenantId",
  });
  check("scope without claim", orderRule(s2, "member").scope?.claim === undefined);

  s = ok("removePermissionScope drops scope", s, {
    type: "removePermissionScope", resource: "Order", role: "member",
  });
  check("scope removed", orderRule(s, "member").scope === undefined);
  check("rule still there", orderRule(s, "member").actions.length === 1);

  // failures
  ko("scope on missing rule", base(), { type: "setPermissionScope", resource: "Order", role: "ghost", column: "x" }, "Aucune règle");
  ko("scope empty column", base(), { type: "setPermissionScope", resource: "Order", role: "member", column: "" }, "column");
  ko("remove absent scope", base(), { type: "removePermissionScope", resource: "Order", role: "member" }, "pas de scope");
  // scope requires JWT — gate rejects when jwt disabled
  const noJwt = { ...base(), auth: undefined } as ZeroAPISpec;
  ko("scope requires jwt (gate)", noJwt, { type: "setPermissionScope", resource: "Order", role: "member", column: "tenantId" });
}

// ── state machine ─────────────────────────────────────────────────────────────
{
  let s = base();
  s = ok("setStateMachine installs machine", s, {
    type: "setStateMachine", resource: "Order", field: "status", initial: "pending",
    transitions: [
      { from: "pending", to: "paid", roles: ["user", "admin"] },
      { from: "paid", to: "shipped", roles: ["admin"] },
    ],
  });
  check("sm field", order(s).stateMachine?.field === "status");
  check("sm initial", order(s).stateMachine?.initial === "pending");
  check("sm transitions count", order(s).stateMachine?.transitions.length === 2);
  check("sm roles preserved", order(s).stateMachine?.transitions[0].roles?.join() === "user,admin");
  check("fields untouched", Object.keys(order(s).fields).length === 3);

  s = ok("addStateTransition appends", s, {
    type: "addStateTransition", resource: "Order", from: "pending", to: "cancelled", roles: ["user"],
  });
  check("transition appended", order(s).stateMachine?.transitions.length === 3);

  s = ok("removeStateTransition drops one", s, {
    type: "removeStateTransition", resource: "Order", from: "pending", to: "cancelled",
  });
  check("transition removed", order(s).stateMachine?.transitions.length === 2);

  // removeStateMachine is destructive → needs confirmation
  const guard = applyOperation(s, { type: "removeStateMachine", resource: "Order" });
  check("removeStateMachine needs confirm", !guard.ok && guard.requiresConfirmation?.operation === "removeStateMachine");
  const after = ok("removeStateMachine confirmed", s, { type: "removeStateMachine", resource: "Order", confirmed: true });
  check("sm removed", order(after).stateMachine === undefined);
  check("resource still valid", order(after).fields.status !== undefined);

  // failures
  ko("sm on non-enum field", base(), { type: "setStateMachine", resource: "Order", field: "userId", initial: "x", transitions: [] }, "enum");
  ko("sm initial out of range", base(), { type: "setStateMachine", resource: "Order", field: "status", initial: "zzz", transitions: [] }, "initial");
  ko("sm transition out of range", base(), { type: "setStateMachine", resource: "Order", field: "status", initial: "pending", transitions: [{ from: "pending", to: "zzz" }] }, "zzz");
  ko("addTransition w/o machine", base(), { type: "addStateTransition", resource: "Order", from: "pending", to: "paid" }, "setStateMachine");
  ko("addTransition duplicate", s, { type: "addStateTransition", resource: "Order", from: "pending", to: "paid" }, "existe déjà");
  ko("removeTransition absent", s, { type: "removeStateTransition", resource: "Order", from: "paid", to: "pending" }, "Aucune transition");
  ko("removeStateMachine absent", base(), { type: "removeStateMachine", resource: "Order", confirmed: true }, "pas de state machine");
}

// ── aggregates ────────────────────────────────────────────────────────────────
{
  let s = base();
  s = ok("addAggregate count", s, { type: "addAggregate", resource: "Order", name: "itemCount", op: "count", relation: "items" });
  check("aggregate added", order(s).aggregates?.length === 1);
  check("count has no field", order(s).aggregates?.[0].field === undefined);

  s = ok("addAggregate sum", s, { type: "addAggregate", resource: "Order", name: "total", op: "sum", relation: "items", field: "price" });
  check("two aggregates", order(s).aggregates?.length === 2);
  check("sum field kept", order(s).aggregates?.[1].field === "price");
  check("relations untouched", order(s).relations?.length === 2);

  s = ok("removeAggregate", s, { type: "removeAggregate", resource: "Order", name: "itemCount" });
  check("one aggregate left", order(s).aggregates?.length === 1 && order(s).aggregates?.[0].name === "total");

  // failures
  ko("agg bad op", base(), { type: "addAggregate", resource: "Order", name: "x", op: "median" as never, relation: "items" }, "op invalide");
  ko("agg count with field", base(), { type: "addAggregate", resource: "Order", name: "x", op: "count", relation: "items", field: "price" }, "count");
  ko("agg sum without field", base(), { type: "addAggregate", resource: "Order", name: "x", op: "sum", relation: "items" }, "exige un");
  ko("agg duplicate name", s, { type: "addAggregate", resource: "Order", name: "total", op: "avg", relation: "items", field: "price" }, "existe déjà");
  ko("agg remove absent", base(), { type: "removeAggregate", resource: "Order", name: "ghost" }, "Aucun aggregate");
}

// ── softDelete / timestamps ─────────────────────────────────────────────────────
{
  let s = base();
  s = ok("setSoftDelete true", s, { type: "setSoftDelete", resource: "Order", enabled: true });
  check("softDelete on", order(s).softDelete === true);
  s = ok("setSoftDelete false", s, { type: "setSoftDelete", resource: "Order", enabled: false });
  check("softDelete off", order(s).softDelete === false);

  s = ok("setTimestamps false", s, { type: "setTimestamps", resource: "Order", enabled: false });
  check("timestamps off", order(s).timestamps === false);
  check("fields intact after flags", Object.keys(order(s).fields).length === 3);

  ko("softDelete missing resource", base(), { type: "setSoftDelete", resource: "Ghost", enabled: true }, "introuvable");
  ko("timestamps missing resource", base(), { type: "setTimestamps", resource: "Ghost", enabled: true }, "introuvable");
}

// ── transactions ────────────────────────────────────────────────────────────────
{
  let s = base();
  s = ok("setTransactions", s, {
    type: "setTransactions", resource: "Order",
    transactions: [
      { trigger: "POST", operations: [{ action: "increment", resource: "Item", field: "price", amount: 1, idFrom: "itemId" }] },
    ],
  });
  check("transactions set", order(s).transactions?.length === 1);
  check("tx trigger", order(s).transactions?.[0].trigger === "POST");
  check("tx op action", order(s).transactions?.[0].operations[0].action === "increment");
  check("relations untouched after tx", order(s).relations?.length === 2);

  // empty array clears
  s = ok("setTransactions empty clears", s, { type: "setTransactions", resource: "Order", transactions: [] });
  check("transactions cleared", order(s).transactions === undefined);

  ko("tx bad trigger", base(), { type: "setTransactions", resource: "Order", transactions: [{ trigger: "GET" as never, operations: [{ action: "create", resource: "Item" }] }] }, "trigger invalide");
  ko("tx bad action", base(), { type: "setTransactions", resource: "Order", transactions: [{ trigger: "POST", operations: [{ action: "foo" as never, resource: "Item" }] }] }, "action invalide");
  ko("tx empty operations", base(), { type: "setTransactions", resource: "Order", transactions: [{ trigger: "POST", operations: [] }] }, "non vide");
}

// ── original spec immutability across an op ────────────────────────────────────
{
  const original = base();
  const snapshot = JSON.stringify(original);
  applyOperation(original, { type: "setSoftDelete", resource: "Order", enabled: true });
  applyOperation(original, { type: "addAggregate", resource: "Order", name: "c", op: "count", relation: "items" });
  check("original spec never mutated", JSON.stringify(original) === snapshot);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
