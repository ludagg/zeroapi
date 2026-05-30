# Types exacts de `ZeroAPISpec` — `@ludagg/zeroapi-runtime@0.20.0`

> Référence extraite **mot pour mot** du runtime installé, avant extension de la validation.

- **Version confirmée :** `0.20.0` (`node_modules/@ludagg/zeroapi-runtime/package.json`)
- **Fichier source :** `node_modules/@ludagg/zeroapi-runtime/dist/index.d.ts` (identique à `index.d.mts`)
- Les références `index.d.ts:<ligne>` pointent vers ce fichier.

---

## Type racine — `ZeroAPISpec`

`index.d.ts:339`
```ts
interface ZeroAPISpec {
    version: string;
    name: string;
    description?: string;
    baseUrl?: string;
    auth?: GlobalAuthConfig;
    roles?: RoleDefinition[];
    rateLimit?: RateLimitConfig;
    cors?: CorsConfig;
    security?: SecurityConfig;
    resources: ResourceDefinition[];
    /** Chantier 5: mount auth registration/login/verification/reset endpoints. */
    authFlows?: AuthFlowsConfig;
    /** Chantier 4: env var names that must be set at startup (validated by assertEnv). */
    requiredEnv?: string[];
    /** Phase 0: top-level relations across resources. */
    relations?: SpecRelation[];
    /** Phase 0: declared environment variables. */
    env?: EnvVarDefinition[];
    /** Phase 0: declarative role-based permissions. */
    permissions?: PermissionDefinition[];
    /** Phase 0: optional cross-cutting features (uploads, webhooks, search, ...). */
    features?: FeaturesConfig;
}
```

---

## Resources & champs

`index.d.ts:5` — `FieldType`
```ts
type FieldType = 'string' | 'text' | 'number' | 'integer' | 'decimal' | 'boolean' | 'date' | 'datetime' | 'email' | 'url' | 'uuid' | 'file' | 'file[]' | 'json' | 'enum';
```

`index.d.ts:7` — `FieldDefinition`
```ts
interface FieldDefinition {
    type: FieldType;
    required?: boolean;
    unique?: boolean;
    index?: boolean;
    default?: unknown;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    description?: string;
    /** Allowed values when type === 'enum'. */
    values?: string[];
    accept?: string[];
    maxSize?: string;
    storage?: 'r2' | 's3' | 'local';
    multiple?: boolean;
}
```

`index.d.ts:26` — `CrudAction`
```ts
type CrudAction = 'list' | 'create' | 'read' | 'update' | 'delete';
```

`index.d.ts:149` — `ResourceDefinition`
```ts
interface ResourceDefinition {
    name: string;
    description?: string;
    fields: Record<string, FieldDefinition>;
    endpoints?: CrudAction[];
    auth?: AuthConfig;
    hooks?: ResourceHooks;
    rbac?: ResourceRBAC;
    relations?: RelationDefinition[];
    transactions?: TransactionConfig[];
    /** Declarative state machine over an enum field (transitions + role gating). */
    stateMachine?: StateMachineDef;
    /** Read-only aggregates over to-many relations, opt-in via `?include=<name>`. */
    aggregates?: AggregateDef[];
    customEndpoints?: CustomEndpointDef[];
    /** Soft-delete: keep rows and mark a deletedAt column. */
    softDelete?: boolean;
    /** Auto-managed createdAt/updatedAt columns (default: true). */
    timestamps?: boolean;
    /** Field names indexed for full-text search. */
    searchable?: string[];
}
```

`index.d.ts:28` — `AuthConfig` (per-resource)
```ts
interface AuthConfig {
    required: boolean;
    roles?: string[];
    strategy?: 'jwt' | 'apikey' | 'bearer';
}
```

`index.d.ts:39` — `ResourceHooks`
```ts
interface ResourceHooks {
    beforeCreate?: string;
    afterCreate?: string;
    beforeUpdate?: string;
    afterUpdate?: string;
    beforeDelete?: string;
    afterDelete?: string;
}
```

