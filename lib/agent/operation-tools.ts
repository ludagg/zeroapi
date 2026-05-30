/**
 * Kia agent — operation tools.
 *
 * Exposes the 55 spec operations (lib/operations/) as Vercel AI SDK tools.
 * Each tool's parameters are a zod schema derived from the operation's TS
 * params in lib/operations/types.ts. When the LLM calls a tool, we rebuild the
 * `Operation` object and run it through `applyOperation` against the CURRENT
 * working spec — the operation engine owns the mutation + validation, the LLM
 * only decides WHAT to change.
 *
 * Two deliberate design choices:
 *   1. Tool names ARE the operation `type` (e.g. "addResource"), so the
 *      discriminator is encoded by the tool the model picked.
 *   2. Destructive operations DO NOT expose a `confirmed` parameter. The LLM
 *      therefore cannot self-confirm: the engine returns `requiresConfirmation`,
 *      we record the impact and report it back so the agent surfaces it to the
 *      user instead of executing (OPERATIONS.md §4.2).
 */

import { tool, type Tool } from "ai";
import { z } from "zod";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";

import {
  applyOperation,
  OPERATION_DANGER,
  type ConfirmationImpact,
  type Operation,
  type OperationType,
} from "@/lib/operations";

// ── Mutable agent context threaded through every tool call ──────────────────

export type AgentOutcome = "applied" | "needs_confirmation" | "error";

export type AgentOperationLogEntry = {
  tool: OperationType;
  input: Record<string, unknown>;
  outcome: AgentOutcome;
  detail?: string;
  at: number;
};

export type AgentContext = {
  /** The working spec, replaced on every successful operation. */
  spec: ZeroAPISpec;
  /** Operations actually applied, in order. */
  appliedOperations: Operation[];
  /** Destructive operations the engine refused pending user confirmation. */
  pendingConfirmations: ConfirmationImpact[];
  /** Every tool-call attempt + its outcome (debug / future history). */
  log: AgentOperationLogEntry[];
};

/** Fresh context over a defensive clone — the caller's spec is never mutated. */
export function createAgentContext(spec: ZeroAPISpec): AgentContext {
  return {
    spec: structuredClone(spec),
    appliedOperations: [],
    pendingConfirmations: [],
    log: [],
  };
}

// ── Shared zod building blocks (mirror lib/operations/types.ts) ─────────────

const fieldType = z.enum([
  "string", "text", "number", "integer", "decimal", "boolean", "date",
  "datetime", "email", "url", "uuid", "file", "file[]", "json", "enum",
]);
const crudAction = z.enum(["list", "create", "read", "update", "delete"]);
const permissionAction = z.enum(["create", "read", "update", "delete"]);
const httpMethod = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const topRelationType = z.enum(["one-to-one", "one-to-many", "many-to-one", "many-to-many"]);
const perRelationType = z.enum(["oneToOne", "oneToMany", "manyToOne", "manyToMany"]);
const topOnDelete = z.enum(["cascade", "set-null", "restrict"]);
const perOnDelete = z.enum(["Cascade", "SetNull", "Restrict", "NoAction"]);
const oauthProvider = z.enum(["google", "apple", "github"]);
const storageProvider = z.enum(["r2", "s3", "local"]);

const fieldOptions = z.object({
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  index: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  description: z.string().optional(),
  values: z.array(z.string()).optional(),
  accept: z.array(z.string()).optional(),
  maxSize: z.string().optional(),
  storage: storageProvider.optional(),
  default: z.unknown().optional(),
});

const fieldDef = fieldOptions.extend({ type: fieldType });
const resourceRbac = z.object({
  read: z.array(z.string()).optional(),
  write: z.array(z.string()).optional(),
  delete: z.array(z.string()).optional(),
});
const customEndpointDef = z.object({
  method: httpMethod,
  path: z.string(),
  handler: z.string(),
  auth: z.boolean().optional(),
  roles: z.array(z.string()).optional(),
});

const res = z.string().describe("Nom EXACT d'une ressource existante");

// ── Per-operation parameter schemas (no `type`, no `confirmed`) ─────────────

