/**
 * High-level entry point for incremental spec modification.
 *
 * `modifySpecWithAgent` resolves the Anthropic model, runs the agent loop, and
 * returns the structured result. `confirmAndApply` is the follow-up used once a
 * user has confirmed a destructive operation: it force-confirms the pending
 * operations and re-runs them through the (validating) transactional executor.
 */

import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import {
  applyOperations,
  type ApplyResult,
  type Operation,
} from "../operations";
import { resolveAnthropicModel } from "./anthropic-model";
import { runSpecAgent, type SpecAgentResult } from "./spec-agent";

export interface ModifySpecOptions {
  spec: ZeroAPISpec;
  userMessage: string;
  /** Optional per-turn operation logger (e.g. write to AgentLog). */
  onOperations?: (operations: Operation[]) => void;
  maxIterations?: number;
}

/**
 * Runs the modification agent against the current spec. Never mutates `spec`.
 * The returned `SpecAgentResult` carries the new spec (when applied), the
 * operations performed, the assistant message, and any confirmation request.
 */
export async function modifySpecWithAgent(
  opts: ModifySpecOptions,
): Promise<SpecAgentResult> {
  const model = await resolveAnthropicModel();
  return runSpecAgent({
    model,
    spec: opts.spec,
    userMessage: opts.userMessage,
    onOperations: opts.onOperations,
    maxIterations: opts.maxIterations,
  });
}

/**
 * Applies operations the user has explicitly CONFIRMED. Destructive operations
 * are force-confirmed here (the agent itself never sets `confirmed`). The result
 * still passes through the validation gate, so a tampered/invalid set is
 * rejected and the original spec is preserved.
 */
export function confirmAndApply(
  spec: ZeroAPISpec,
  operations: Operation[],
): ApplyResult {
  const confirmed = operations.map(
    (op) => ({ ...op, confirmed: true }) as Operation,
  );
  return applyOperations(spec, confirmed);
}
