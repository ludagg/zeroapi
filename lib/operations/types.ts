/**
 * Operation engine — type catalogue.
 *
 * Implements the operation catalogue described in OPERATIONS.md (Étape 2).
 * Each `Operation` is a plain, serialisable object: a discriminated union keyed
 * by `type`. The LLM / caller never produces a spec — it picks an operation and
 * its typed parameters; the *code* (the pure functions in this folder) owns the
 * mutation and the validity guarantee.
 *
 * Conventions (OPERATIONS.md §2):
 *   - Per-resource relation types are camelCase: oneToOne | oneToMany |
 *     manyToOne | manyToMany, onDelete ∈ Cascade|SetNull|Restrict|NoAction.
 *   - Top-level relation types are kebab-case: one-to-one | one-to-many |
 *     many-to-one | many-to-many, onDelete ∈ cascade|set-null|restrict.
 *
 * Destructive operations (🔴 in the catalogue) accept an optional
 * `confirmed: true`. Without it, when the operation would have a non-empty
 * impact, the executor returns `requiresConfirmation` with the computed impact
 * instead of mutating anything (OPERATIONS.md §4.2).
 */

import type {
  CrudAction,
  CustomEndpointDef,
  FieldType,
  OAuthProviderName,
  ResourceRBAC,
  ZeroAPISpec,
} from "@ludagg/zeroapi-runtime";

// ── Shared parameter sub-types ──────────────────────────────────────────────

/** Field options that can be set / merged on a field definition. */
export interface FieldOptions {
  required?: boolean;
  unique?: boolean;
  index?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  description?: string;
  /** Required when the field type is `enum`. */
  values?: string[];
  accept?: string[];
  maxSize?: string;
  storage?: "r2" | "s3" | "local";
  default?: unknown;
}

/** Per-resource relation type (camelCase). */
export type PerResourceRelationType =
  | "oneToOne"
  | "oneToMany"
  | "manyToOne"
  | "manyToMany";

/** Top-level relation type (kebab-case). */
export type TopLevelRelationType =
  | "one-to-one"
  | "one-to-many"
  | "many-to-one"
  | "many-to-many";

export type PerResourceOnDelete = "Cascade" | "SetNull" | "Restrict" | "NoAction";
export type TopLevelOnDelete = "cascade" | "set-null" | "restrict";

export type LegacyAuthStrategy = "jwt" | "apikey" | "bearer";
export type AuthFlag = "emailVerification" | "passwordReset";
export type AuthFlow =
  | "passwordReset"
  | "refreshTokens"
  | "revocation"
  | "emailVerification";
export type StorageProvider = "r2" | "s3" | "local";

// ── Operation union ─────────────────────────────────────────────────────────

// 2.1 Meta
export interface SetApiNameOp { type: "setApiName"; name: string }
export interface SetApiDescriptionOp { type: "setApiDescription"; description?: string }
export interface SetGlobalRateLimitOp { type: "setGlobalRateLimit"; windowMs: number; max: number }
export interface ClearGlobalRateLimitOp { type: "clearGlobalRateLimit" }

// 2.2 Resources
export interface AddResourceOp {
  type: "addResource";
  name: string;
  fields?: Record<string, { type: FieldType } & FieldOptions>;
  description?: string;
  endpoints?: CrudAction[];
  rbac?: ResourceRBAC;
}
export interface RemoveResourceOp { type: "removeResource"; name: string; confirmed?: boolean }
export interface RenameResourceOp { type: "renameResource"; oldName: string; newName: string }
export interface SetResourceDescriptionOp { type: "setResourceDescription"; name: string; description?: string }
export interface SetResourceEndpointsOp { type: "setResourceEndpoints"; name: string; endpoints: CrudAction[] }
export interface SetResourceRbacOp { type: "setResourceRbac"; name: string; rbac: ResourceRBAC }
export interface SetSearchableFieldsOp { type: "setSearchableFields"; name: string; fields: string[] }