`index.d.ts:61` — `ResourceRBAC`
```ts
interface ResourceRBAC {
    read?: string[];
    write?: string[];
    delete?: string[];
}
```

`index.d.ts:47` — `HttpMethod`
```ts
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
```

`index.d.ts:49` — `CustomEndpointDef`
```ts
interface CustomEndpointDef {
    method: HttpMethod;
    /** Path relative to the resource route, e.g. "/:id/publish" or "/stats". */
    path: string;
    /** ID of the handler in the createRuntime({ handlers }) map. */
    handler: string;
    /** Require global auth middleware when true. */
    auth?: boolean;
    /** Require specific roles (implies auth). */
    roles?: string[];
}
```

---

## Relations

`index.d.ts:66` — `RelationType`
```ts
type RelationType = 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
```

`index.d.ts:67` — `RelationDefinition`
```ts
interface RelationDefinition {
    type: RelationType;
    /** Name of the related resource (must exist in spec.resources). */
    resource: string;
    /** FK field name on this resource (required for manyToOne / oneToOne owned side). */
    field?: string;
    required?: boolean;
    /** Join table name — required for manyToMany. */
    through?: string;
    /** Extra fields stored on the join table. */
    fields?: Record<string, FieldDefinition>;
    onDelete?: 'Cascade' | 'SetNull' | 'Restrict' | 'NoAction';
    /**
     * Self many-to-many only: names the FORWARD direction (edges this row owns).
     * e.g. `as: 'following'`. Enables `?include=following` / `?following=<id>`.
     */
    as?: string;
    /**
     * Self many-to-many only: names the REVERSE direction (edges pointing at this
     * row). e.g. `reverseAs: 'followers'`. Enables `?include=followers` /
     * `?followers=<id>`.
     */
    reverseAs?: string;
}
```

`index.d.ts:257` — `SpecRelationType`
```ts
type SpecRelationType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
```

`index.d.ts:258` — `SpecRelation` (top-level)
```ts
interface SpecRelation {
    /** Name of the source resource (must exist in spec.resources). */
    from: string;
    /** Name of the target resource (must exist in spec.resources). */
    to: string;
    type: SpecRelationType;
    /** Field name on the source side. */
    field: string;
    /** Join table name — required for many-to-many. */
    through?: string;
    onDelete?: 'cascade' | 'set-null' | 'restrict';
}
```

---

## Transactions

`index.d.ts:91` — `TxAction`
```ts
type TxAction = 'create' | 'update' | 'delete' | 'decrement' | 'increment';
```

`index.d.ts:92` — `TxOperation`
```ts
interface TxOperation {
    action: TxAction;
    resource: string;
    /** Key in the request body to read the related resource ID from. */
    idFrom?: string;
    /** Field to increment / decrement. */
    field?: string;
    /** Static amount (integer). */
    amount?: number;
    /** Key in the request body to read the amount from. */
    amountFrom?: string;
}
```

`index.d.ts:104` — `TransactionConfig`
```ts
interface TransactionConfig {
    trigger: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    operations: TxOperation[];
}
```

---

## State machine & agrégats

`index.d.ts:109` — `StateTransition`
```ts
interface StateTransition {
    /** Source state (must be a value of the enum field). */
    from: string;
    /** Target state (must be a value of the enum field). */
    to: string;
    /** Roles allowed to perform this transition. Omitted/empty = any role. */
    roles?: string[];
}
```

`index.d.ts:122` — `StateMachineDef`
```ts
interface StateMachineDef {
    /** Name of the enum field this machine governs. */
    field: string;
    /** State assigned at creation. Must be a value of the enum field. */
    initial: string;
    /** Whitelisted transitions; anything not listed is rejected (409). */
    transitions: StateTransition[];
}
```

`index.d.ts:131` — `AggregateOp`
```ts
type AggregateOp = 'count' | 'sum' | 'avg' | 'min' | 'max';
```

