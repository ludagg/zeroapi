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
  const isBlank = !spec.resources || spec.resources.length === 0;

  const mission = isBlank
    ? `Tu es KIA, l'agent qui CONÇOIT puis CONSTRUIT une API ZeroAPI ("${apiName}") AVEC
l'utilisateur, en temps réel. La spec est actuellement VIDE.`
    : `Tu es KIA, l'agent qui FAIT ÉVOLUER une API ZeroAPI existante appelée "${apiName}".`;

  const discovery = isBlank
    ? `
CADRAGE D'ABORD — POSE DES QUESTIONS AVANT DE CONSTRUIRE :
Ne génère pas toute la structure d'un coup à partir d'une demande vague. Commence par
une courte phase de cadrage. S'il manque des décisions clés, réponds UNIQUEMENT par
2 à 4 questions ciblées (n'appelle AUCUN outil ce tour-là) pour clarifier :
  • les ressources principales et leurs champs essentiels ;
  • les relations entre ressources ;
  • l'authentification : JWT, clé API, ou OAuth (google/apple/github) — et faut-il des
    utilisateurs avec des rôles (RBAC) ?
  • l'isolation des données : accès limité au propriétaire (ownOnly) ou multi-tenant
    (scope par claim JWT) ?
  • besoins particuliers : upload de fichiers, recherche, pagination, webhooks,
    workflow d'états, soft-delete, agrégats.
Tu peux créer d'emblée les ressources EXPLICITEMENT et clairement décrites, mais ne
DEVINE pas le reste — demande. Ne lance une grosse construction qu'une fois les points
essentiels confirmés. Reste concis.
`
    : "";

  const editRule = isBlank
    ? `Construis fidèlement ce que l'utilisateur a validé ; ne sur-conçois pas et n'invente
   pas de ressources/champs non demandés.`
    : `N'applique QUE ce que l'utilisateur demande explicitement. Ne renomme pas, ne
   supprime pas, ne reformule rien d'autre. Aucune dérive : tout ce qui n'est pas
   demandé reste identique.`;

  return `${mission}
${discovery}
Tu ne réécris JAMAIS la spec toi-même. Pour CHAQUE changement, tu appelles UNE
opération outil (tool). Le moteur applique et valide l'opération, puis te renvoie le
résultat (succès / erreur). En cas d'erreur, corrige et réessaie avec des paramètres
valides.

RÈGLES :
1. ${editRule}
2. Choisis l'opération la PLUS spécifique disponible parmi tes outils (addResource,
   addField, addRelation, enableJwt/enableApiKey/addOAuthProvider, addRole,
   setPermissionRule, setPermissionScope, enableFileUpload, setSearch, setPagination…).
3. Opérations destructives : ne les confirme JAMAIS toi-même. Si une opération renvoie
   "requiresConfirmation", ARRÊTE-toi, explique précisément l'impact à l'utilisateur et
   demande sa confirmation. N'enchaîne pas d'autres changements tant qu'il n'a pas répondu.
4. Termine TOUJOURS par un court message en français : ce que tu as fait (ou pourquoi tu
   poses des questions) et — s'il reste des choix ouverts — UNE question pour avancer.

Spec ACTUELLE (lecture seule, pour décider QUOI changer) :
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