// 2.3 Fields
export interface AddFieldOp {
  type: "addField";
  resource: string;
  field: string;
  fieldType: FieldType;
  options?: FieldOptions;
}
export interface ModifyFieldOptionsOp { type: "modifyFieldOptions"; resource: string; field: string; options: FieldOptions }
export interface SetFieldTypeOp {
  type: "setFieldType";
  resource: string;
  field: string;
  fieldType: FieldType;
  options?: FieldOptions;
  confirmed?: boolean;
}
export interface SetFieldRequiredOp { type: "setFieldRequired"; resource: string; field: string; required: boolean }
export interface RenameFieldOp { type: "renameField"; resource: string; oldName: string; newName: string; confirmed?: boolean }
export interface RemoveFieldOp { type: "removeField"; resource: string; field: string; confirmed?: boolean }
export interface AddEnumValueOp { type: "addEnumValue"; resource: string; field: string; value: string }
export interface RemoveEnumValueOp { type: "removeEnumValue"; resource: string; field: string; value: string; confirmed?: boolean }
export interface SetEnumValuesOp { type: "setEnumValues"; resource: string; field: string; values: string[]; confirmed?: boolean }

// 2.4 Relations (top-level + per-resource)
export interface AddRelationOp {
  type: "addRelation";
  from: string;
  to: string;
  relationType: TopLevelRelationType;
  field?: string;
  through?: string;
  onDelete?: TopLevelOnDelete;
}
export interface RemoveRelationOp { type: "removeRelation"; from: string; to: string; relationType?: TopLevelRelationType }
export interface SetRelationOnDeleteOp { type: "setRelationOnDelete"; from: string; to: string; onDelete: TopLevelOnDelete }
export interface AddResourceRelationOp {
  type: "addResourceRelation";
  resource: string;
  target: string;
  relationType: PerResourceRelationType;
  field: string;
  onDelete?: PerResourceOnDelete;
  through?: string;
}
export interface RemoveResourceRelationOp { type: "removeResourceRelation"; resource: string; target: string; relationType?: PerResourceRelationType }

// 2.5 Auth
export interface EnableJwtOp {
  type: "enableJwt";
  secretEnv?: string;
  accessTokenTTL?: string;
  refreshTokenTTL?: string;
}
export interface DisableJwtOp { type: "disableJwt"; confirmed?: boolean }
export interface EnableApiKeyOp { type: "enableApiKey"; header?: string; prefix?: string }
export interface DisableApiKeyOp { type: "disableApiKey" }
export interface AddOAuthProviderOp {
  type: "addOAuthProvider";
  provider: OAuthProviderName;
  clientIdEnv?: string;
  clientSecretEnv?: string;
  scopes?: string[];
}
export interface RemoveOAuthProviderOp { type: "removeOAuthProvider"; provider: OAuthProviderName }
export interface SetAuthFlagOp { type: "setAuthFlag"; flag: AuthFlag; value: boolean }
export interface DisableAuthOp { type: "disableAuth"; confirmed?: boolean }
export interface SetLegacyAuthStrategyOp { type: "setLegacyAuthStrategy"; strategy: LegacyAuthStrategy }

// 2.6 Roles & permissions
export interface AddRoleOp { type: "addRole"; name: string }
export interface RemoveRoleOp { type: "removeRole"; name: string; confirmed?: boolean }
export interface RenameRoleOp { type: "renameRole"; oldName: string; newName: string }
export interface SetPermissionRuleOp {
  type: "setPermissionRule";
  resource: string;
  role: string;
  actions: ("create" | "read" | "update" | "delete")[];
  ownOnly?: boolean;
}
export interface RemovePermissionRuleOp { type: "removePermissionRule"; resource: string; role: string }
export interface RemoveResourcePermissionsOp { type: "removeResourcePermissions"; resource: string }

// 2.7 Features
export interface EnableFileUploadOp {
  type: "enableFileUpload";
  provider: StorageProvider;
  maxSizeMB?: number;
  allowedTypes?: string[];
}
export interface DisableFileUploadOp { type: "disableFileUpload" }
export interface AddOutboundWebhookOp { type: "addOutboundWebhook"; event: string }
export interface RemoveOutboundWebhookOp { type: "removeOutboundWebhook"; event: string }
export interface AddInboundWebhookOp { type: "addInboundWebhook"; source: string }
export interface RemoveInboundWebhookOp { type: "removeInboundWebhook"; source: string }
export interface SetSearchOp { type: "setSearch"; enabled: boolean; fuzzy?: boolean }
export interface SetPaginationOp { type: "setPagination"; defaultLimit: number; maxLimit: number }
export interface SetFeatureRateLimitOp { type: "setFeatureRateLimit"; perKey?: string; public?: string }

