/** authFlows operations (OPERATIONS.md §2.8). */

import type { AuthFlowsConfig, ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type { SetAuthFlowOp } from "./types";
import { OperationError } from "./types";
import { clone, isJwtEnabled } from "./helpers";

const VALID_FLOWS = [
  "passwordReset",
  "refreshTokens",
  "revocation",
  "emailVerification",
] as const;

/** Flows that only make sense with a JWT user system. */
const JWT_REQUIRED: ReadonlySet<string> = new Set([
  "passwordReset",
  "refreshTokens",
  "revocation",
  "emailVerification",
]);

export function setAuthFlow(spec: ZeroAPISpec, op: SetAuthFlowOp): ZeroAPISpec {
  if (!(VALID_FLOWS as readonly string[]).includes(op.flow)) {
    throw new OperationError(
      `flow invalide "${op.flow}" (autorisés : ${VALID_FLOWS.join(", ")})`,
    );
  }
  if (op.value && JWT_REQUIRED.has(op.flow) && !isJwtEnabled(spec)) {
    throw new OperationError(
      `Le flow "${op.flow}" nécessite auth.jwt.enabled = true — activez JWT d'abord`,
    );
  }
  const next = clone(spec);
  const flows: AuthFlowsConfig = { ...next.authFlows };
  flows[op.flow] = op.value;
  next.authFlows = flows;
  return next;
}
