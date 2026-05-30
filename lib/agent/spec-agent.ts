/**
 * Kia agent — the agentic spec-modification loop.
 *
 * Replaces the old "regenerate the whole spec" modification path
 * (buildModificationSystemPrompt → generateAndParseSpec) with a tool-calling
 * agent: the LLM is given the CURRENT spec + the user's request and emits
 * OPERATION calls. Each call is executed and validated by the operation engine
 * (lib/operations/) via the tools in operation-tools.ts. The model never
 * rewrites the spec, so untouched parts can never drift.
 *
 * The loop itself is the Vercel AI SDK's `generateText` multi-step run
 * (`stopWhen: stepCountIs(n)`): model → tool calls → tool results → model …
 * until it stops calling tools or the step budget is exhausted. Multi-provider
 * (Claude / Mistral / Gemini / Groq) comes for free through
 * `resolveAgentModelForTask`, which honours the DB routing (FREE→Mistral,
 * PRO→Claude…) and the DB-resolved API keys.
 */

import { generateText, stepCountIs, type LanguageModel, type ModelMessage } from "ai";
import type { Plan } from "@prisma/client";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";

import type { ConfirmationImpact, Operation } from "@/lib/operations";
import type { ProviderId } from "@/lib/ai-providers";
import { resolveAgentModelForTask } from "./model-resolver";
import {
  buildOperationTools,
  createAgentContext,
  OPERATION_TOOL_COUNT,
  type AgentOperationLogEntry,
} from "./operation-tools";

export type SpecAgentMessage = { role: "user" | "assistant"; content: string };

export type SpecAgentInput = {
  /** The current, already-validated spec to modify. */
  spec: ZeroAPISpec;
  /** Conversation history. The latest user turn drives the modification. */
  messages?: SpecAgentMessage[];
  /** Convenience for a single-shot instruction (used by tests/callers). */
  instruction?: string;
  /** User plan — selects the provider order (routing). */
  plan: Plan;
  /** Inject a model (tests / mock). When omitted, resolved from DB routing. */
  model?: LanguageModel;
  /** Max agent steps (anti-infinite-loop). Default 14. */
  maxSteps?: number;
  signal?: AbortSignal;
};

export type SpecAgentStatus = "applied" | "needs_confirmation" | "no_change" | "error";

export type SpecAgentResult = {
  status: SpecAgentStatus;
  /** The modified spec (or the original, unchanged, on no_change/error). */
  spec: ZeroAPISpec;
  appliedOperations: Operation[];
  pendingConfirmations: ConfirmationImpact[];
  log: AgentOperationLogEntry[];
  /** The agent's natural-language summary / question for the user. */
  message: string;
  provider: ProviderId | "injected";
  model: string;
  steps: number;
  error?: string;
};

const DEFAULT_MAX_STEPS = 14;
const MAX_ATTEMPTS = 2;

function buildSystemPrompt(spec: ZeroAPISpec): string {
  return [
    "Tu es Kia, l'agent de modification d'API de ZeroAPI.",
    "",
    "Tu reçois la SPEC ACTUELLE d'une API et une demande de l'utilisateur.",
    "Tu modifies la spec UNIQUEMENT en appelant les outils d'opération fournis.",
    "Tu ne réécris JAMAIS la spec entière : tu émets des opérations atomiques ciblées.",
    "",
    "Règles :",
    "1. N'applique QUE ce que l'utilisateur a demandé. Ne touche à rien d'autre.",
    "2. Réutilise les noms EXACTS (ressources, champs, rôles) tels qu'ils sont dans la spec.",
    "3. Une opération = un changement atomique. Enchaîne plusieurs appels si besoin.",
    "4. Si un outil renvoie une erreur, lis-la, corrige les paramètres et réessaie.",
    "5. Si un outil renvoie needsConfirmation, l'opération est DESTRUCTIVE et n'a pas été",
    "   exécutée : NE la réémets pas, explique l'impact à l'utilisateur et demande sa",
    "   confirmation explicite. N'invente jamais de confirmation.",
    "6. Quand tu as fini, écris un court résumé en français des changements effectués",
    "   (ou de la confirmation demandée). N'écris jamais de JSON.",
    "",
    "SPEC ACTUELLE (JSON) :",
    "```json",
    JSON.stringify(spec, null, 2),
    "```",
  ].join("\n");
}

