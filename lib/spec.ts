import { z } from "zod";
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

/**
 * System prompt for the spec_generation task.
 * It MUST describe the exact shape consumed by parseSpec() from @ludagg/zeroapi-runtime:
 *   - field types are lowercase literals (string|text|number|integer|boolean|date|datetime|email|url|uuid|file)
 *   - auth.strategy is lowercase ("jwt"|"apikey"|"bearer") — never "apiKey", "API_KEY", or "none"
 *   - fields is an object indexed by field name (NOT an array of {name,...})
 *   - version is mandatory and always "1.0"
 *   - resources is mandatory with at least one resource, each with at least one field
 */
export const SPEC_SYSTEM_PROMPT = `Tu génères UNIQUEMENT une Spec JSON validée par \`parseSpec()\` de @ludagg/zeroapi-runtime.
Le framework cible est TOUJOURS Hono.js — ne mentionne jamais Express, FastAPI ou un autre framework.

SHAPE EXACTE — tout écart sera rejeté :

{
  "version": "1.0",
  "name": "kebab-case",
  "description": "résumé en une phrase",
  "auth": { "strategy": "jwt" },
  "roles": [{ "name": "admin" }, { "name": "user" }],
  "rateLimit": { "windowMs": 60000, "max": 120 },
  "resources": [
    {
      "name": "PascalCase",
      "description": "...",
      "fields": {
        "title":    { "type": "string",  "required": true, "minLength": 1, "maxLength": 200 },
        "priceCfa": { "type": "integer", "required": true, "min": 0 },
        "owner":    { "type": "uuid" }
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

CONTRAINTES STRICTES :
- \`version\` est OBLIGATOIRE et vaut TOUJOURS la chaîne "1.0".
- \`name\` est OBLIGATOIRE (string non-vide, en kebab-case de préférence).
- \`resources\` est OBLIGATOIRE et contient AU MOINS UNE ressource. Chaque ressource doit avoir un \`name\` non-vide et un objet \`fields\` avec AU MOINS UN champ.
- \`fields\` est un OBJET indexé par nom de champ — JAMAIS un tableau.
- Types de champ AUTORISÉS (literals minuscules, exactement) :
  "string" | "text" | "number" | "integer" | "boolean" | "date" | "datetime" | "email" | "url" | "uuid" | "file"
- \`auth.strategy\` est l'un de : "jwt", "apikey", "bearer" — TOUT EN MINUSCULES.
  - N'écris JAMAIS "apiKey", "API_KEY", "API-KEY", "Bearer", "JWT", ni "none".
  - S'il n'y a pas d'auth, OMETS complètement la clé \`auth\` (ne mets pas \`"strategy": "none"\`).
- Types de relations : "oneToOne", "oneToMany", "manyToOne", "manyToMany". \`manyToMany\` exige \`"through": "JoinTable"\`.
- Inférer les CRUD endpoints standards (["list","create","read","update","delete"]) sauf si l'utilisateur précise sinon.
- Inclure auth/RBAC quand il y a plusieurs rôles.
- Identifier les paiements mobile money africains (mtn_momo, wave, orange_money) en \`customEndpoints\` + intégrations side-car.

RÈGLES DE SORTIE :
- Réponds par un OBJET JSON pur ({...}), RIEN d'autre.
- Pas de markdown, pas de balise \`\`\`json, pas de phrase d'introduction ou de conclusion.
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

// ============================================================================
// LLM output normalization + pre-validation
// ----------------------------------------------------------------------------
// LLMs (Mistral especially) frequently emit small format drifts that crash
// parseSpec() with cryptic Zod errors: `"apiKey"` instead of `"apikey"`,
// `"int"` instead of `"integer"`, fields as an array of `{name,type,...}`,
// `nullable: true` instead of `required: false`, missing `version`, etc.
//
// `normalizeSpecCandidate` reshapes the LLM JSON into the exact format
// parseSpec() expects. `validateSpecCandidate` then runs a lightweight Zod
// pass that produces French error messages BEFORE the runtime's parseSpec
// kicks in — so /api/generate can surface "auth.strategy doit être 'jwt',
// 'apikey' ou 'bearer'" instead of the raw Zod issue path.
// ============================================================================

const VALID_FIELD_TYPES = [
  "string",
  "text",
  "number",
  "integer",
  "boolean",
  "date",
  "datetime",
  "email",
  "url",
  "uuid",
  "file",
] as const;

const VALID_AUTH_STRATEGIES = ["jwt", "apikey", "bearer"] as const;

const FIELD_TYPE_ALIASES: Record<string, (typeof VALID_FIELD_TYPES)[number]> = {
  string: "string",
  varchar: "string",
  char: "string",
  text: "text",
  longtext: "text",
  mediumtext: "text",
  number: "number",
  float: "number",
  decimal: "number",
  double: "number",
  numeric: "number",
  integer: "integer",
  int: "integer",
  bigint: "integer",
  smallint: "integer",
  boolean: "boolean",
  bool: "boolean",
  date: "date",
  datetime: "datetime",
  timestamp: "datetime",
  email: "email",
  url: "url",
  uri: "url",
  link: "url",
  uuid: "uuid",
  guid: "uuid",
  id: "uuid",
  file: "file",
  binary: "file",
  blob: "file",
  image: "file",
};

const AUTH_STRATEGY_ALIASES: Record<string, (typeof VALID_AUTH_STRATEGIES)[number]> = {
  jwt: "jwt",
  jsonwebtoken: "jwt",
  apikey: "apikey",
  bearer: "bearer",
  bearertoken: "bearer",
};

function canonKey(raw: string): string {
  return raw.toLowerCase().replace(/[\s_\-]/g, "");
}

function normalizeFieldType(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  return FIELD_TYPE_ALIASES[canonKey(raw)] ?? raw;
}

function normalizeAuthStrategy(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const key = canonKey(raw);
  if (key === "" || key === "none" || key === "noauth" || key === "public") return null;
  return AUTH_STRATEGY_ALIASES[key] ?? raw;
}

function normalizeField(raw: unknown): unknown {
  if (typeof raw === "string") return { type: normalizeFieldType(raw) };
  if (!raw || typeof raw !== "object") return raw;
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };
  if ("type" in out) out.type = normalizeFieldType(out.type);
  if ("nullable" in out) {
    if (!("required" in out)) out.required = out.nullable === false;
    delete out.nullable;
  }
  if ("length" in out && typeof out.length === "number" && !("maxLength" in out)) {
    out.maxLength = out.length;
  }
  if ("length" in out) delete out.length;
  return out;
}

function normalizeFields(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    const normalized: Record<string, unknown> = {};
    for (const entry of raw) {
      if (entry && typeof entry === "object" && typeof (entry as { name?: unknown }).name === "string") {
        const { name, ...rest } = entry as { name: string } & Record<string, unknown>;
        normalized[name] = normalizeField(rest);
      }
    }
    return normalized;
  }
  if (raw && typeof raw === "object") {
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      normalized[k] = normalizeField(v);
    }
    return normalized;
  }
  return raw;
}

const ALLOWED_CRUD = ["list", "create", "read", "update", "delete"] as const;

function normalizeEndpoints(raw: unknown): unknown {
  if (!Array.isArray(raw)) return raw;
  const cleaned = raw
    .map((e) => (typeof e === "string" ? e.toLowerCase().trim() : e))
    .filter((e): e is (typeof ALLOWED_CRUD)[number] =>
      typeof e === "string" && (ALLOWED_CRUD as readonly string[]).includes(e),
    );
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeResource(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  if ("fields" in out) out.fields = normalizeFields(out.fields);
  if ("endpoints" in out) {
    const ep = normalizeEndpoints(out.endpoints);
    if (ep === undefined) delete out.endpoints;
    else out.endpoints = ep;
  }
  return out;
}

/**
 * Reshapes raw LLM JSON into the exact format parseSpec() expects.
 * Idempotent — calling it on already-clean input is a no-op.
 */
export function normalizeSpecCandidate(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };

  if (typeof out.version !== "string" || out.version.length === 0) {
    out.version = "1.0";
  }

  if (out.auth && typeof out.auth === "object" && !Array.isArray(out.auth)) {
    const authSrc = out.auth as Record<string, unknown>;
    const strategy = normalizeAuthStrategy(authSrc.strategy);
    if (strategy === null) {
      delete out.auth;
    } else {
      out.auth = { ...authSrc, strategy };
    }
  } else if (out.auth !== undefined) {
    delete out.auth;
  }

  if (Array.isArray(out.resources)) {
    out.resources = out.resources.map(normalizeResource);
  }

  return out;
}

// Loose pre-validation: matches parseSpec's strict shape but with French
// error messages. We only assert the fields that are common LLM failure
// points; the runtime's parseSpec() remains the source of truth.
const LLMSpecSchema = z
  .object({
    version: z
      .string({ required_error: "Le champ 'version' est requis (toujours \"1.0\")" })
      .min(1, "Le champ 'version' ne peut pas être vide"),
    name: z
      .string({ required_error: "Le champ 'name' est requis" })
      .min(1, "Le champ 'name' ne peut pas être vide"),
    auth: z
      .object({
        strategy: z.enum(VALID_AUTH_STRATEGIES, {
          errorMap: () => ({
            message: "auth.strategy doit être 'jwt', 'apikey' ou 'bearer' (en minuscules)",
          }),
        }),
      })
      .passthrough()
      .optional(),
    resources: z
      .array(
        z
          .object({
            name: z
              .string({ required_error: "resource.name est requis" })
              .min(1, "resource.name ne peut pas être vide"),
            fields: z
              .record(
                z.string(),
                z
                  .object({
                    type: z.enum(VALID_FIELD_TYPES, {
                      errorMap: () => ({
                        message: `type doit être l'un de: ${VALID_FIELD_TYPES.join(", ")}`,
                      }),
                    }),
                  })
                  .passthrough(),
              )
              .refine(
                (f) => Object.keys(f).length > 0,
                "chaque ressource doit définir au moins un champ",
              ),
          })
          .passthrough(),
        {
          required_error: "Le champ 'resources' est requis",
          invalid_type_error: "Le champ 'resources' doit être un tableau",
        },
      )
      .min(1, "Le champ 'resources' doit contenir au moins une ressource"),
  })
  .passthrough();

