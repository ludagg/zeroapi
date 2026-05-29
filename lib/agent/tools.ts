/**
 * Tool definitions — exposes the 55 operations of the catalogue (lib/operations)
 * as Anthropic native tools.
 *
 * Each operation `type` becomes a tool with the SAME name; the tool's
 * `input_schema` mirrors the operation's parameters MINUS the discriminant
 * `type`. Converting a model tool call back into an `Operation` is therefore a
 * trivial `{ type: name, ...input }` — the operation engine (lib/operations)
 * remains the single source of truth for validity.
 *
 * IMPORTANT: the `confirmed` flag accepted by destructive operations is NEVER
 * exposed as a tool parameter. The model can therefore never self-confirm a
 * destructive change — it always triggers `requiresConfirmation`, which the
 * agent surfaces to the user (OPERATIONS.md §4.2, task requirement §3).
 */

import type { Operation, OperationType } from "../operations";

// ── JSON-schema helpers ──────────────────────────────────────────────────────

type JSchema = Record<string, unknown>;

const str = (description: string): JSchema => ({ type: "string", description });
const strEnum = (values: readonly string[], description: string): JSchema => ({
  type: "string",
  enum: [...values],
  description,
});
const num = (description: string): JSchema => ({ type: "number", description });
const bool = (description: string): JSchema => ({ type: "boolean", description });
const arr = (items: JSchema, description: string): JSchema => ({
  type: "array",
  items,
  description,
});

const FIELD_TYPES = [
  "string", "text", "number", "integer", "decimal", "boolean", "date",
  "datetime", "email", "url", "uuid", "file", "file[]", "json", "enum",
] as const;
const CRUD = ["list", "create", "read", "update", "delete"] as const;
const TOP_REL = ["one-to-one", "one-to-many", "many-to-one", "many-to-many"] as const;
const PER_REL = ["oneToOne", "oneToMany", "manyToOne", "manyToMany"] as const;
const TOP_ON_DELETE = ["cascade", "set-null", "restrict"] as const;
const PER_ON_DELETE = ["Cascade", "SetNull", "Restrict", "NoAction"] as const;
const OAUTH = ["google", "github", "apple"] as const;
const PERM_ACTIONS = ["create", "read", "update", "delete"] as const;
const STORAGE = ["r2", "s3", "local"] as const;
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

/** Schema for a single field definition used inside addResource.fields / options. */
const fieldOptionsSchema: JSchema = {
  type: "object",
  description: "Options du champ selon son type",
  properties: {
    required: bool("Champ obligatoire"),
    unique: bool("Valeur unique"),
    index: bool("Indexé"),
    min: num("Minimum (number/integer/decimal)"),
    max: num("Maximum (number/integer/decimal)"),
    minLength: num("Longueur min (string/text)"),
    maxLength: num("Longueur max (string/text)"),
    description: str("Description du champ"),
    values: arr(str("valeur"), "Valeurs autorisées — OBLIGATOIRE si type=enum"),
    accept: arr(str("type MIME"), "Types acceptés (file/file[])"),
    maxSize: str("Taille max, ex: \"5MB\" (file/file[])"),
    storage: strEnum(STORAGE, "Fournisseur de stockage (file/file[])"),
  },
};

const fieldDefSchema: JSchema = {
  type: "object",
  properties: {
    type: strEnum(FIELD_TYPES, "Type du champ"),
    required: bool("Champ obligatoire"),
    values: arr(str("valeur"), "Valeurs — OBLIGATOIRE si type=enum"),
    min: num("Minimum"),
    max: num("Maximum"),
    minLength: num("Longueur min"),
    maxLength: num("Longueur max"),
    description: str("Description"),
  },
  required: ["type"],
};

const rbacSchema: JSchema = {
  type: "object",
  description: "Rôles autorisés par action",
  properties: {
    read: arr(str("rôle"), "Rôles pouvant lire"),
    write: arr(str("rôle"), "Rôles pouvant écrire"),
    delete: arr(str("rôle"), "Rôles pouvant supprimer"),
  },
};

const customEndpointSchema: JSchema = {
  type: "object",
  description: "Définition d'un endpoint custom",
  properties: {
    method: strEnum(HTTP_METHODS, "Méthode HTTP"),
    path: str("Chemin relatif, ex: \"/:id/publish\""),
    handler: str("ID du handler"),
    auth: bool("Exige l'auth"),
    roles: arr(str("rôle"), "Rôles requis"),
  },
  required: ["method", "path", "handler"],
};