// 2.8 authFlows
export interface SetAuthFlowOp { type: "setAuthFlow"; flow: AuthFlow; value: boolean }

// 2.9 Env
export interface AddEnvVarOp {
  type: "addEnvVar";
  name: string;
  required?: boolean;
  generate?: boolean;
  managedByCloud?: boolean;
  description?: string;
}
export interface ModifyEnvVarOp {
  type: "modifyEnvVar";
  name: string;
  required?: boolean;
  generate?: boolean;
  managedByCloud?: boolean;
  description?: string;
}
export interface RemoveEnvVarOp { type: "removeEnvVar"; name: string; confirmed?: boolean }

// 2.10 Custom endpoints
export interface AddCustomEndpointOp { type: "addCustomEndpoint"; resource: string; definition: CustomEndpointDef }
export interface RemoveCustomEndpointOp { type: "removeCustomEndpoint"; resource: string; path: string; method?: CustomEndpointDef["method"] }

export type Operation =
  // meta
  | SetApiNameOp | SetApiDescriptionOp | SetGlobalRateLimitOp | ClearGlobalRateLimitOp
  // resources
  | AddResourceOp | RemoveResourceOp | RenameResourceOp | SetResourceDescriptionOp
  | SetResourceEndpointsOp | SetResourceRbacOp | SetSearchableFieldsOp
  // fields
  | AddFieldOp | ModifyFieldOptionsOp | SetFieldTypeOp | SetFieldRequiredOp
  | RenameFieldOp | RemoveFieldOp | AddEnumValueOp | RemoveEnumValueOp | SetEnumValuesOp
  // relations
  | AddRelationOp | RemoveRelationOp | SetRelationOnDeleteOp
  | AddResourceRelationOp | RemoveResourceRelationOp
  // auth
  | EnableJwtOp | DisableJwtOp | EnableApiKeyOp | DisableApiKeyOp
  | AddOAuthProviderOp | RemoveOAuthProviderOp | SetAuthFlagOp | DisableAuthOp
  | SetLegacyAuthStrategyOp
  // roles & permissions
  | AddRoleOp | RemoveRoleOp | RenameRoleOp
  | SetPermissionRuleOp | RemovePermissionRuleOp | RemoveResourcePermissionsOp
  // features
  | EnableFileUploadOp | DisableFileUploadOp | AddOutboundWebhookOp | RemoveOutboundWebhookOp
  | AddInboundWebhookOp | RemoveInboundWebhookOp | SetSearchOp | SetPaginationOp | SetFeatureRateLimitOp
  // authFlows
  | SetAuthFlowOp
  // env
  | AddEnvVarOp | ModifyEnvVarOp | RemoveEnvVarOp
  // custom endpoints
  | AddCustomEndpointOp | RemoveCustomEndpointOp;

export type OperationType = Operation["type"];

// ── Result types ────────────────────────────────────────────────────────────

/** Computed impact of a destructive operation, surfaced for confirmation. */
export interface ConfirmationImpact {
  operation: OperationType;
  reason: string;
  /** Human-readable bullet list of what the operation will affect. */
  impact: string[];
}

export type ApplyResult =
  | { ok: true; spec: ZeroAPISpec }
  | { ok: false; error: string; requiresConfirmation?: ConfirmationImpact };

// ── Errors thrown by the pure operation functions ───────────────────────────

/** Hard failure: invalid params, missing target, collision, orphan w/o cascade. */
export class OperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationError";
  }
}

/** A destructive operation needs an explicit `confirmed: true` to proceed. */
export class ConfirmationRequiredError extends Error {
  readonly impact: ConfirmationImpact;
  constructor(operation: OperationType, reason: string, impact: string[]) {
    super(reason);
    this.name = "ConfirmationRequiredError";
    this.impact = { operation, reason, impact };
  }
}

/** Danger classification from the catalogue (OPERATIONS.md §2, legend). */
export type Danger = "safe" | "guarded" | "destructive";