const OPERATION_SCHEMAS: Record<OperationType, z.ZodObject<z.ZodRawShape>> = {
  // Meta
  setApiName: z.object({ name: z.string() }),
  setApiDescription: z.object({ description: z.string().optional() }),
  setGlobalRateLimit: z.object({ windowMs: z.number().int().positive(), max: z.number().int().positive() }),
  clearGlobalRateLimit: z.object({}),
  // Resources
  addResource: z.object({
    name: z.string(),
    fields: z.record(z.string(), fieldDef).optional(),
    description: z.string().optional(),
    endpoints: z.array(crudAction).optional(),
    rbac: resourceRbac.optional(),
  }),
  removeResource: z.object({ name: res }),
  renameResource: z.object({ oldName: res, newName: z.string() }),
  setResourceDescription: z.object({ name: res, description: z.string().optional() }),
  setResourceEndpoints: z.object({ name: res, endpoints: z.array(crudAction) }),
  setResourceRbac: z.object({ name: res, rbac: resourceRbac }),
  setSearchableFields: z.object({ name: res, fields: z.array(z.string()) }),
  // Fields
  addField: z.object({ resource: res, field: z.string(), fieldType, options: fieldOptions.optional() }),
  modifyFieldOptions: z.object({ resource: res, field: z.string(), options: fieldOptions }),
  setFieldType: z.object({ resource: res, field: z.string(), fieldType, options: fieldOptions.optional() }),
  setFieldRequired: z.object({ resource: res, field: z.string(), required: z.boolean() }),
  renameField: z.object({ resource: res, oldName: z.string(), newName: z.string() }),
  removeField: z.object({ resource: res, field: z.string() }),
  addEnumValue: z.object({ resource: res, field: z.string(), value: z.string() }),
  removeEnumValue: z.object({ resource: res, field: z.string(), value: z.string() }),
  setEnumValues: z.object({ resource: res, field: z.string(), values: z.array(z.string()) }),
  // Relations
  addRelation: z.object({
    from: res, to: res, relationType: topRelationType,
    field: z.string().optional(), through: z.string().optional(), onDelete: topOnDelete.optional(),
  }),
  removeRelation: z.object({ from: res, to: res, relationType: topRelationType.optional() }),
  setRelationOnDelete: z.object({ from: res, to: res, onDelete: topOnDelete }),
  addResourceRelation: z.object({
    resource: res, target: res, relationType: perRelationType,
    field: z.string(), onDelete: perOnDelete.optional(), through: z.string().optional(),
  }),
  removeResourceRelation: z.object({ resource: res, target: res, relationType: perRelationType.optional() }),
  // Auth
  enableJwt: z.object({
    secretEnv: z.string().optional(), accessTokenTTL: z.string().optional(), refreshTokenTTL: z.string().optional(),
  }),
  disableJwt: z.object({}),
  enableApiKey: z.object({ header: z.string().optional(), prefix: z.string().optional() }),
  disableApiKey: z.object({}),
  addOAuthProvider: z.object({
    provider: oauthProvider, clientIdEnv: z.string().optional(),
    clientSecretEnv: z.string().optional(), scopes: z.array(z.string()).optional(),
  }),
  removeOAuthProvider: z.object({ provider: oauthProvider }),
  setAuthFlag: z.object({ flag: z.enum(["emailVerification", "passwordReset"]), value: z.boolean() }),
  disableAuth: z.object({}),
  setLegacyAuthStrategy: z.object({ strategy: z.enum(["jwt", "apikey", "bearer"]) }),
  // Roles & permissions
  addRole: z.object({ name: z.string() }),
  removeRole: z.object({ name: z.string() }),
  renameRole: z.object({ oldName: z.string(), newName: z.string() }),
  setPermissionRule: z.object({
    resource: res, role: z.string(), actions: z.array(permissionAction), ownOnly: z.boolean().optional(),
  }),
  removePermissionRule: z.object({ resource: res, role: z.string() }),
  removeResourcePermissions: z.object({ resource: res }),
  // Features
  enableFileUpload: z.object({
    provider: storageProvider, maxSizeMB: z.number().positive().optional(), allowedTypes: z.array(z.string()).optional(),
  }),
  disableFileUpload: z.object({}),
  addOutboundWebhook: z.object({ event: z.string() }),
  removeOutboundWebhook: z.object({ event: z.string() }),
  addInboundWebhook: z.object({ source: z.string() }),
  removeInboundWebhook: z.object({ source: z.string() }),
  setSearch: z.object({ enabled: z.boolean(), fuzzy: z.boolean().optional() }),
  setPagination: z.object({ defaultLimit: z.number().int().positive(), maxLimit: z.number().int().positive() }),
  setFeatureRateLimit: z.object({ perKey: z.string().optional(), public: z.string().optional() }),
  // authFlows
  setAuthFlow: z.object({
    flow: z.enum(["passwordReset", "refreshTokens", "revocation", "emailVerification"]), value: z.boolean(),
  }),
  // Env
  addEnvVar: z.object({
    name: z.string(), required: z.boolean().optional(), generate: z.boolean().optional(),
    managedByCloud: z.boolean().optional(), description: z.string().optional(),
  }),
  modifyEnvVar: z.object({
    name: z.string(), required: z.boolean().optional(), generate: z.boolean().optional(),
    managedByCloud: z.boolean().optional(), description: z.string().optional(),
  }),
  removeEnvVar: z.object({ name: z.string() }),
  // Custom endpoints
  addCustomEndpoint: z.object({ resource: res, definition: customEndpointDef }),
  removeCustomEndpoint: z.object({ resource: res, path: z.string(), method: httpMethod.optional() }),
};

