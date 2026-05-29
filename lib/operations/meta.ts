/** Meta operations (OPERATIONS.md §2.1) — name, description, global rate limit. */

import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type {
  ClearGlobalRateLimitOp,
  SetApiDescriptionOp,
  SetApiNameOp,
  SetGlobalRateLimitOp,
} from "./types";
import { OperationError } from "./types";
import { clone, requireNonEmpty } from "./helpers";

export function setApiName(spec: ZeroAPISpec, op: SetApiNameOp): ZeroAPISpec {
  requireNonEmpty(op.name, "name");
  const next = clone(spec);
  next.name = op.name;
  return next;
}

export function setApiDescription(
  spec: ZeroAPISpec,
  op: SetApiDescriptionOp,
): ZeroAPISpec {
  const next = clone(spec);
  if (op.description === undefined || op.description === "") {
    delete next.description;
  } else {
    next.description = op.description;
  }
  return next;
}

export function setGlobalRateLimit(
  spec: ZeroAPISpec,
  op: SetGlobalRateLimitOp,
): ZeroAPISpec {
  if (!Number.isFinite(op.windowMs) || op.windowMs <= 0) {
    throw new OperationError("windowMs doit être un nombre positif");
  }
  if (!Number.isFinite(op.max) || op.max <= 0) {
    throw new OperationError("max doit être un nombre positif");
  }
  const next = clone(spec);
  next.rateLimit = { ...next.rateLimit, windowMs: op.windowMs, max: op.max };
  return next;
}

export function clearGlobalRateLimit(
  spec: ZeroAPISpec,
  _op: ClearGlobalRateLimitOp,
): ZeroAPISpec {
  const next = clone(spec);
  delete next.rateLimit;
  return next;
}
