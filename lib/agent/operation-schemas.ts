/**
 * Operation → tool metadata catalogue (zod parameter schemas + descriptions).
 *
 * This is the runtime mirror of the COMPILE-TIME operation union in
 * `lib/operations/types.ts`. Each entry exposes:
 *   - a `description` the LLM reads to decide WHEN to call the operation, and
 *   - a `schema`: a zod object describing the operation's PARAMETERS (everything
 *     except the `type` discriminant and the `confirmed` flag — see below).
 *
 * Why this is the *single source* the tools are generated from
 * --------------------------------------------------------------
 * The catalogue is typed `satisfies Record<OperationType, …>`, so the compiler
 * forces an entry for EVERY operation the engine knows (all 66). Add an
 * `Operation` variant in types.ts → registry.ts and the build breaks here until
 * a schema is provided. `lib/agent/tools.ts` then iterates this catalogue (keyed
 * by the registry's `OPERATION_DANGER`) to emit one Vercel AI SDK tool per
 * operation — never a hand-maintained list.
 *
 * Why `confirmed` is intentionally absent
 * ---------------------------------------
 * Destructive operations accept `confirmed: true` in the engine. We deliberately
 * DO NOT expose it to the model: the agent must never confirm a dangerous
 * operation on its own (OPERATIONS.md §4.2). The engine injects `confirmed` only
 * once a human has approved the impact. `defineOp` enforces, per operation, that
 * the zod output is assignable to the operation's parameters MINUS `type`/
 * `confirmed`, so a schema that drifts from the typed operation is a compile
 * error.
 */

import { z } from "zod";
import type { Operation, OperationType } from "../operations/types";

/** Parameters of operation `T` as seen by a tool: no discriminant, no confirm. */
type OpParams<T extends OperationType> = Omit<
  Extract<Operation, { type: T }>,
  "type" | "confirmed"
>;

export interface OperationToolMeta {
  /** The operation type this tool maps to (and the tool's name). */
  type: OperationType;
  /** Human/LLM-facing description: when and why to call this operation. */
  description: string;
  /** Zod schema for the operation parameters (no `type`, no `confirmed`). */
  schema: z.ZodTypeAny;
}

/**
 * Bind a description + zod schema to an operation type. The schema's inferred
 * output MUST be assignable to the operation's parameters; otherwise the third
 * argument resolves to `never` and the call fails to type-check — this is the
 * compile-time link that keeps the zod schemas derived from the operation types.
 */
function defineOp<T extends OperationType, S extends z.ZodTypeAny>(
  type: T,
  description: string,
  schema: z.infer<S> extends OpParams<T> ? S : never,
): OperationToolMeta {
  return { type, description, schema };
}

// ── Shared scalar/enum schemas (mirror runtime + types.ts unions) ────────────

const fieldType = z.enum([
  "string",
  "text",
  "number",
  "integer",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "email",
  "url",
  "uuid",
  "file",
  "file[]",
  "json",
  "enum",
]);
const crudAction = z.enum(["list", "create", "read", "update", "delete"]);
const permissionAction = z.enum(["create", "read", "update", "delete"]);
const oauthProvider = z.enum(["google", "apple", "github"]);
const httpMethod = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const storageProvider = z.enum(["r2", "s3", "local"]);
const topLevelRelationType = z.enum([
  "one-to-one",
  "one-to-many",
  "many-to-one",
  "many-to-many",
]);
const perResourceRelationType = z.enum([
  "oneToOne",
  "oneToMany",
  "manyToOne",
  "manyToMany",
]);
const topLevelOnDelete = z.enum(["cascade", "set-null", "restrict"]);
const perResourceOnDelete = z.enum(["Cascade", "SetNull", "Restrict", "NoAction"]);
const aggregateOp = z.enum(["count", "sum", "avg", "min", "max"]);

const fieldOptions = z.object({
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  index: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  description: z.string().optional(),
  values: z.array(z.string()).optional().describe("Allowed values when type=enum"),
  accept: z.array(z.string()).optional(),
  maxSize: z.string().optional(),
  storage: storageProvider.optional(),
  default: z.unknown().optional(),
});

const fieldDefinition = fieldOptions.extend({ type: fieldType });

const resourceRbac = z.object({
  read: z.array(z.string()).optional(),
  write: z.array(z.string()).optional(),
  delete: z.array(z.string()).optional(),
});

const stateTransition = z.object({
  from: z.string(),
  to: z.string(),
  roles: z.array(z.string()).optional(),
});