// ── Tool definition shape (matches Anthropic.Tool) ───────────────────────────

export interface ToolDefinition {
  name: OperationType;
  description: string;
  input_schema: { type: "object"; properties: Record<string, JSchema>; required?: string[] };
}

function tool(
  name: OperationType,
  description: string,
  properties: Record<string, JSchema>,
  required: string[] = [],
): ToolDefinition {
  return { name, description, input_schema: { type: "object", properties, required } };
}

// ── The 55 tools ─────────────────────────────────────────────────────────────

export const OPERATION_TOOLS: ToolDefinition[] = [
  // 2.1 Méta
  tool("setApiName", "Change le nom de l'API (kebab-case).", { name: str("Nouveau nom kebab-case") }, ["name"]),
  tool("setApiDescription", "Définit ou efface la description de l'API.", { description: str("Description (omettre pour effacer)") }),
  tool("setGlobalRateLimit", "Définit le rate limit global.", { windowMs: num("Fenêtre en ms"), max: num("Requêtes max") }, ["windowMs", "max"]),
  tool("clearGlobalRateLimit", "Supprime le rate limit global.", {}),

  // 2.2 Ressources
  tool("addResource", "Ajoute une nouvelle ressource (table).", {
    name: str("Nom PascalCase de la ressource"),
    fields: { type: "object", description: "Champs indexés par nom", additionalProperties: fieldDefSchema },
    description: str("Description de la ressource"),
    endpoints: arr(strEnum(CRUD, "action"), "Endpoints CRUD (défaut: les 5)"),
    rbac: rbacSchema,
  }, ["name"]),
  tool("removeResource", "Supprime une ressource. Opération DESTRUCTIVE : l'impact (relations/permissions orphelines) sera remonté pour confirmation utilisateur.", { name: str("Nom de la ressource") }, ["name"]),
  tool("renameResource", "Renomme une ressource et propage le nom aux relations & permissions.", { oldName: str("Ancien nom"), newName: str("Nouveau nom") }, ["oldName", "newName"]),
  tool("setResourceDescription", "Définit la description d'une ressource.", { name: str("Ressource"), description: str("Description (omettre pour effacer)") }, ["name"]),
  tool("setResourceEndpoints", "Restreint/définit les endpoints CRUD d'une ressource.", { name: str("Ressource"), endpoints: arr(strEnum(CRUD, "action"), "Sous-ensemble CRUD") }, ["name", "endpoints"]),
  tool("setResourceRbac", "Remplace le RBAC d'une ressource.", { name: str("Ressource"), rbac: rbacSchema }, ["name", "rbac"]),
  tool("setSearchableFields", "Définit les champs cherchables d'une ressource.", { name: str("Ressource"), fields: arr(str("champ existant"), "Champs") }, ["name", "fields"]),

  // 2.3 Champs
  tool("addField", "Ajoute un champ à une ressource.", {
    resource: str("Ressource"), field: str("Nom du champ"), fieldType: strEnum(FIELD_TYPES, "Type"), options: fieldOptionsSchema,
  }, ["resource", "field", "fieldType"]),
  tool("modifyFieldOptions", "Modifie (merge) les options d'un champ existant.", { resource: str("Ressource"), field: str("Champ"), options: fieldOptionsSchema }, ["resource", "field", "options"]),
  tool("setFieldType", "Change le type d'un champ. DESTRUCTIVE si rétrécissant : confirmation utilisateur requise.", { resource: str("Ressource"), field: str("Champ"), fieldType: strEnum(FIELD_TYPES, "Nouveau type"), options: fieldOptionsSchema }, ["resource", "field", "fieldType"]),
  tool("setFieldRequired", "Bascule le flag required d'un champ.", { resource: str("Ressource"), field: str("Champ"), required: bool("Obligatoire ?") }, ["resource", "field", "required"]),
  tool("renameField", "Renomme un champ et propage (relations FK, searchable). DESTRUCTIVE si référencé.", { resource: str("Ressource"), oldName: str("Ancien nom"), newName: str("Nouveau nom") }, ["resource", "oldName", "newName"]),
  tool("removeField", "Retire un champ. DESTRUCTIVE si FK de relation : confirmation requise.", { resource: str("Ressource"), field: str("Champ") }, ["resource", "field"]),
  tool("addEnumValue", "Ajoute une valeur à un champ enum.", { resource: str("Ressource"), field: str("Champ enum"), value: str("Valeur") }, ["resource", "field", "value"]),
  tool("removeEnumValue", "Retire une valeur d'un enum. DESTRUCTIVE : confirmation requise.", { resource: str("Ressource"), field: str("Champ enum"), value: str("Valeur") }, ["resource", "field", "value"]),
  tool("setEnumValues", "Remplace toutes les valeurs d'un enum. DESTRUCTIVE si retrait : confirmation requise.", { resource: str("Ressource"), field: str("Champ enum"), values: arr(str("valeur"), "Nouvelles valeurs") }, ["resource", "field", "values"]),

  // 2.4 Relations
  tool("addRelation", "Ajoute une relation top-level (kebab-case). many-to-many exige through.", { from: str("Ressource source"), to: str("Ressource cible"), relationType: strEnum(TOP_REL, "Type"), field: str("Champ FK (défaut: id)"), through: str("Table de jonction (m2m)"), onDelete: strEnum(TOP_ON_DELETE, "Politique onDelete") }, ["from", "to", "relationType"]),
  tool("removeRelation", "Retire une relation top-level.", { from: str("Source"), to: str("Cible"), relationType: strEnum(TOP_REL, "Type (optionnel)") }, ["from", "to"]),
  tool("setRelationOnDelete", "Change le onDelete d'une relation top-level.", { from: str("Source"), to: str("Cible"), onDelete: strEnum(TOP_ON_DELETE, "Politique") }, ["from", "to", "onDelete"]),
  tool("addResourceRelation", "Ajoute une relation par-ressource (camelCase). manyToMany exige through.", { resource: str("Ressource"), target: str("Cible"), relationType: strEnum(PER_REL, "Type"), field: str("Champ FK"), onDelete: strEnum(PER_ON_DELETE, "Politique"), through: str("Table de jonction (m2m)") }, ["resource", "target", "relationType", "field"]),
  tool("removeResourceRelation", "Retire une relation par-ressource.", { resource: str("Ressource"), target: str("Cible"), relationType: strEnum(PER_REL, "Type (optionnel)") }, ["resource", "target"]),

  // 2.5 Auth
  tool("enableJwt", "Active l'authentification JWT (réserve User/RefreshToken).", { secretEnv: str("Nom de la var secrète"), accessTokenTTL: str("TTL access, ex 15m"), refreshTokenTTL: str("TTL refresh, ex 7d") }),
  tool("disableJwt", "Désactive JWT. DESTRUCTIVE : casse oauth/ownOnly/relations→User, confirmation requise.", {}),
  tool("enableApiKey", "Active l'authentification par clé API.", { header: str("Header, ex X-API-Key"), prefix: str("Préfixe, ex sk_") }),
  tool("disableApiKey", "Désactive l'authentification par clé API.", {}),
  tool("addOAuthProvider", "Ajoute un provider OAuth (exige JWT).", { provider: strEnum(OAUTH, "Provider"), clientIdEnv: str("Var client id"), clientSecretEnv: str("Var client secret"), scopes: arr(str("scope"), "Scopes") }, ["provider"]),
  tool("removeOAuthProvider", "Retire un provider OAuth.", { provider: strEnum(OAUTH, "Provider") }, ["provider"]),
  tool("setAuthFlag", "Bascule un flag d'auth (emailVerification/passwordReset).", { flag: strEnum(["emailVerification", "passwordReset"], "Flag"), value: bool("Valeur") }, ["flag", "value"]),
  tool("disableAuth", "Désactive tout le bloc auth. DESTRUCTIVE : confirmation requise.", {}),
  tool("setLegacyAuthStrategy", "Définit la stratégie d'auth légacy mono-stratégie.", { strategy: strEnum(["jwt", "apikey", "bearer"], "Stratégie") }, ["strategy"]),

  // 2.6 Rôles & permissions
  tool("addRole", "Ajoute un rôle.", { name: str("Nom du rôle") }, ["name"]),
  tool("removeRole", "Retire un rôle. DESTRUCTIVE si référencé : confirmation requise.", { name: str("Nom du rôle") }, ["name"]),
  tool("renameRole", "Renomme un rôle et propage (rbac, permissions).", { oldName: str("Ancien nom"), newName: str("Nouveau nom") }, ["oldName", "newName"]),
  tool("setPermissionRule", "Upsert d'une règle de permission (resource, role). ownOnly exige JWT.", { resource: str("Ressource"), role: str("Rôle"), actions: arr(strEnum(PERM_ACTIONS, "action"), "Actions"), ownOnly: bool("Restreint aux lignes du propriétaire") }, ["resource", "role", "actions"]),
  tool("removePermissionRule", "Retire une règle de permission (resource, role).", { resource: str("Ressource"), role: str("Rôle") }, ["resource", "role"]),
  tool("removeResourcePermissions", "Retire toutes les permissions d'une ressource.", { resource: str("Ressource") }, ["resource"]),

  // 2.7 Features
  tool("enableFileUpload", "Active l'upload de fichiers.", { provider: strEnum(STORAGE, "Fournisseur"), maxSizeMB: num("Taille max en Mo"), allowedTypes: arr(str("type MIME"), "Types autorisés") }, ["provider"]),
  tool("disableFileUpload", "Désactive l'upload de fichiers.", {}),
  tool("addOutboundWebhook", "Ajoute un événement de webhook sortant.", { event: str("Événement, ex order.created") }, ["event"]),
  tool("removeOutboundWebhook", "Retire un événement de webhook sortant.", { event: str("Événement") }, ["event"]),
  tool("addInboundWebhook", "Ajoute une source de webhook entrant.", { source: str("Source, ex stripe") }, ["source"]),
  tool("removeInboundWebhook", "Retire une source de webhook entrant.", { source: str("Source") }, ["source"]),
  tool("setSearch", "Active/désactive la recherche.", { enabled: bool("Activée ?"), fuzzy: bool("Recherche floue") }, ["enabled"]),
  tool("setPagination", "Définit la pagination.", { defaultLimit: num("Limite par défaut"), maxLimit: num("Limite max") }, ["defaultLimit", "maxLimit"]),
  tool("setFeatureRateLimit", "Définit le rate limit par clé/public.", { perKey: str("Ex 1000/min"), public: str("Ex 60/min") }),

  // 2.8 authFlows
  tool("setAuthFlow", "Bascule un flow d'auth (certains exigent JWT).", { flow: strEnum(["passwordReset", "refreshTokens", "revocation", "emailVerification"], "Flow"), value: bool("Valeur") }, ["flow", "value"]),

  // 2.9 Env
  tool("addEnvVar", "Ajoute une variable d'environnement.", { name: str("Nom de la variable"), required: bool("Requise ?"), generate: bool("Générée au déploiement"), managedByCloud: bool("Gérée par le cloud"), description: str("Description") }, ["name"]),
  tool("modifyEnvVar", "Modifie une variable d'environnement existante.", { name: str("Nom"), required: bool("Requise ?"), generate: bool("Générée"), managedByCloud: bool("Gérée par le cloud"), description: str("Description") }, ["name"]),
  tool("removeEnvVar", "Retire une variable d'environnement. DESTRUCTIVE si référencée.", { name: str("Nom") }, ["name"]),

  // 2.10 Endpoints custom
  tool("addCustomEndpoint", "Ajoute un endpoint custom à une ressource.", { resource: str("Ressource"), definition: customEndpointSchema }, ["resource", "definition"]),
  tool("removeCustomEndpoint", "Retire un endpoint custom.", { resource: str("Ressource"), path: str("Chemin"), method: strEnum(HTTP_METHODS, "Méthode (optionnel)") }, ["resource", "path"]),
];

/** Set of valid tool names (= operation types). */
export const TOOL_NAMES = new Set<string>(OPERATION_TOOLS.map((t) => t.name));

/**
 * Converts a model tool call into an `Operation`. Performs light structural
 * checks only — the operation engine does the deep validation. The `confirmed`
 * flag (if the model somehow injects it) is stripped so the agent can never
 * self-confirm a destructive change.
 */
export function toolUseToOperation(
  name: string,
  input: unknown,
): { ok: true; operation: Operation } | { ok: false; error: string } {
  if (!TOOL_NAMES.has(name)) {
    return { ok: false, error: `Outil inconnu : "${name}". Utilise uniquement les opérations fournies.` };
  }
  if (input !== undefined && (input === null || typeof input !== "object" || Array.isArray(input))) {
    return { ok: false, error: `Arguments invalides pour "${name}" : un objet JSON est attendu.` };
  }
  const params = { ...((input as Record<string, unknown>) ?? {}) };
  delete params.confirmed; // never let the model self-confirm
  delete params.type; // discriminant is derived from the tool name
  return { ok: true, operation: { type: name, ...params } as Operation };
}