`index.d.ts:140` — `AggregateDef`
```ts
interface AggregateDef {
    /** Field name added to the response (e.g. 'orderCount'). */
    name: string;
    op: AggregateOp;
    /** A to-many relation of this resource (target resource name, singular or plural). */
    relation: string;
    /** Child field to aggregate — required for sum/avg/min/max, omitted for count. */
    field?: string;
}
```

---

## Auth (global)

`index.d.ts:180` — `JwtAuthConfig`
```ts
interface JwtAuthConfig {
    /** Phase 1.2: opt-in flag that activates the JWT user system (register/login/refresh/me). */
    enabled?: boolean;
    accessTokenTTL?: string;
    refreshTokenTTL?: string;
    secretEnv?: string;
}
```

`index.d.ts:187` — `ApiKeyAuthConfig`
```ts
interface ApiKeyAuthConfig {
    enabled: boolean;
    header?: string;
    prefix?: string;
}
```

`index.d.ts:192` — `OAuthProviderName`
```ts
type OAuthProviderName = 'google' | 'apple' | 'github';
```

`index.d.ts:193` — `OAuthProviderConfig`
```ts
interface OAuthProviderConfig {
    name: OAuthProviderName;
    clientIdEnv: string;
    clientSecretEnv: string;
    scopes?: string[];
}
```

`index.d.ts:199` — `OAuthConfig`
```ts
interface OAuthConfig {
    providers: OAuthProviderConfig[];
}
```

`index.d.ts:202` — `GlobalAuthConfig`
```ts
interface GlobalAuthConfig {
    enabled?: boolean;
    strategies?: ('jwt' | 'apikey' | 'oauth')[];
    jwt?: JwtAuthConfig;
    apikey?: ApiKeyAuthConfig;
    oauth?: OAuthConfig;
    emailVerification?: boolean;
    passwordReset?: boolean;
    strategy?: 'jwt' | 'apikey' | 'bearer';
    secret?: string;
    header?: string;
}
```

`index.d.ts:239` — `LockoutConfig`
```ts
interface LockoutConfig {
    /** Number of failed login attempts before locking. Default: 5. */
    maxAttempts: number;
    /** Lock duration in milliseconds. Default: 15 minutes. */
    windowMs: number;
}
```

`index.d.ts:245` — `AuthFlowsConfig`
```ts
interface AuthFlowsConfig {
    /** Enable email verification flow (POST /auth/verify-email). */
    emailVerification?: boolean;
    /** Enable password reset flow (POST /auth/forgot-password + /auth/reset-password). */
    passwordReset?: boolean;
    /** Enable refresh token rotation (POST /auth/refresh). */
    refreshTokens?: boolean;
    /** Enable token revocation (POST /auth/logout). */
    revocation?: boolean;
    /** Account lockout after N failed login attempts. */
    lockout?: LockoutConfig;
}
```

---

## Rôles, sécurité, CORS, rate-limit

`index.d.ts:214` — `RoleDefinition`
```ts
interface RoleDefinition {
    name: string;
    description?: string;
    inherits?: string[];
}
```

`index.d.ts:219` — `RateLimitConfig`
```ts
interface RateLimitConfig {
    windowMs: number;
    max: number;
    byUser?: boolean;
    message?: string;
}
```

`index.d.ts:225` — `CorsConfig`
```ts
interface CorsConfig {
    origins: string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
}
```

`index.d.ts:231` — `SecurityConfig`
```ts
interface SecurityConfig {
    contentSecurityPolicy?: boolean;
    hsts?: boolean;
    noSniff?: boolean;
    frameguard?: boolean | 'DENY' | 'SAMEORIGIN';
    xssProtection?: boolean;
    referrerPolicy?: string;
}
```

---

## Env vars & permissions