const txOperation = z.object({
  action: z.enum(["create", "update", "delete", "decrement", "increment"]),
  resource: z.string(),
  idFrom: z.string().optional(),
  field: z.string().optional(),
  amount: z.number().optional(),
  amountFrom: z.string().optional(),
});

const transactionConfig = z.object({
  trigger: z.enum(["POST", "PUT", "DELETE", "PATCH"]),
  operations: z.array(txOperation),
});

const customEndpointDef = z.object({
  method: httpMethod,
  path: z.string().describe("Path relative to the resource route, e.g. /:id/publish"),
  handler: z.string().describe("Handler id in the createRuntime({ handlers }) map"),
  auth: z.boolean().optional(),
  roles: z.array(z.string()).optional(),
});

// ── The catalogue: one entry per operation (66 total) ────────────────────────

export const OPERATION_TOOLBOX = {
  // 2.1 Meta
  setApiName: defineOp("setApiName", "Rename the API (top-level name, kebab-case).", z.object({ name: z.string() })),
  setApiDescription: defineOp("setApiDescription", "Set or clear the API description.", z.object({ description: z.string().optional() })),
  setGlobalRateLimit: defineOp("setGlobalRateLimit", "Set the global rate limit (window in ms + max requests).", z.object({ windowMs: z.number(), max: z.number() })),
  clearGlobalRateLimit: defineOp("clearGlobalRateLimit", "Remove the global rate limit.", z.object({})),

  // 2.2 Resources
  addResource: defineOp(
    "addResource",
    "Add a NEW resource (entity/table). Provide its name and optionally fields, description, CRUD endpoints and RBAC.",
    z.object({
      name: z.string(),
      fields: z.record(z.string(), fieldDefinition).optional(),
      description: z.string().optional(),
      endpoints: z.array(crudAction).optional(),
      rbac: resourceRbac.optional(),
    }),
  ),
  removeResource: defineOp("removeResource", "Delete a resource. DESTRUCTIVE — requires user confirmation.", z.object({ name: z.string() })),
  renameResource: defineOp("renameResource", "Rename an existing resource. DESTRUCTIVE (breaks routes).", z.object({ oldName: z.string(), newName: z.string() })),
  setResourceDescription: defineOp("setResourceDescription", "Set or clear a resource description.", z.object({ name: z.string(), description: z.string().optional() })),
  setResourceEndpoints: defineOp("setResourceEndpoints", "Set the enabled CRUD endpoints of a resource.", z.object({ name: z.string(), endpoints: z.array(crudAction) })),
  setResourceRbac: defineOp("setResourceRbac", "Set the per-action RBAC (read/write/delete role lists) of a resource.", z.object({ name: z.string(), rbac: resourceRbac })),
  setSearchableFields: defineOp("setSearchableFields", "Set which fields of a resource are searchable.", z.object({ name: z.string(), fields: z.array(z.string()) })),

  // 2.3 Fields
  addField: defineOp("addField", "Add a NEW field to an existing resource.", z.object({ resource: z.string(), field: z.string(), fieldType, options: fieldOptions.optional() })),
  modifyFieldOptions: defineOp("modifyFieldOptions", "Merge options (required/unique/min/max/…) onto an existing field.", z.object({ resource: z.string(), field: z.string(), options: fieldOptions })),
  setFieldType: defineOp("setFieldType", "Change a field's type. DESTRUCTIVE (data migration). Requires confirmation.", z.object({ resource: z.string(), field: z.string(), fieldType, options: fieldOptions.optional() })),
  setFieldRequired: defineOp("setFieldRequired", "Toggle a field's required flag.", z.object({ resource: z.string(), field: z.string(), required: z.boolean() })),
  renameField: defineOp("renameField", "Rename a field. DESTRUCTIVE. Requires confirmation.", z.object({ resource: z.string(), oldName: z.string(), newName: z.string() })),
  removeField: defineOp("removeField", "Remove a field. DESTRUCTIVE. Requires confirmation.", z.object({ resource: z.string(), field: z.string() })),
  addEnumValue: defineOp("addEnumValue", "Add a value to an enum field.", z.object({ resource: z.string(), field: z.string(), value: z.string() })),
  removeEnumValue: defineOp("removeEnumValue", "Remove a value from an enum field. DESTRUCTIVE. Requires confirmation.", z.object({ resource: z.string(), field: z.string(), value: z.string() })),
  setEnumValues: defineOp("setEnumValues", "Replace the full value set of an enum field. DESTRUCTIVE. Requires confirmation.", z.object({ resource: z.string(), field: z.string(), values: z.array(z.string()) })),

  // 2.4 Relations
  addRelation: defineOp("addRelation", "Add a TOP-LEVEL relation between two resources (kebab-case type).", z.object({ from: z.string(), to: z.string(), relationType: topLevelRelationType, field: z.string().optional(), through: z.string().optional(), onDelete: topLevelOnDelete.optional() })),
  removeRelation: defineOp("removeRelation", "Remove a top-level relation.", z.object({ from: z.string(), to: z.string(), relationType: topLevelRelationType.optional() })),
  setRelationOnDelete: defineOp("setRelationOnDelete", "Set the onDelete behaviour of a top-level relation.", z.object({ from: z.string(), to: z.string(), onDelete: topLevelOnDelete })),
  addResourceRelation: defineOp("addResourceRelation", "Add a PER-RESOURCE relation (camelCase type) carrying an FK field.", z.object({ resource: z.string(), target: z.string(), relationType: perResourceRelationType, field: z.string(), onDelete: perResourceOnDelete.optional(), through: z.string().optional() })),
  removeResourceRelation: defineOp("removeResourceRelation", "Remove a per-resource relation.", z.object({ resource: z.string(), target: z.string(), relationType: perResourceRelationType.optional() })),

  // 2.5 Auth
  enableJwt: defineOp("enableJwt", "Enable JWT auth (optional secret env + token TTLs).", z.object({ secretEnv: z.string().optional(), accessTokenTTL: z.string().optional(), refreshTokenTTL: z.string().optional() })),
  disableJwt: defineOp("disableJwt", "Disable JWT auth. DESTRUCTIVE. Requires confirmation.", z.object({})),
  enableApiKey: defineOp("enableApiKey", "Enable API-key auth (optional header + prefix).", z.object({ header: z.string().optional(), prefix: z.string().optional() })),
  disableApiKey: defineOp("disableApiKey", "Disable API-key auth.", z.object({})),
  addOAuthProvider: defineOp("addOAuthProvider", "Add an OAuth provider (google/apple/github).", z.object({ provider: oauthProvider, clientIdEnv: z.string().optional(), clientSecretEnv: z.string().optional(), scopes: z.array(z.string()).optional() })),
  removeOAuthProvider: defineOp("removeOAuthProvider", "Remove an OAuth provider.", z.object({ provider: oauthProvider })),
  setAuthFlag: defineOp("setAuthFlag", "Toggle an auth flag (emailVerification | passwordReset).", z.object({ flag: z.enum(["emailVerification", "passwordReset"]), value: z.boolean() })),
  disableAuth: defineOp("disableAuth", "Disable ALL auth. DESTRUCTIVE. Requires confirmation.", z.object({})),
  setLegacyAuthStrategy: defineOp("setLegacyAuthStrategy", "Set the legacy single auth strategy (jwt | apikey | bearer).", z.object({ strategy: z.enum(["jwt", "apikey", "bearer"]) })),

  // 2.6 Roles & permissions
  addRole: defineOp("addRole", "Add an RBAC role.", z.object({ name: z.string() })),
  removeRole: defineOp("removeRole", "Remove an RBAC role. DESTRUCTIVE. Requires confirmation.", z.object({ name: z.string() })),
  renameRole: defineOp("renameRole", "Rename an RBAC role. DESTRUCTIVE.", z.object({ oldName: z.string(), newName: z.string() })),
  setPermissionRule: defineOp("setPermissionRule", "Set a permission rule for (resource, role): which actions, optionally ownOnly.", z.object({ resource: z.string(), role: z.string(), actions: z.array(permissionAction), ownOnly: z.boolean().optional() })),
  removePermissionRule: defineOp("removePermissionRule", "Remove a permission rule for (resource, role).", z.object({ resource: z.string(), role: z.string() })),
  removeResourcePermissions: defineOp("removeResourcePermissions", "Remove the whole permission block of a resource.", z.object({ resource: z.string() })),
  setPermissionScope: defineOp("setPermissionScope", "Add a multi-tenant row scope to a permission rule: rows whose `column` matches a JWT `claim`.", z.object({ resource: z.string(), role: z.string(), column: z.string(), claim: z.string().optional() })),
  removePermissionScope: defineOp("removePermissionScope", "Remove the multi-tenant scope from a permission rule.", z.object({ resource: z.string(), role: z.string() })),

  // 2.7 Features
  enableFileUpload: defineOp("enableFileUpload", "Enable file uploads (provider r2/s3/local, optional size/type limits).", z.object({ provider: storageProvider, maxSizeMB: z.number().optional(), allowedTypes: z.array(z.string()).optional() })),
  disableFileUpload: defineOp("disableFileUpload", "Disable file uploads.", z.object({})),
  addOutboundWebhook: defineOp("addOutboundWebhook", "Register an outbound webhook event.", z.object({ event: z.string() })),
  removeOutboundWebhook: defineOp("removeOutboundWebhook", "Remove an outbound webhook event.", z.object({ event: z.string() })),
  addInboundWebhook: defineOp("addInboundWebhook", "Register an inbound webhook source (e.g. stripe, github).", z.object({ source: z.string() })),
  removeInboundWebhook: defineOp("removeInboundWebhook", "Remove an inbound webhook source.", z.object({ source: z.string() })),
  setSearch: defineOp("setSearch", "Enable/disable search (optionally fuzzy).", z.object({ enabled: z.boolean(), fuzzy: z.boolean().optional() })),
  setPagination: defineOp("setPagination", "Set pagination defaults (defaultLimit, maxLimit).", z.object({ defaultLimit: z.number(), maxLimit: z.number() })),
  setFeatureRateLimit: defineOp("setFeatureRateLimit", "Set feature-level rate limits (perKey / public, e.g. '100/min').", z.object({ perKey: z.string().optional(), public: z.string().optional() })),

  // 2.8 authFlows
  setAuthFlow: defineOp("setAuthFlow", "Toggle an auth flow (passwordReset | refreshTokens | revocation | emailVerification).", z.object({ flow: z.enum(["passwordReset", "refreshTokens", "revocation", "emailVerification"]), value: z.boolean() })),

  // 2.9 Env
  addEnvVar: defineOp("addEnvVar", "Declare a custom environment variable.", z.object({ name: z.string(), required: z.boolean().optional(), generate: z.boolean().optional(), managedByCloud: z.boolean().optional(), description: z.string().optional() })),
  modifyEnvVar: defineOp("modifyEnvVar", "Modify an existing environment variable's flags/description.", z.object({ name: z.string(), required: z.boolean().optional(), generate: z.boolean().optional(), managedByCloud: z.boolean().optional(), description: z.string().optional() })),
  removeEnvVar: defineOp("removeEnvVar", "Remove an environment variable. Requires confirmation.", z.object({ name: z.string() })),

  // 2.10 Custom endpoints
  addCustomEndpoint: defineOp("addCustomEndpoint", "Add a custom endpoint to a resource.", z.object({ resource: z.string(), definition: customEndpointDef })),
  removeCustomEndpoint: defineOp("removeCustomEndpoint", "Remove a custom endpoint from a resource.", z.object({ resource: z.string(), path: z.string(), method: httpMethod.optional() })),

  // 2.11 State machine
  setStateMachine: defineOp("setStateMachine", "Define a state machine over an enum field: initial state + whitelisted transitions (optionally role-gated).", z.object({ resource: z.string(), field: z.string(), initial: z.string(), transitions: z.array(stateTransition) })),
  addStateTransition: defineOp("addStateTransition", "Add one allowed transition to a resource's state machine.", z.object({ resource: z.string(), from: z.string(), to: z.string(), roles: z.array(z.string()).optional() })),
  removeStateTransition: defineOp("removeStateTransition", "Remove an allowed transition from a state machine.", z.object({ resource: z.string(), from: z.string(), to: z.string() })),
  removeStateMachine: defineOp("removeStateMachine", "Remove a resource's state machine. DESTRUCTIVE. Requires confirmation.", z.object({ resource: z.string() })),

  // 2.12 Aggregates
  addAggregate: defineOp("addAggregate", "Add a denormalised aggregate (count/sum/avg/min/max over a relation).", z.object({ resource: z.string(), name: z.string(), op: aggregateOp, relation: z.string(), field: z.string().optional() })),
  removeAggregate: defineOp("removeAggregate", "Remove an aggregate from a resource.", z.object({ resource: z.string(), name: z.string() })),

  // 2.13 Resource flags / transactions
  setSoftDelete: defineOp("setSoftDelete", "Toggle soft-delete on a resource.", z.object({ resource: z.string(), enabled: z.boolean() })),
  setTimestamps: defineOp("setTimestamps", "Toggle createdAt/updatedAt timestamps on a resource.", z.object({ resource: z.string(), enabled: z.boolean() })),
  setTransactions: defineOp("setTransactions", "Set the multi-step transaction blocks of a resource.", z.object({ resource: z.string(), transactions: z.array(transactionConfig) })),
} satisfies Record<OperationType, OperationToolMeta>;
