/**
 * Operation executor (OPERATIONS.md §4.2).
 *
 *   applyOperation(spec, op)   — pure mutation → VALIDATION GATE → result.
 *   applyOperations(spec, ops) — transactional sequence (all-or-nothing).
 *
 * The validation gate reuses the EXISTING pipeline from lib/spec.ts unchanged:
 *   normalizeSpecCandidate → validateSpecCandidate → parseSpec
 * run on the OBJECT (not text). If the gate rejects the mutated spec, the
 * operation is refused and the caller's original spec is left untouched — there
 * is never a broken intermediate state.
 *
 * The returned spec is the AUTHORED shape (the pure mutation result), not
 * parseSpec's canonicalised output. parseSpec augments specs (it merges
 * top-level relations into per-resource `relations`); using it only as a
 * validity gate keeps the working spec stable and safely re-feedable into the
 * next operation.
 */

import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import {
  normalizeSpecCandidate,
  parseSpec,
  validateSpecCandidate,
} from "../spec";
import { dispatch } from "./registry";
import {
  ConfirmationRequiredError,
  OperationError,
  type ApplyResult,
  type Operation,
} from "./types";

/**
 * Runs the existing validation pipeline against a mutated spec object.
 * Returns `null` when valid, or a human-readable French error otherwise.
 * Never mutates its argument (it clones before normalising/parsing).
 */
export function runValidationGate(candidate: ZeroAPISpec): string | null {
  try {
    const normalized = normalizeSpecCandidate(structuredClone(candidate));
    validateSpecCandidate(normalized);
    parseSpec(structuredClone(normalized));
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/**
 * Apply a single operation. The pure mutators clone internally, so `spec` is
 * never mutated. On any failure the result is `{ ok: false }` and `spec` stays
 * intact.
 */
export function applyOperation(spec: ZeroAPISpec, op: Operation): ApplyResult {
  let mutated: ZeroAPISpec;
  try {
    mutated = dispatch(spec, op);
  } catch (e) {
    if (e instanceof ConfirmationRequiredError) {
      return { ok: false, error: e.message, requiresConfirmation: e.impact };
    }
    if (e instanceof OperationError) {
      return { ok: false, error: e.message };
    }
    return {
      ok: false,
      error: `Erreur inattendue pendant "${op.type}" : ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const gateError = runValidationGate(mutated);
  if (gateError) {
    // Reject: the spec the operation produced is invalid → keep the original.
    return {
      ok: false,
      error: `L'opération "${op.type}" produirait une spec invalide : ${gateError}`,
    };
  }
  return { ok: true, spec: mutated };
}

/**
 * Apply a sequence of operations transactionally (OPERATIONS.md §4.2).
 * Operations run on a working copy; if ANY fails, nothing is committed and the
 * caller's original `spec` is preserved (atomic rollback). On full success the
 * final validated spec is returned.
 */
export function applyOperations(
  spec: ZeroAPISpec,
  ops: Operation[],
): ApplyResult {
  let working = spec;
  for (let i = 0; i < ops.length; i++) {
    const res = applyOperation(working, ops[i]);
    if (!res.ok) {
      return {
        ok: false,
        error: `Transaction annulée à l'opération ${i + 1}/${ops.length} ("${ops[i].type}") : ${res.error}`,
        requiresConfirmation: res.requiresConfirmation,
      };
    }
    working = res.spec;
  }
  return { ok: true, spec: working };
}
