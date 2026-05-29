/**
 * Spec modification agent — the tool-calling loop.
 *
 * Replaces the full-spec regeneration path (buildModificationSystemPrompt) with
 * an agent that emits OPERATION CALLS. The model decides WHAT to change; the
 * (tested) operation engine executes and validates. The spec is NEVER rewritten
 * by the model.
 *
 * The loop is provider-agnostic and network-free: the LLM is injected as a
 * `ToolCallingModel`. The production implementation (anthropic-model.ts) wraps
 * the Anthropic SDK with native tool calling; tests inject a scripted mock.
 *
 * Per turn, all well-formed tool calls are applied as ONE transaction via
 * `applyOperations` (atomic — OPERATIONS.md §4.2). On a validation error the
 * result is fed back so the model can correct. A destructive operation that
 * needs confirmation STOPS the loop and surfaces the computed impact to the
 * caller — the agent never self-confirms.
 */

import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import {
  applyOperations,
  type ConfirmationImpact,
  type Operation,
} from "../operations";
import { buildAgentSystemPrompt } from "./system-prompt";
import { OPERATION_TOOLS, toolUseToOperation, type ToolDefinition } from "./tools";

// ── Provider-agnostic model contract ─────────────────────────────────────────

export type AgentTextBlock = { type: "text"; text: string };
export type AgentToolUseBlock = { type: "tool_use"; id: string; name: string; input: unknown };
export type AgentAssistantBlock = AgentTextBlock | AgentToolUseBlock;
export type AgentToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
};

export type AgentMessage =
  | { role: "user"; content: string | AgentToolResultBlock[] }
  | { role: "assistant"; content: AgentAssistantBlock[] };

export interface ModelUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface ModelResponse {
  content: AgentAssistantBlock[];
  stopReason?: string | null;
  usage?: ModelUsage;
}

export interface ToolCallingModel {
  generate(input: {
    system: string;
    messages: AgentMessage[];
    tools: ToolDefinition[];
  }): Promise<ModelResponse>;
}

// ── Agent result ─────────────────────────────────────────────────────────────

export type SpecAgentStatus =
  | "applied" // ≥1 operation applied, spec changed & valid
  | "no_change" // model answered without changing anything
  | "needs_confirmation" // a destructive op needs explicit user confirmation
  | "max_iterations" // loop cap reached
  | "error"; // model/transport error

export interface SpecAgentResult {
  status: SpecAgentStatus;
  /** Resulting spec (the original, untouched, unless status === "applied"). */
  spec: ZeroAPISpec;
  /** Operations successfully applied, in order (audit log). */
  operations: Operation[];
  /** Final natural-language message from the model (French). */
  assistantMessage: string;
  /** Present iff status === "needs_confirmation". */
  confirmation?: ConfirmationImpact & { pendingOperations: Operation[] };
  error?: string;
  iterations: number;
  usage: ModelUsage;
}

export interface RunSpecAgentOptions {
  model: ToolCallingModel;
  spec: ZeroAPISpec;
  userMessage: string;
  /** Override the system prompt (defaults to the catalogue-aware prompt). */
  system?: string;
  tools?: ToolDefinition[];
  /** Hard cap on tool-calling rounds (default 8). */
  maxIterations?: number;
  /** Called with the operations applied on each successful turn (for logging). */
  onOperations?: (operations: Operation[]) => void;
}

function addUsage(a: ModelUsage, b?: ModelUsage): ModelUsage {
  if (!b) return a;
  return {
    inputTokens: (a.inputTokens ?? 0) + (b.inputTokens ?? 0),
    outputTokens: (a.outputTokens ?? 0) + (b.outputTokens ?? 0),
  };
}

/**
 * Runs the agent until the model stops calling tools, a confirmation is needed,
 * or the iteration cap is hit. The input `spec` is never mutated.
 */
export async function runSpecAgent(
  opts: RunSpecAgentOptions,
): Promise<SpecAgentResult> {
  const tools = opts.tools ?? OPERATION_TOOLS;
  const system = opts.system ?? buildAgentSystemPrompt(opts.spec);
  const maxIterations = opts.maxIterations ?? 8;

  let working: ZeroAPISpec = opts.spec;
  const applied: Operation[] = [];
  const messages: AgentMessage[] = [{ role: "user", content: opts.userMessage }];
  let assistantMessage = "";
  let usage: ModelUsage = {};

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    let response: ModelResponse;
    try {
      response = await opts.model.generate({ system, messages, tools });
    } catch (e) {
      return {
        status: "error",
        spec: working,
        operations: applied,
        assistantMessage,
        error: `Erreur du modèle : ${e instanceof Error ? e.message : String(e)}`,
        iterations: iteration,
        usage,
      };
    }
    usage = addUsage(usage, response.usage);

    const text = response.content
      .filter((b): b is AgentTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (text) assistantMessage = text;

    const toolUses = response.content.filter(
      (b): b is AgentToolUseBlock => b.type === "tool_use",
    );

    // Record the assistant turn so the model keeps its tool_use context.
    messages.push({ role: "assistant", content: response.content });

    if (toolUses.length === 0) {
      // The model is done — it answered without (further) tool calls.
      return {
        status: applied.length > 0 ? "applied" : "no_change",
        spec: working,
        operations: applied,
        assistantMessage,
        iterations: iteration,
        usage,
      };
    }

    // Convert tool calls → operations, separating malformed ones.
    const results: AgentToolResultBlock[] = [];
    const wellFormed: Array<{ id: string; op: Operation }> = [];
    for (const tu of toolUses) {
      const conv = toolUseToOperation(tu.name, tu.input);
      if (conv.ok) {
        wellFormed.push({ id: tu.id, op: conv.operation });
      } else {
        results.push({ type: "tool_result", tool_use_id: tu.id, content: conv.error, is_error: true });
      }
    }

    if (wellFormed.length > 0) {
      const txOps = wellFormed.map((w) => w.op);
      const res = applyOperations(working, txOps);

      if (res.ok) {
        working = res.spec;
        applied.push(...txOps);
        opts.onOperations?.(txOps);
        for (const { id, op } of wellFormed) {
          results.push({ type: "tool_result", tool_use_id: id, content: `OK — ${op.type} appliquée.` });
        }
      } else if (res.requiresConfirmation) {
        // A destructive op needs the user's go-ahead. Stop and surface impact.
        return {
          status: "needs_confirmation",
          spec: working, // unchanged: the transaction rolled back
          operations: applied,
          assistantMessage,
          confirmation: { ...res.requiresConfirmation, pendingOperations: txOps },
          iterations: iteration,
          usage,
        };
      } else {
        // Validation/precheck error → feed it back so the model can fix it.
        for (const { id } of wellFormed) {
          results.push({ type: "tool_result", tool_use_id: id, content: `ERREUR — ${res.error}`, is_error: true });
        }
      }
    }

    messages.push({ role: "user", content: results });
  }

  return {
    status: "max_iterations",
    spec: working,
    operations: applied,
    assistantMessage:
      assistantMessage ||
      "Je n'ai pas pu terminer la modification dans le nombre d'étapes autorisé.",
    iterations: maxIterations,
    usage,
  };
}
