/**
 * Route-facing wrapper that wires the KIA agent to the existing multi-provider
 * routing + DB key resolution.
 *
 * This is the ONLY place the agent touches `resolveAgentModelForTask`, so the
 * pure loop (`kia-agent.ts`) stays provider-agnostic and offline-testable.
 * Routing reuses the `"conversation"` task by default, which honours the same
 * admin matrix as the chat path (FREE→Mistral, PRO→Claude, …).
 */

import type { Plan } from "@prisma/client";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type { RoutingTask } from "@/lib/llm-routing-config";
import { resolveAgentModelForTask } from "@/lib/agent/model-resolver";
import { runKiaAgent, type KiaAgentResult } from "@/lib/agent/kia-agent";
import type { OperationType } from "@/lib/operations/types";
import type { AppliedOperationLog } from "@/lib/agent/tools";

export interface RunKiaModificationParams {
  plan: Plan;
  spec: ZeroAPISpec;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  apiName?: string;
  task?: RoutingTask;
  maxSteps?: number;
  approvedConfirmations?: Iterable<OperationType>;
}

export interface RunKiaModificationResult extends KiaAgentResult {
  provider: string;
  model: string;
}

export async function runKiaModification(
  params: RunKiaModificationParams,
): Promise<RunKiaModificationResult> {
  const { plan, task = "conversation", ...rest } = params;
  const resolved = await resolveAgentModelForTask(task, plan);

  const operations: AppliedOperationLog[] = [];
  const result = await runKiaAgent({
    model: resolved.languageModel,
    ...rest,
    logger: (entry) => {
      operations.push(entry);
      console.log(
        `[kia-agent] ${entry.outcome} ${entry.type} (${entry.danger})` +
          (entry.error ? ` — ${entry.error}` : ""),
      );
    },
  });

  return { ...result, provider: resolved.provider, model: resolved.model };
}
