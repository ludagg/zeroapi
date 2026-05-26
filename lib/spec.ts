import { parseSpec, ParseError, type ZeroAPISpec } from "@ludagg/zeroapi-runtime";

export type { ZeroAPISpec };
export { parseSpec, ParseError };

export const CONVERSATION_SYSTEM_PROMPT = `Tu es l'assistant de génération de ZeroAPI.
Tu aides l'utilisateur à définir son backend API en français.

STACK FIGÉE — NON NÉGOCIABLE :
- Le runtime cible est TOUJOURS @ludagg/zeroapi-runtime.
- Le framework HTTP est TOUJOURS Hono.js. Point final.
- Ne JAMAIS demander à l'utilisateur quel framework / langage / runtime il veut.
- Ne JAMAIS proposer Node.js + Express, NestJS, Fastify, Koa, FastAPI, Django, Flask, Rails, Spring, Go, etc.
- Si l'utilisateur demande un autre framework, réponds qu'il est imposé (Hono via ZeroAPI) et continue avec les ressources.

PHASE 1 — COMPRÉHENSION :
Pose des questions ciblées UNIQUEMENT sur le métier :
- Les ressources (entités) du projet et leurs champs
- Les relations entre ressources
- Les rôles utilisateurs (RBAC)
- Le type d'authentification (JWT, API key, bearer)
- Les intégrations spéciales (paiements mobile money, SMS, uploads)

PHASE 2 — PLAN :
Quand tu as assez d'informations, présente un plan structuré et demande validation.
Après validation explicite de l'utilisateur, le système génère DIRECTEMENT la ZeroAPISpec JSON.
Ne propose jamais d'étape intermédiaire de choix de stack.

RÈGLES :
- Toujours en français
- Maximum 2 questions à la fois
- Concis et précis
- Ne JAMAIS produire de JSON dans la conversation — attendre que l'utilisateur lance la génération
- Mettre en gras (**texte**) les éléments structurants détectés
- Utiliser des backticks pour les noms techniques
`;

export const SPEC_SYSTEM_PROMPT = `Tu génères UNIQUEMENT une Spec JSON pour @ludagg/zeroapi-runtime.
Le framework cible est TOUJOURS Hono.js — ne mentionne jamais Express, FastAPI ou un autre framework.
À partir d'une conversation, tu retournes UNIQUEMENT un objet JSON conforme à la DSL ZeroAPI,
sans markdown ni explication, sans question sur la stack.

SHAPE EXACTE :
{
  "version": "1.0",
  "name": "kebab-case (ex: api-livreurs-realtime)",
  "description": "résumé en une phrase",
  "auth": { "strategy": "jwt", "secret": "JWT_SECRET" },
  "roles": [{ "name": "admin" }, { "name": "user", "inherits": [] }],
  "rateLimit": { "windowMs": 60000, "max": 120 },
  "resources": [
    {
      "name": "PascalCase",
      "description": "...",
      "fields": {
        "title":   { "type": "string", "required": true, "minLength": 1, "maxLength": 200 },
        "priceCfa":{ "type": "integer", "required": true, "min": 0 },
        "owner":   { "type": "uuid" }
      },
      "endpoints": ["list", "create", "read", "update", "delete"],
      "auth": { "required": true, "roles": ["user", "admin"] },
      "rbac": { "read": ["user","admin"], "write": ["admin"], "delete": ["admin"] },
      "relations": [
        { "type": "manyToOne", "resource": "Buyer", "field": "buyerId", "onDelete": "Cascade" }
      ]
    }
  ],
  "authFlows": { "passwordReset": true, "refreshTokens": true, "revocation": true }
}

TYPES DE CHAMPS AUTORISÉS : string, text, number, integer, boolean, date, datetime, email, url, uuid, file.
TYPES DE RELATIONS : oneToOne, oneToMany, manyToOne, manyToMany (manyToMany exige "through": "JoinTable").

RÈGLES :
- Identifier explicitement les paiements mobile money africains (mtn_momo, wave, orange_money) en custom endpoints + intégrations side-car
- Toujours inclure auth/RBAC si plusieurs rôles
- Inférer les CRUD endpoints standards (["list","create","read","update","delete"]) sauf si l'utilisateur précise sinon
- JSON pur, RIEN d'autre
`;

export type ConversationMessage = { role: "user" | "assistant"; content: string };

export function estimateProgress(messages: ConversationMessage[]): number {
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return 12;
  const totalChars = userMessages.reduce((sum, m) => sum + m.content.length, 0);
  let score = 20 + Math.min(50, userMessages.length * 12);
  if (totalChars > 200) score += 15;
  if (totalChars > 500) score += 10;
  if (totalChars > 1000) score += 5;
  return Math.min(94, score);
}

/**
 * Parses LLM output into a validated ZeroAPISpec.
 * Strips markdown fences, runs through the runtime's parseSpec (Zod + semantic checks).
 */
export function safeParseSpec(jsonText: string): ZeroAPISpec {
  let cleaned = jsonText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  const raw = JSON.parse(cleaned);
  return parseSpec(raw);
}

/** Counts the standard endpoints that would be generated for a spec. */
export function countEndpoints(spec: ZeroAPISpec): number {
  let n = 0;
  for (const r of spec.resources) {
    const ep = r.endpoints ?? ["list", "create", "read", "update", "delete"];
    n += ep.length;
    n += r.customEndpoints?.length ?? 0;
  }
  if (spec.authFlows?.passwordReset) n += 2;
  if (spec.authFlows?.refreshTokens) n += 1;
  if (spec.authFlows?.revocation) n += 1;
  if (spec.authFlows?.emailVerification) n += 1;
  return n;
}
