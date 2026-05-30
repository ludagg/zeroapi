/** State-machine operations (ResourceDefinition.stateMachine, runtime 0.19.0+). */

import type { ResourceDefinition, ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type { StateMachineDef, StateTransition } from "../spec";
import type {
  AddStateTransitionOp,
  RemoveStateMachineOp,
  RemoveStateTransitionOp,
  SetStateMachineOp,
} from "./types";
import { ConfirmationRequiredError, OperationError } from "./types";
import { clone, getResource, requireNonEmpty } from "./helpers";

/** Read the declared enum values of `field` on `resource`, or throw. */
function enumValues(resource: ResourceDefinition, field: string): string[] {
  const def = resource.fields[field];
  if (!def) {
    throw new OperationError(
      `Le champ "${field}" n'existe pas sur "${resource.name}"`,
    );
  }
  if (def.type !== "enum") {
    throw new OperationError(
      `Le champ "${field}" de "${resource.name}" doit être de type enum pour porter une state machine`,
    );
  }
  return Array.isArray(def.values)
    ? def.values.filter((v): v is string => typeof v === "string")
    : [];
}

/** setStateMachine — install/replace the machine on an enum field. */
export function setStateMachine(
  spec: ZeroAPISpec,
  op: SetStateMachineOp,
): ZeroAPISpec {
  const r = getResource(spec, op.resource);
  requireNonEmpty(op.field, "field");
  requireNonEmpty(op.initial, "initial");
  if (!Array.isArray(op.transitions)) {
    throw new OperationError("transitions doit être un tableau");
  }
  const values = enumValues(r, op.field);
  if (!values.includes(op.initial)) {
    throw new OperationError(
      `initial "${op.initial}" n'est pas une valeur de l'enum "${op.field}"`,
    );
  }
  for (const t of op.transitions) {
    if (!t || typeof t !== "object") {
      throw new OperationError("chaque transition doit être un objet { from, to, roles? }");
    }
    if (!values.includes(t.from)) {
      throw new OperationError(`transition depuis "${t.from}" — valeur absente de l'enum "${op.field}"`);
    }
    if (!values.includes(t.to)) {
      throw new OperationError(`transition vers "${t.to}" — valeur absente de l'enum "${op.field}"`);
    }
  }

  const sm: StateMachineDef = {
    field: op.field,
    initial: op.initial,
    transitions: op.transitions.map((t) => {
      const out: StateTransition = { from: t.from, to: t.to };
      if (t.roles && t.roles.length > 0) out.roles = [...t.roles];
      return out;
    }),
  };

  const next = clone(spec);
  getResource(next, op.resource).stateMachine = sm;
  return next;
}

/** addStateTransition — append a transition to an existing machine (dedup). */
export function addStateTransition(
  spec: ZeroAPISpec,
  op: AddStateTransitionOp,
): ZeroAPISpec {
  const r = getResource(spec, op.resource);
  const sm = r.stateMachine;
  if (!sm) {
    throw new OperationError(
      `"${op.resource}" n'a pas de state machine — utilisez setStateMachine d'abord`,
    );
  }
  const values = enumValues(r, sm.field);
  if (!values.includes(op.from)) {
    throw new OperationError(`transition depuis "${op.from}" — valeur absente de l'enum "${sm.field}"`);
  }
  if (!values.includes(op.to)) {
    throw new OperationError(`transition vers "${op.to}" — valeur absente de l'enum "${sm.field}"`);
  }
  if (sm.transitions.some((t) => t.from === op.from && t.to === op.to)) {
    throw new OperationError(`la transition "${op.from}" → "${op.to}" existe déjà`);
  }

  const transition: StateTransition = { from: op.from, to: op.to };
  if (op.roles && op.roles.length > 0) transition.roles = [...op.roles];

  const next = clone(spec);
  getResource(next, op.resource).stateMachine!.transitions.push(transition);
  return next;
}

/** removeStateTransition — drop a single transition (error if absent). */
export function removeStateTransition(
  spec: ZeroAPISpec,
  op: RemoveStateTransitionOp,
): ZeroAPISpec {
  const r = getResource(spec, op.resource);
  const sm = r.stateMachine;
  if (!sm || !sm.transitions.some((t) => t.from === op.from && t.to === op.to)) {
    throw new OperationError(
      `Aucune transition "${op.from}" → "${op.to}" sur "${op.resource}"`,
    );
  }
  const next = clone(spec);
  const nsm = getResource(next, op.resource).stateMachine!;
  nsm.transitions = nsm.transitions.filter(
    (t) => !(t.from === op.from && t.to === op.to),
  );
  return next;
}

/** removeStateMachine — destructive: drops the whole machine (needs confirm). */
export function removeStateMachine(
  spec: ZeroAPISpec,
  op: RemoveStateMachineOp,
): ZeroAPISpec {
  const r = getResource(spec, op.resource);
  if (!r.stateMachine) {
    throw new OperationError(`"${op.resource}" n'a pas de state machine`);
  }
  if (!op.confirmed) {
    const sm = r.stateMachine;
    throw new ConfirmationRequiredError(
      "removeStateMachine",
      `Supprimer la state machine de "${op.resource}" retirera la garde sur le champ "${sm.field}" (${sm.transitions.length} transition(s)).`,
      [
        `champ gouverné : ${sm.field}`,
        `état initial : ${sm.initial}`,
        `${sm.transitions.length} transition(s) supprimée(s)`,
      ],
    );
  }
  const next = clone(spec);
  delete getResource(next, op.resource).stateMachine;
  return next;
}