const OPERATION_DESCRIPTIONS: Record<OperationType, string> = {
  setApiName: "Renomme l'API.",
  setApiDescription: "Définit (ou efface) la description de l'API.",
  setGlobalRateLimit: "Définit le rate limit global (fenêtre + max).",
  clearGlobalRateLimit: "Retire le rate limit global.",
  addResource: "Ajoute une nouvelle ressource (table) avec ses champs.",
  removeResource: "Supprime une ressource. Destructive : cascade relations/permissions.",
  renameResource: "Renomme une ressource et propage aux relations/permissions.",
  setResourceDescription: "Définit la description d'une ressource.",
  setResourceEndpoints: "Restreint les endpoints CRUD exposés d'une ressource.",
  setResourceRbac: "Remplace le RBAC (read/write/delete) d'une ressource.",
  setSearchableFields: "Définit les champs recherchables d'une ressource.",
  addField: "Ajoute un champ à une ressource.",
  modifyFieldOptions: "Fusionne des options sur un champ existant.",
  setFieldType: "Change le type d'un champ. Rétrécir le type est destructif.",
  setFieldRequired: "Bascule le flag required d'un champ.",
  renameField: "Renomme un champ. Destructif si le champ est une FK.",
  removeField: "Supprime un champ. Destructif si FK/searchable.",
  addEnumValue: "Ajoute une valeur à un champ enum.",
  removeEnumValue: "Retire une valeur d'un enum. Destructive.",
  setEnumValues: "Remplace les valeurs d'un enum. Destructive si on en retire.",
  addRelation: "Ajoute une relation top-level entre deux ressources.",
  removeRelation: "Retire une relation top-level.",
  setRelationOnDelete: "Change le comportement onDelete d'une relation top-level.",
  addResourceRelation: "Ajoute une relation par-ressource (FK).",
  removeResourceRelation: "Retire une relation par-ressource.",
  enableJwt: "Active l'authentification JWT (réserve User/RefreshToken).",
  disableJwt: "Désactive JWT. Destructive : cascade OAuth + règles ownOnly.",
  enableApiKey: "Active l'authentification par clé d'API.",
  disableApiKey: "Désactive l'authentification par clé d'API.",
  addOAuthProvider: "Ajoute un provider OAuth (nécessite JWT).",
  removeOAuthProvider: "Retire un provider OAuth.",
  setAuthFlag: "Bascule un flag d'auth (emailVerification/passwordReset).",
  disableAuth: "Désactive toute l'auth. Destructive : cascade.",
  setLegacyAuthStrategy: "Définit la stratégie d'auth légacy unique.",
  addRole: "Ajoute un rôle.",
  removeRole: "Supprime un rôle. Destructive : cascade rbac/permissions.",
  renameRole: "Renomme un rôle et propage rbac/permissions.",
  setPermissionRule: "Upsert d'une règle de permission (resource, role).",
  removePermissionRule: "Retire une règle de permission.",
  removeResourcePermissions: "Retire toutes les permissions d'une ressource.",
  enableFileUpload: "Active l'upload de fichiers (provider de stockage).",
  disableFileUpload: "Désactive l'upload de fichiers.",
  addOutboundWebhook: "Ajoute un événement de webhook sortant.",
  removeOutboundWebhook: "Retire un webhook sortant.",
  addInboundWebhook: "Ajoute une source de webhook entrant.",
  removeInboundWebhook: "Retire une source de webhook entrant.",
  setSearch: "Active/désactive la recherche (option fuzzy).",
  setPagination: "Configure la pagination (defaultLimit/maxLimit).",
  setFeatureRateLimit: "Configure le rate limit par clé / public.",
  setAuthFlow: "Bascule un flow d'auth (nécessite JWT).",
  addEnvVar: "Ajoute une variable d'environnement.",
  modifyEnvVar: "Modifie une variable d'environnement existante.",
  removeEnvVar: "Retire une variable d'environnement. Destructive si référencée.",
  addCustomEndpoint: "Ajoute un endpoint custom à une ressource.",
  removeCustomEndpoint: "Retire un endpoint custom d'une ressource.",
};

