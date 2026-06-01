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
  /** Hard cap on agent steps (anti-infinite-loop). Default 48 — high enough to
   *  build a complete multi-resource API in one turn. */
  maxSteps?: number;
  /** Operation types the user has explicitly approved (enables `confirmed`). */
  approvedConfirmations?: Iterable<OperationType>;
  /** Sampling temperature. Low by default for deterministic edits. */
  temperature?: number;
  /** Per-operation logger (success or failure). */
  logger?: (entry: AppliedOperationLog) => void;
  /** Live callback fired with the post-op spec as each operation is applied
   *  (used to stream the build to the client). */
  onOperationApplied?: (entry: AppliedOperationLog, currentSpec: ZeroAPISpec) => void;
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
l'utilisateur, en temps réel, en appelant des opérations-outils. La spec est VIDE.`
    : `Tu es KIA, l'agent qui FAIT ÉVOLUER une API ZeroAPI existante appelée "${apiName}",
en appelant des opérations-outils.`;

  // ── Phase de cadrage (création seulement) ──────────────────────────────────
  const discovery = isBlank
    ? `
═══ ÉTAPE 1 — CADRAGE (pose des questions AVANT de construire) ═══
N'invente pas une grosse structure à partir d'une demande vague. D'abord, COMPRENDS le
besoin métier. S'il manque des décisions clés, réponds UNIQUEMENT par 2 à 3 questions
ciblées (n'appelle AUCUN outil ce tour-là). Détecte le domaine et PROPOSE plutôt que
d'interroger à l'aveugle :
  • e-commerce → JWT + User↔Order↔Product + upload images + ownOnly sur les commandes
    + transaction qui décrémente le stock à la création d'une Order + softDelete sur les commandes.
  • blog/CMS → JWT + Article→Comment (oneToMany) + Article↔Tag (manyToMany) + ownOnly + softDelete.
  • SaaS B2B → JWT (+apikey) + rôles owner/admin/member + scope multi-tenant + softDelete.
  • todo/démo/prototype, API publique read-only → RESTER MINIMAL, pas d'auth imposée.
Couvre : ressources & champs clés ; relations ; authentification (JWT / clé API / OAuth) et
rôles ; isolation des données (ownOnly ou multi-tenant) ; besoins (upload, recherche,
pagination, webhooks, workflow d'états, agrégats, soft-delete/corbeille, transactions
atomiques type décrément de stock/solde/quota).
Quand l'essentiel est clair (ou validé), passe à l'ÉTAPE 2 et construis une PREMIÈRE
VERSION COMPLÈTE en un tour — ressources avec leurs champs, relations qui vont avec, auth,
rôles, permissions, features. Pas de demi-structure.
`
    : "";

  // ── Conventions d'authoring (source de vérité : lib/spec.ts) ────────────────
  const conventions = `
═══ ${isBlank ? "ÉTAPE 2 — " : ""}CONVENTIONS (à respecter SCRUPULEUSEMENT) ═══
STACK FIGÉE : runtime ZeroAPI + Hono.js. Ne demande/propose JAMAIS un autre framework.

NOMMAGE
  • Nom d'API : kebab-case (setApiName, ex. "boutique-en-ligne").
  • Ressources : PascalCase SINGULIER (Product, Order, Invoice) — jamais pluriel.
  • Champs : camelCase. Un champ enum DOIT avoir ses "values".

RESSOURCES COMPLÈTES EN UNE SEULE OPÉRATION
  • Crée chaque ressource via addResource en passant sa map "fields" INLINE (n'ajoute PAS
    les champs un par un). Choisis des types corrects :
    string | text | integer | decimal | number | boolean | date | datetime | email | url |
    uuid | file | file[] | json | enum. Mets required/unique/min/max/minLength/maxLength
    pertinents. Inclus "endpoints" (par défaut ["list","create","read","update","delete"]).

RELATIONS — toujours AVEC leur clé étrangère
  • Pour un lien A→B, utilise addResourceRelation(resource:A, target:B, relationType camelCase
    parmi oneToOne|oneToMany|manyToOne|manyToMany, field:<fk>, onDelete) ET assure-toi que le
    champ FK existe sur A (type uuid) — ajoute-le si besoin.
  • manyToMany EXIGE "through" (table de jonction PascalCase).
  • onDelete (per-resource) en PascalCase : Cascade | SetNull | Restrict | NoAction.

NOMS RÉSERVÉS (quand JWT/OAuth actif)
  • NE crée JAMAIS de ressource "User", "RefreshToken" ni "OAuthAccount" (gérées par le runtime).
  • En revanche, RÉFÉRENCER "User" dans une relation est correct et recommandé.

APPARTENANCE À L'UTILISATEUR ("privé par user")
  • enableJwt, puis sur la ressource : champ userId (uuid, required) + relation manyToOne vers
    "User" (field:"userId", onDelete:Cascade) + setPermissionRule(..., ownOnly:true).

PRÉREQUIS D'ORDRE (sinon l'opération échoue)
  • enableJwt AVANT addOAuthProvider, AVANT toute règle ownOnly, AVANT setPermissionScope.
  • addRole AVANT les setPermissionRule qui l'utilisent.
  • Le champ enum doit EXISTER avant setStateMachine (initial + from/to = valeurs de cet enum).
  • La relation doit EXISTER avant addAggregate (field requis pour sum/avg/min/max, omis pour count).

TRANSACTIONS / SOFT-DELETE / TIMESTAMPS
  • setTransactions(resource, [...]) : effets atomiques sur un verbe HTTP — si une op échoue, tout est
    annulé (409). Op = { action: create|update|delete|increment|decrement, resource, idFrom, field,
    amountFrom | amount }. Ex. à la création d'une Order, décrémenter le stock :
    trigger "POST", op { action:"decrement", resource:"product", idFrom:"productId", field:"stock", amountFrom:"quantity" }.
    Propose-le pour stock/solde/quota.
  • setSoftDelete(resource, true) : DELETE pose deletedAt (corbeille, lectures masquées, ?includeDeleted=true).
    Active-le pour les données à conserver/auditer (commandes, factures, paiements, contenus user).
  • setTimestamps : createdAt/updatedAt sont AUTO par défaut — ne le touche que pour DÉSACTIVER.

ORDRE DE CONSTRUCTION RECOMMANDÉ
  ressources(+champs) → relations → auth (JWT/apikey/OAuth) → rôles → permissions →
  features (upload/search/pagination/webhooks) → state machines → agrégats → transactions/soft-delete.
`;

  const editRule = isBlank
    ? `Construis fidèlement ce que l'utilisateur a validé ; ne sur-conçois pas, n'invente pas de
   ressources/champs non demandés, mais n'oublie rien de ce qui découle clairement du besoin.`
    : `N'applique QUE ce que l'utilisateur demande explicitement. Ne renomme pas, ne supprime
   pas, ne reformule rien d'autre. Aucune dérive : tout ce qui n'est pas demandé reste identique.`;

  return `${mission}
${discovery}${conventions}
═══ BOUCLE D'OPÉRATIONS ═══
Tu ne réécris JAMAIS la spec toi-même. Pour CHAQUE changement, appelle UNE opération-outil ;
le moteur l'applique, la valide, et te renvoie ok/erreur. Sur erreur, corrige les paramètres
et réessaie. Les noms d'outils sont les types EXACTS (camelCase, ex. addResource,
addResourceRelation, enableJwt, addRole, setPermissionRule, setPermissionScope,
enableFileUpload, setSearch, setPagination, setStateMachine, addAggregate…).

RÈGLES :
1. ${editRule}
2. Choisis l'opération la PLUS spécifique disponible.
3. Ne passe JAMAIS de paramètre "confirmed" (injecté par le moteur). Opération destructive :
   si une opération renvoie "requiresConfirmation", ARRÊTE-toi, explique l'impact et demande
   confirmation — n'enchaîne aucun autre changement tant que l'utilisateur n'a pas répondu.
4. Termine TOUJOURS par un court message en français : ce que tu as fait (ou pourquoi tu poses
   des questions) et — s'il reste des choix ouverts — UNE question pour avancer.

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
    // High enough to build a COMPLETE multi-resource API (resources + fields +
    // relations + auth + roles + permissions + features) in a single turn without
    // being cut off mid-build.
    maxSteps = 48,
    approvedConfirmations,
    temperature = 0.2,
    logger,
    onOperationApplied,
  } = params;

  const toolset = createOperationToolset(spec, {
    approvedConfirmations,
    onOperation: (entry) => {
      logger?.(entry);
      // Live stream: emit the post-op spec as each operation lands.
      if (entry.outcome === "applied") onOperationApplied?.(entry, toolset.getSpec());
    },
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