function toModelMessages(input: SpecAgentInput): ModelMessage[] {
  let msgs: SpecAgentMessage[] =
    input.messages && input.messages.length > 0
      ? input.messages
      : input.instruction
        ? [{ role: "user", content: input.instruction }]
        : [];
  if (msgs.length === 0) {
    throw new Error("runSpecAgent: ni `messages` ni `instruction` fournis.");
  }
  // Ensure the run ends on a user turn so the model acts rather than continues.
  if (msgs[msgs.length - 1].role !== "user") {
    msgs = [
      ...msgs,
      { role: "user", content: "Applique maintenant les modifications demandées ci-dessus via les outils." },
    ];
  }
  return msgs.map((m) => ({ role: m.role, content: m.content }));
}

/**
 * Runs the agent once. Resolves the model from DB routing (unless one is
 * injected), drives the tool-calling loop, and returns the modified spec plus
 * a full record of what happened. Never throws for operation-level problems —
 * those are reported as `status: "error"` or surfaced as tool feedback to the
 * model. Only truly unexpected failures (no provider, model crash on every
 * attempt) end as `status: "error"`.
 */
export async function runSpecAgent(input: SpecAgentInput): Promise<SpecAgentResult> {
  const maxSteps = input.maxSteps ?? DEFAULT_MAX_STEPS;
  const messages = toModelMessages(input);
  const system = buildSystemPrompt(input.spec);

  let languageModel: LanguageModel;
  let provider: ProviderId | "injected";
  let modelId: string;
  if (input.model) {
    languageModel = input.model;
    provider = "injected";
    modelId = "injected";
  } else {
    const resolved = await resolveAgentModelForTask("spec_generation", input.plan);
    languageModel = resolved.languageModel;
    provider = resolved.provider;
    modelId = resolved.model;
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Fresh context per attempt: a retry must not double-apply operations.
    const ctx = createAgentContext(input.spec);
    const tools = buildOperationTools(ctx);

    try {
      const res = await generateText({
        model: languageModel,
        system,
        messages,
        tools,
        stopWhen: stepCountIs(maxSteps),
        temperature: 0,
        abortSignal: input.signal,
      });

      const status: SpecAgentStatus =
        ctx.pendingConfirmations.length > 0
          ? "needs_confirmation"
          : ctx.appliedOperations.length > 0
            ? "applied"
            : "no_change";

      const message =
        res.text.trim() ||
        (status === "applied"
          ? `${ctx.appliedOperations.length} opération(s) appliquée(s).`
          : status === "needs_confirmation"
            ? "Confirmation requise avant d'appliquer une opération destructive."
            : "Aucune modification à appliquer.");

      return {
        status,
        spec: ctx.spec,
        appliedOperations: ctx.appliedOperations,
        pendingConfirmations: ctx.pendingConfirmations,
        log: ctx.log,
        message,
        provider,
        model: modelId,
        steps: res.steps.length,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(
        `[spec-agent] attempt ${attempt}/${MAX_ATTEMPTS} failed (provider=${provider}, model=${modelId}): ${lastError.message}`,
      );
    }
  }

  return {
    status: "error",
    spec: input.spec,
    appliedOperations: [],
    pendingConfirmations: [],
    log: [],
    message:
      "L'agent n'a pas pu appliquer la modification (erreur du fournisseur LLM). Réessaie dans un instant.",
    provider,
    model: modelId,
    steps: 0,
    error: lastError?.message,
  };
}

/** Number of operation tools the agent exposes (for diagnostics). */
export { OPERATION_TOOL_COUNT };