export const OPERATION_TOOL_NAMES = Object.keys(OPERATION_SCHEMAS) as OperationType[];
export const OPERATION_TOOL_COUNT = OPERATION_TOOL_NAMES.length;

// ── Execution: one operation against the working spec ───────────────────────

/** Result shape returned to the LLM after a tool call (must be serialisable). */
export type ToolCallResult =
  | { ok: true; applied: OperationType; message: string }
  | {
      ok: false;
      needsConfirmation: true;
      operation: OperationType;
      reason: string;
      impact: string[];
      instruction: string;
    }
  | { ok: false; error: string; hint: string };

/**
 * Rebuilds the `Operation`, runs `applyOperation` against `ctx.spec`, and
 * mutates the context accordingly. Never throws — every outcome is returned to
 * the model so it can correct, stop for confirmation, or continue.
 */
export function executeOperationTool(
  ctx: AgentContext,
  type: OperationType,
  input: Record<string, unknown>,
): ToolCallResult {
  const op = { type, ...input } as unknown as Operation;
  const result = applyOperation(ctx.spec, op);

  if (result.ok) {
    ctx.spec = result.spec;
    ctx.appliedOperations.push(op);
    ctx.log.push({ tool: type, input, outcome: "applied", at: Date.now() });
    return { ok: true, applied: type, message: `Opération "${type}" appliquée et validée.` };
  }

  if (result.requiresConfirmation) {
    const impact = result.requiresConfirmation;
    ctx.pendingConfirmations.push(impact);
    ctx.log.push({ tool: type, input, outcome: "needs_confirmation", detail: impact.reason, at: Date.now() });
    return {
      ok: false,
      needsConfirmation: true,
      operation: type,
      reason: impact.reason,
      impact: impact.impact,
      instruction:
        "Cette opération est destructive et n'a PAS été exécutée. " +
        "Ne la réémets pas. Explique l'impact ci-dessus à l'utilisateur en français " +
        "et demande-lui une confirmation explicite avant toute exécution.",
    };
  }

  ctx.log.push({ tool: type, input, outcome: "error", detail: result.error, at: Date.now() });
  return {
    ok: false,
    error: result.error,
    hint:
      "Corrige les paramètres (noms exacts de ressources/champs, contraintes) " +
      "et réessaie, ou choisis une autre opération. Si tu ne peux pas, explique-le à l'utilisateur.",
  };
}

/**
 * Builds the full set of 55 Vercel AI SDK tools bound to a single agent
 * context. The same `ctx` is shared by every tool so sequential operations
 * build on each other within one agent run.
 */
export function buildOperationTools(ctx: AgentContext): Record<string, Tool> {
  const tools: Record<string, Tool> = {};
  for (const type of OPERATION_TOOL_NAMES) {
    tools[type] = tool({
      description: OPERATION_DESCRIPTIONS[type] + ` (danger: ${OPERATION_DANGER[type]})`,
      inputSchema: OPERATION_SCHEMAS[type],
      execute: async (input: unknown): Promise<ToolCallResult> =>
        executeOperationTool(ctx, type, (input ?? {}) as Record<string, unknown>),
    });
  }
  return tools;
}
