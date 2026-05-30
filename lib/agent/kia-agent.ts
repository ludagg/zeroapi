/**
 * KIA agent — the incremental-modification loop.
 *
 * Instead of regenerating the whole spec (the old `buildModificationSystemPrompt`
 * path, which drifts), KIA runs a tool-calling loop: the model is given the
 * CURRENT spec as read-only context plus one tool per engine operation. It emits
 * operation CALLS; the engine (`applyOperation`, transactional, validated)
 * executes them and feeds ok/error back so the model can self-correct. The model
 * never writes the spec — it only decides WHAT to change.
 *
 * Multi-provider: this module is provider-agnostic — it takes a resolved Vercel
 * AI SDK `LanguageModel`. `runKiaModification` (run-modification.ts) wires it to
 * `resolveAgentModelForTask`, so the same FREE→Mistral / PRO→Claude routing and
 * DB-resolved keys used elsewhere apply here too.
 */

import { generateText, stepCountIs, type LanguageModel, type ModelMessage } from "ai";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type { ConfirmationImpact, OperationType } from "../operations/types";
import {
  createOperationToolset,
  type AppliedOperationLog,
} from "./tools";

export interface KiaAgentParams {
  /** Resolved tool-calling-capable model (injected for tests). */
  model: LanguageModel;
  /** The spec to modify (never mutated; the result is a new object). */
  spec: ZeroAPISpec;
  /** Conversation driving the change; the last user turn is the instruction. */
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Display name used in the prompt (defaults to spec.name). */
  apiName?: string;
  /** Hard cap on agent steps (anti-infinite-loop). Default 12. */
  maxSteps?: number;
  /** Operation types the user has explicitly approved (enables `confirmed`). */
  approvedConfirmations?: Iterable<OperationType>;
  /** Sampling temperature. Low by default for deterministic edits. */
  temperature?: number;
  /** Per-operation logger (success or failure). */
  logger?: (entry: AppliedOperationLog) => void;
}

export interface KiaAgentResult {
  /** Final working spec after all applied operations. */
  spec: ZeroAPISpec;
  /** True when at least one operation was applied. */
  changed: boolean;
  /** Full ordered log of emitted operations. */
  operations: AppliedOperationLog[];
  /** Number of operations actually applied. */
  appliedCount: number;
  /** Impacts of destructive operations awaiting user confirmation. */
  pendingConfirmations: ConfirmationImpact[];
  /** The model's final natural-language message (summary / questions). */
  assistantText: string;
  /** Number of LLM steps taken. */
  steps: number;
  /** Final finish reason from the SDK. */
  finishReason: string;
  /** Set when the loop aborted (provider/transport error). */
  error?: string;
}

function buildSystemPrompt(apiName: string, spec: ZeroAPISpec): string {
  return `Tu es KIA, l'agent qui MODIFIE une API ZeroAPI existante appelée "${apiName}".

Tu ne réécris JAMAIS la spec toi-même. Pour CHAQUE changement demandé, tu appelles
UNE opération outil (tool). Le moteur applique et valide l'opération, puis te
renvoie le résultat (succès / erreur). En cas d'erreur, corrige et réessaie avec
des paramètres valides.

RÈGLES :
1. N'applique QUE ce que l'utilisateur demande explicitement. Ne renomme pas, ne
   supprime pas, ne reformule rien d'autre. Aucune dérive : tout ce qui n'est pas
   demandé reste identique.
2. Choisis l'opération la PLUS spécifique (ex. addField plutôt que de recréer la
   ressource ; setPermissionScope pour le multi-tenant ; setStateMachine pour un
   workflow d'états).
3. Opérations destructives ([destructive]) : ne les confirme JAMAIS toi-même. Si
   une opération renvoie "requiresConfirmation", ARRÊTE-toi, explique précisément
   l'impact à l'utilisateur et demande sa confirmation. N'enchaîne pas d'autres
   changements liés tant qu'il n'a pas répondu.
4. Quand tout est appliqué, réponds en français par un court résumé des
   changements effectués (et des éventuelles confirmations en attente).

Voici la spec ACTUELLE (lecture seule, pour décider QUOI changer) :
\`\`\`json
${JSON.stringify(spec, null, 2)}
\`\`\``;
}

/**
 * Run the KIA modification loop. Returns the modified (validated) spec plus the
 * operation log, pending confirmations, and the model's closing message.
 */
export async function runKiaAgent(params: KiaAgentParams): Promise<KiaAgentResult> {
  const {
    model,
    spec,
    messages,
    apiName = spec.name,
    maxSteps = 12,
    approvedConfirmations,
    temperature = 0.2,
    logger,
  } = params;

  const toolset = createOperationToolset(spec, {
    approvedConfirmations,
    onOperation: logger,
  });

  const system = buildSystemPrompt(apiName, spec);
  const modelMessages: ModelMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let assistantText = "";
  let steps = 0;
  let finishReason = "stop";
  let error: string | undefined;

  try {
    const result = await generateText({
      model,
      system,
      messages: modelMessages,
      tools: toolset.tools,
      stopWhen: stepCountIs(maxSteps),
      temperature,
    });
    assistantText = result.text;
    steps = result.steps.length;
    finishReason = result.finishReason;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const operations = toolset.getLog();
  const appliedCount = operations.filter((o) => o.outcome === "applied").length;

  return {
    spec: toolset.getSpec(),
    changed: appliedCount > 0,
    operations,
    appliedCount,
    pendingConfirmations: toolset.getPendingConfirmations(),
    assistantText,
    steps,
    finishReason,
    error,
  };
}