/**
 * Validates a normalized LLM candidate with friendly French errors.
 * Returns the input as a `ZeroAPISpec`-shaped object on success.
 * Throws a plain Error (not ZodError) so callers can surface the message
 * directly in API responses.
 */
export function validateSpecCandidate(raw: unknown): unknown {
  const result = LLMSpecSchema.safeParse(raw);
  if (result.success) return raw;
  const issues = result.error.issues
    .map((i) => `${i.path.join(".") || "spec"}: ${i.message}`)
    .join(" | ");
  throw new Error(`Spec JSON non conforme au schéma ZeroAPI — ${issues}`);
}

/**
 * Parses LLM output into a validated ZeroAPISpec.
 * Pipeline:
 *   1. Strip markdown fences
 *   2. JSON.parse — throws "JSON invalide: ..." on syntax errors
 *   3. normalizeSpecCandidate — fixes common LLM drifts (auth strategy
 *      casing, type aliases, array-of-fields → object-of-fields, etc.)
 *   4. validateSpecCandidate — Zod pre-check with French error messages
 *   5. parseSpec — runtime's strict Zod + relation integrity checks
 */
export function safeParseSpec(jsonText: string): ZeroAPISpec {
  let cleaned = jsonText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(
      `Le JSON renvoyé par le LLM est invalide: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const normalized = normalizeSpecCandidate(raw);
  validateSpecCandidate(normalized);
  return parseSpec(normalized);
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
