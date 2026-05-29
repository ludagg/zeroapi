/**
 * Operation engine — public surface.
 *
 * The MOTEUR D'OPÉRATIONS applies atomic, validated edits to a ZeroAPISpec
 * without regenerating it. Each operation is a pure function (spec, params) →
 * new validated spec; the original is never mutated and the spec is never
 * rewritten wholesale. See OPERATIONS.md for the full design.
 */

export * from "./types";
export { applyOperation, applyOperations, runValidationGate } from "./executor";
export { dispatch, OPERATION_DANGER, OPERATION_COUNT } from "./registry";