`index.d.ts:270` — `EnvVarDefinition`
```ts
interface EnvVarDefinition {
    name: string;
    required: boolean;
    description?: string;
    example?: string;
    /** When true, ZeroAPI generates a random value at deploy. */
    generate?: boolean;
    /** When true, ZeroAPI Cloud manages the secret. */
    managedByCloud?: boolean;
}
```

`index.d.ts:280` — `PermissionAction`
```ts
type PermissionAction = 'create' | 'read' | 'update' | 'delete';
```

`index.d.ts:292` — `PermissionScope`
```ts
interface PermissionScope {
    /** Resource column to match against the claim value (e.g. 'organizationId'). */
    column: string;
    /** JWT claim carrying the tenant value (e.g. 'org'). Defaults to 'sub'. */
    claim?: string;
}
```

`index.d.ts:298` — `PermissionRule`
```ts
interface PermissionRule {
    role: string;
    actions: PermissionAction[];
    /** Restrict the rule to rows owned by the requester (sugar for scope by userId). */
    ownOnly?: boolean;
    /** Restrict the rule to rows whose `column` matches a JWT claim (multi-tenant). */
    scope?: PermissionScope;
}
```

`index.d.ts:306` — `PermissionDefinition`
```ts
interface PermissionDefinition {
    resource: string;
    rules: PermissionRule[];
}
```

---

## Features (cross-cutting)

`index.d.ts:310` — `FileUploadFeature`
```ts
interface FileUploadFeature {
    enabled: boolean;
    provider: 's3' | 'r2' | 'local';
    maxSizeMB: number;
    allowedTypes: string[];
}
```

`index.d.ts:316` — `WebhooksFeature`
```ts
interface WebhooksFeature {
    outbound?: string[];
    inbound?: string[];
}
```

`index.d.ts:320` — `SearchFeature`
```ts
interface SearchFeature {
    enabled: boolean;
    fuzzy?: boolean;
}
```

`index.d.ts:324` — `RateLimitFeature`
```ts
interface RateLimitFeature {
    perKey?: string;
    public?: string;
}
```

`index.d.ts:328` — `PaginationFeature`
```ts
interface PaginationFeature {
    defaultLimit?: number;
    maxLimit?: number;
}
```

`index.d.ts:332` — `FeaturesConfig`
```ts
interface FeaturesConfig {
    fileUpload?: FileUploadFeature;
    webhooks?: WebhooksFeature;
    search?: SearchFeature;
    rateLimit?: RateLimitFeature;
    pagination?: PaginationFeature;
}
```

---

## Note sur les ré-exports

`ZeroAPISpec` et tous ses sous-types sont des `interface`/`type` internes, mais **ne sont pas tous ré-exportés** par le barrel (`index.d.ts:2671`).

**Exportés** : `ZeroAPISpec`, `ResourceDefinition`, `FieldDefinition`, `FieldType`, `GlobalAuthConfig`,
`RoleDefinition`, `RateLimitConfig`, `CorsConfig`, `SecurityConfig`, `AuthFlowsConfig`, `SpecRelation`,
`SpecRelationType`, `EnvVarDefinition`, `PermissionDefinition`, `PermissionRule`, `PermissionAction`,
`FeaturesConfig`, `RelationDefinition`, `RelationType`, `ResourceHooks`, `ResourceRBAC`,
`CustomEndpointDef`, `HttpMethod`, `CrudAction`, `TransactionConfig`, `AuthConfig`, et les sous-features
(`FileUploadFeature`, `WebhooksFeature`, `SearchFeature`, `RateLimitFeature`, `PaginationFeature`).

**Non exportés** (à recopier localement avant d'étendre la validation) : `StateTransition`,
`StateMachineDef`, `AggregateOp`, `AggregateDef`, `TxAction`, `TxOperation`, `PermissionScope`,
`JwtAuthConfig`, `ApiKeyAuthConfig`, `OAuthConfig`, `OAuthProviderConfig`,
`OAuthProviderName` (limité à `'google' | 'apple' | 'github'`) et `LockoutConfig`.
