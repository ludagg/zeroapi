/** Environment variable operations (OPERATIONS.md §2.9). */

import type {
  EnvVarDefinition,
  GlobalAuthConfig,
  ZeroAPISpec,
} from "@ludagg/zeroapi-runtime";
import type { AddEnvVarOp, ModifyEnvVarOp, RemoveEnvVarOp } from "./types";
import { ConfirmationRequiredError, OperationError } from "./types";
import { clone, requireNonEmpty } from "./helpers";

export function addEnvVar(spec: ZeroAPISpec, op: AddEnvVarOp): ZeroAPISpec {
  requireNonEmpty(op.name, "name");
  if ((spec.env ?? []).some((e) => e.name === op.name)) {
    throw new OperationError(
      `La variable d'environnement "${op.name}" existe déjà (utilisez modifyEnvVar)`,
    );
  }
  const entry: EnvVarDefinition = { name: op.name, required: op.required ?? false };
  if (op.generate !== undefined) entry.generate = op.generate;
  if (op.managedByCloud !== undefined) entry.managedByCloud = op.managedByCloud;
  if (op.description !== undefined) entry.description = op.description;

  const next = clone(spec);
  next.env = [...(next.env ?? []), entry];
  return next;
}

export function modifyEnvVar(spec: ZeroAPISpec, op: ModifyEnvVarOp): ZeroAPISpec {
  if (!(spec.env ?? []).some((e) => e.name === op.name)) {
    throw new OperationError(`La variable d'environnement "${op.name}" n'existe pas`);
  }
  const next = clone(spec);
  const entry = next.env!.find((e) => e.name === op.name)!;
  if (op.required !== undefined) entry.required = op.required;
  if (op.generate !== undefined) entry.generate = op.generate;
  if (op.managedByCloud !== undefined) entry.managedByCloud = op.managedByCloud;
  if (op.description !== undefined) entry.description = op.description;
  return next;
}

/** Env var names referenced by the auth config. */
function envReferences(spec: ZeroAPISpec, name: string): string[] {
  const refs: string[] = [];
  const auth = spec.auth as GlobalAuthConfig | undefined;
  if (!auth) return refs;
  if (auth.jwt?.secretEnv === name) refs.push("auth.jwt.secretEnv");
  for (const p of auth.oauth?.providers ?? []) {
    if (p.clientIdEnv === name) refs.push(`auth.oauth (${p.name}.clientIdEnv)`);
    if (p.clientSecretEnv === name) refs.push(`auth.oauth (${p.name}.clientSecretEnv)`);
  }
  return refs;
}

export function removeEnvVar(spec: ZeroAPISpec, op: RemoveEnvVarOp): ZeroAPISpec {
  if (!(spec.env ?? []).some((e) => e.name === op.name)) {
    throw new OperationError(`La variable d'environnement "${op.name}" n'existe pas`);
  }
  const refs = envReferences(spec, op.name);
  if (refs.length > 0 && !op.confirmed) {
    throw new ConfirmationRequiredError(
      "removeEnvVar",
      `La variable "${op.name}" est référencée par ${refs.length} élément(s). Confirmez pour la retirer malgré tout.`,
      refs,
    );
  }
  const next = clone(spec);
  next.env = (next.env ?? []).filter((e) => e.name !== op.name);
  if (next.env.length === 0) delete next.env;
  return next;
}
