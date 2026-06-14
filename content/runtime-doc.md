## Introduction

`@ludagg/zeroapi-runtime` turns a single declarative **spec** into a complete, production-ready HTTP API. You describe *what* your API contains — resources, fields, relations, auth, permissions — and the runtime produces the whole backend: CRUD routes, Zod validation, authentication, RBAC, relations, webhooks, OpenAPI docs and more.

The mental model is one sentence: **the spec is the running API**. There is no code-generation step you edit afterwards and no scaffold that drifts from its design — you feed the spec to `createRuntime()` and you get a live [Hono](https://hono.dev) app. Because the same object drives validation, routing, the database schema and the docs, the contract and the implementation can never disagree.

```ts
import { parseSpec, createRuntime } from '@ludagg/zeroapi-runtime'

const spec = parseSpec({
  version: '1.0.0',
  name: 'my-api',
  resources: [
    { name: 'Post', fields: { title: { type: 'string', required: true } } },
  ],
})

const { app } = createRuntime(spec)
export default app   // a Hono app — runs on Node, Bun, Deno, Cloudflare Workers
```

That snippet already gives you `GET/POST /posts`, `GET/PUT/DELETE /posts/:id`, validation on every write, filtering/sorting/search/pagination, OpenAPI docs at `/docs`, and `/health` + `/ready` probes.

This documentation is example-first: every feature is shown as **spec in → request → real JSON response**. Start with the [Quickstart](#quickstart-a-blog-api-in-5-minutes), then dip into the feature you need.

---

## Installation

```bash
npm install @ludagg/zeroapi-runtime
# or
pnpm add @ludagg/zeroapi-runtime
# or
bun add @ludagg/zeroapi-runtime
```

`hono` and `zod` are regular dependencies and install automatically. The only **optional peer dependency** is `@aws-sdk/client-s3`, needed solely if you use the S3/R2 storage provider:

```bash
npm install @aws-sdk/client-s3
```

To serve the app on Node you also want the Node adapter:

```bash
npm install @hono/node-server
```

**Requirements:** Node.js `>= 18`. The runtime is written in TypeScript and ships full type definitions.

---

## Quickstart: a Blog API in 5 minutes

We will build a small blog backend, run it, and exercise every CRUD verb with `curl` so you can see the exact responses.

### 1. Describe the API

```ts
// blog.ts
import { parseSpec, createRuntime } from '@ludagg/zeroapi-runtime'
import { serve } from '@hono/node-server'

const spec = parseSpec({
  version: '1.0.0',
  name: 'blog-api',
  resources: [
    {
      name: 'Post',
      fields: {
        title:   { type: 'string', required: true, minLength: 1, maxLength: 200 },
        content: { type: 'text',   required: false },
        status:  { type: 'enum',   values: ['draft', 'published'], default: 'draft' },
        views:   { type: 'integer', default: 0, min: 0 },
      },
      searchable: ['title', 'content'],
    },
  ],
})

const { app } = createRuntime(spec)
serve({ fetch: app.fetch, port: 3000 })
console.log('Blog API on http://localhost:3000  ·  docs at /docs')
```

```bash
npx tsx blog.ts
```

`Post` is auto-pluralised to `/posts`. You now have the full route set:

```
GET    /posts          POST   /posts
GET    /posts/:id      PUT    /posts/:id      DELETE /posts/:id
GET    /health   GET /ready   GET /docs   GET /openapi.json
```

### 2. Create a post

```bash
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{ "title": "Hello ZeroAPI", "content": "My first post." }'
```

```jsonc
// 201 Created
{
  "data": {
    "id": "clt9x0a1b0000abcd",
    "title": "Hello ZeroAPI",
    "content": "My first post.",
    "status": "draft",
    "views": 0,
    "createdAt": "2026-06-14T09:00:00.000Z",
    "updatedAt": "2026-06-14T09:00:00.000Z"
  }
}
```

`status` defaulted to `draft`, `views` to `0`, and `createdAt`/`updatedAt` were added automatically (timestamps are on by default).

### 3. Validation is automatic

Send an invalid body and the runtime rejects it before anything is persisted:

```bash
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{ "title": "" }'
```

```jsonc
// 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    { "field": "title", "message": "String must contain at least 1 character(s)" }
  ]
}
```

### 4. List, filter, search, sort

```bash
curl 'http://localhost:3000/posts?status[eq]=draft&sort=createdAt:desc&limit=10'
```

```jsonc
// 200 OK
{
  "data": [ { "id": "clt9x0a1b0000abcd", "title": "Hello ZeroAPI", "status": "draft", "...": "..." } ],
  "count": 1,
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1, "hasNext": false, "hasPrev": false }
}
```

Because `Post` declares `searchable`, a full-text search works too:

```bash
curl 'http://localhost:3000/posts?q=hello'
```

### 5. Read, update, delete

```bash
curl http://localhost:3000/posts/clt9x0a1b0000abcd
# 200 → { "data": { "id": "clt9x0a1b0000abcd", "title": "Hello ZeroAPI", ... } }

curl -X PUT http://localhost:3000/posts/clt9x0a1b0000abcd \
  -H 'Content-Type: application/json' \
  -d '{ "status": "published" }'
# 200 → { "data": { ..., "status": "published" } }

curl -X DELETE http://localhost:3000/posts/clt9x0a1b0000abcd
# 200 → { "data": null }
```

### 6. Explore the docs

Open `http://localhost:3000/docs` for an interactive [Scalar](https://scalar.com) reference generated from your spec, or fetch the raw `GET /openapi.json`.

That is a complete, validated, documented backend from ~20 lines of spec. Everything below adds capability to this same shape.

---

## Core API: parseSpec & createRuntime

Two functions do the work.

**`parseSpec(raw)`** validates the structure, fills in defaults, and throws a `ParseError` with a readable message on invalid input. Always run a raw object through it before `createRuntime`.

**`createRuntime(spec, options?)`** builds the Hono app and returns everything you need to ship:

```ts
const {
  app,            // the wired Hono application
  prismaSchema,   // generated Prisma schema (string)
  zodSchemas,     // per-resource Zod validators
  openApiSpec,    // OpenAPI 3.0.3 document
  testSuite,      // a generated Vitest suite (string)
  spec,           // the parsed spec
  ready,          // Promise<void> — resolves once async boot completes
  shutdown,       // () => Promise<void> — graceful shutdown
} = createRuntime(spec)
```

`app.fetch` is a standard `(Request) => Response` handler, which is why the same app runs unchanged on Node, Bun, Deno and Cloudflare Workers. See the full [`createRuntime` options reference](#createruntime-options-reference) below.

---

## Field types

Every field has a `type`. The runtime uses it to generate the Zod validator, the Prisma column, and the OpenAPI schema.

| Type | Maps to | Extra options |
|---|---|---|
| `string` | `String` | `minLength`, `maxLength` |
| `text` | `String` | long text |
| `number` / `decimal` | `Float` | `min`, `max` |
| `integer` | `Int` | `min`, `max` |
| `boolean` | `Boolean` | |
| `date` / `datetime` | `DateTime` | ISO-8601 |
| `email` | `String` | validated as an email |
| `url` | `String` | validated as a URL |
| `uuid` | `String` | validated as a UUID |
| `enum` | `String` | requires `values: string[]` |
| `json` | `Json` | arbitrary object |
| `file` / `file[]` | `String` (URL) | `accept`, `maxSize`, `storage`, `multiple` |

Every field also supports `required`, `unique`, `index`, `default`, and `description`:

```ts
fields: {
  email:  { type: 'email',   required: true, unique: true },
  age:    { type: 'integer', min: 0, max: 130 },
  role:   { type: 'enum',    values: ['user', 'admin'], default: 'user' },
  avatar: { type: 'file',    accept: ['image/png', 'image/jpeg'], maxSize: '5MB', storage: 'local' },
  meta:   { type: 'json',    required: false, description: 'Arbitrary metadata' },
}
```

A `unique` constraint that is violated returns `409 Conflict`; a value of the wrong type or out of range returns the `400 Validation failed` shape shown in the Quickstart.

---

## Resources & endpoints

A resource is one entity in your model. The full shape:

```ts
interface ResourceDefinition {
  name: string
  description?: string
  fields: Record<string, FieldDefinition>
  endpoints?: ('list' | 'create' | 'read' | 'update' | 'delete')[]  // default: all five
  auth?: { required: boolean; roles?: string[]; strategy?: 'jwt' | 'apikey' | 'bearer' }
  rbac?: { read?: string[]; write?: string[]; delete?: string[] }
  relations?: RelationDefinition[]
  transactions?: TransactionConfig[]
  hooks?: ResourceHooks
  customEndpoints?: CustomEndpointDef[]
  aggregates?: AggregateDefinition[]
  stateMachine?: StateMachineConfig
  softDelete?: boolean      // keep rows, set deletedAt instead of removing
  timestamps?: boolean      // auto createdAt/updatedAt (default: true)
  searchable?: string[]     // fields indexed for ?q= search
}
```

Restrict which routes are generated with `endpoints`:

```ts
{ name: 'AuditLog', fields: { /* … */ }, endpoints: ['list', 'read'] }  // read-only
```

Enable soft delete to keep history — `DELETE` then sets `deletedAt` instead of removing the row, reads hide it, and `?includeDeleted=true` opts back in:

```ts
{ name: 'Invoice', fields: { /* … */ }, softDelete: true }
```

---

## Querying: filter, sort, search

Every list endpoint accepts query parameters. **In Prisma mode all of this is pushed down to a single SQL query** (`WHERE` / `ORDER BY` / `LIMIT` / `OFFSET` + a real `COUNT(*)`) — the database never ships the whole table to Node.

### Filtering

```
GET /products?price[lte]=100&status[eq]=active
GET /products?name[contains]=phone
GET /products?sku[in]=ELEC-001,ELEC-002
GET /products?name[startsWith]=Pro
```

| Operator | Meaning |
|---|---|
| `eq`, `ne` | equals / not equals |
| `gt`, `gte`, `lt`, `lte` | numeric & date comparisons |
| `contains`, `startsWith`, `endsWith` | string matching |
| `in`, `notin` | comma-separated set membership |

Unknown fields or operators are rejected **before any query runs**:

```bash
curl 'http://localhost:3000/products?colour[eq]=red'
# 400 → { "error": "Unknown field: colour" }
```

### Sorting

```
GET /products?sort=price:desc
GET /products?sort=price:desc,name:asc      # multi-field
```

### Full-text search

When a resource declares `searchable` fields and `features.search.enabled` is `true`:

```
GET /products?q=wireless     # case-insensitive substring across searchable fields
```

---

## Pagination

Two modes share the same endpoint.

### Offset (classic page numbers)

```bash
curl 'http://localhost:3000/products?page=2&limit=20'
```

```jsonc
// 200 OK
{
  "data": [ /* up to 20 rows */ ],
  "count": 42,
  "pagination": { "page": 2, "limit": 20, "total": 42, "totalPages": 3, "hasNext": true, "hasPrev": true }
}
```

### Cursor (keyset, stable for infinite scroll)

```bash
curl 'http://localhost:3000/products?sort=price:asc&limit=5'
```

```jsonc
// 200 OK
{
  "data": [ /* 5 rows */ ],
  "count": 42,
  "pagination": { "page": 1, "limit": 5, "total": 42, "totalPages": 9, "hasNext": true, "hasPrev": false },
  "nextCursor": "clt9x0a1b0000abcd"
}
```

Pass it back as `?cursor=`:

```bash
curl 'http://localhost:3000/products?sort=price:asc&limit=5&cursor=clt9x0a1b0000abcd'
```

> **Tip:** add `id` as a secondary sort key (`?sort=price:asc,id:asc`) to guarantee a stable total order across pages when several rows share a sort value.

---

## Relations

Declare relations per resource. The generated Prisma schema wires the foreign keys and join tables for you.

```ts
resources: [
  { name: 'Category', fields: { name: { type: 'string', required: true } } },
  {
    name: 'Product',
    fields: { name: { type: 'string', required: true }, price: { type: 'number', min: 0 } },
    relations: [
      // belongs-to: stores categoryId on Product
      { type: 'manyToOne', resource: 'Category', field: 'categoryId', onDelete: 'SetNull' },
      // many-to-many through a join table, with an extra field on the join row
      { type: 'manyToMany', resource: 'Tag', through: 'product_tags', fields: { position: { type: 'integer' } } },
    ],
  },
]
```

Supported types: `manyToOne`, `oneToMany`, `manyToMany`, `oneToOne`. `onDelete` accepts `Cascade`, `SetNull`, `Restrict`, or `NoAction` (the cascade runs atomically inside one `$transaction`).

Resolve related data at query time with `?include=` (depth-capped, nested in one Prisma query):

```bash
curl 'http://localhost:3000/products/clt9x0a1b0000abcd?include=Category'
```

```jsonc
// 200 OK
{
  "data": {
    "id": "clt9x0a1b0000abcd",
    "name": "Wireless mouse",
    "categoryId": "cat_123",
    "category": { "id": "cat_123", "name": "Electronics" }
  }
}
```

---

## Validation & error format

Errors are always JSON with an `error` string; validation and file errors add a `details` array.

| Status | When | Body shape |
|---|---|---|
| `400` | invalid body, unknown field/operator, bad `?include=` | `{ "error": "Validation failed", "details": [{ "field", "message" }] }` |
| `401` | missing / invalid credentials | `{ "error": "Authentication required" }` |
| `403` | authenticated but not allowed (RBAC / role gate) | `{ "error": "..." }` |
| `404` | row not found (or outside your tenant scope) | `{ "error": "Post with id \"…\" not found" }` |
| `409` | unique conflict, failed transaction, illegal state transition | `{ "error": "..." }` |
| `422` | file failed MIME / size validation | `{ "error": "File validation failed", "details": [...] }` |
| `429` | rate limit exceeded | `{ "error": "Rate limit exceeded" }` |

---

## Authentication

ZeroAPI supports three strategies that can be combined: a **JWT user system**, **API keys**, and **OAuth**. Configure them under `spec.auth`; gate a resource with `auth: { required: true }`.

```ts
auth: {
  enabled: true,
  strategies: ['jwt', 'apikey', 'oauth'],
  jwt:    { enabled: true, accessTokenTTL: '15m', refreshTokenTTL: '30d', secretEnv: 'JWT_SECRET' },
  apikey: { enabled: true, header: 'X-API-Key', prefix: 'zk_' },
  oauth:  { providers: [{ name: 'google', clientIdEnv: 'GOOGLE_CLIENT_ID', clientSecretEnv: 'GOOGLE_CLIENT_SECRET' }] },
  emailVerification: true,
  passwordReset: true,
}
```

### JWT user system

Enabling `auth.jwt` mounts a complete user system. A full flow:

```bash
# 1. Register
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{ "email": "ada@example.com", "password": "s3cret-passphrase" }'
```

```jsonc
// 201 Created
{
  "data": {
    "user": { "id": "usr_1", "email": "ada@example.com" },
    "accessToken": "eyJhbGciOi…",
    "refreshToken": "eyJhbGciOi…"
  }
}
```

```bash
# 2. Login (same shape, 200)
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{ "email": "ada@example.com", "password": "s3cret-passphrase" }'

# 3. Call a protected route
curl http://localhost:3000/auth/me \
  -H 'Authorization: Bearer eyJhbGciOi…'
# 200 → { "data": { "id": "usr_1", "email": "ada@example.com" } }

# 4. Rotate the access token
curl -X POST http://localhost:3000/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{ "refreshToken": "eyJhbGciOi…" }'

# 5. Logout — revokes the refresh token (and the session)
curl -X POST http://localhost:3000/auth/logout \
  -H 'Content-Type: application/json' \
  -d '{ "refreshToken": "eyJhbGciOi…" }'
```

Access tokens are **revocable** — logout and user deletion cut live sessions. Calling a protected route without a valid token returns `401`:

```jsonc
{ "error": "Authentication required" }
```

JWT verification **fails closed**: if there is no secret to verify a token, the token is refused rather than trusted. In dev an ephemeral secret is generated with a loud warning; in production set `JWT_SECRET`.

### API keys

Set `auth.apikey.enabled = true`. Keys are **hashed at rest**; the plaintext is shown only once, at creation.

```bash
curl -X POST http://localhost:3000/admin/api-keys \
  -H 'Authorization: Bearer <admin-token>' \
  -d '{ "name": "ci-pipeline" }'
# 201 → { "data": { "id": "key_1", "key": "zk_live_9f…shown-once" } }

# Use it:
curl http://localhost:3000/products -H 'X-API-Key: zk_live_9f…'
```

`GET /admin/api-keys` lists metadata only; `DELETE /admin/api-keys/:id` revokes a key.

### OAuth

Add providers under `auth.oauth.providers` (requires the JWT system, since OAuth issues the same tokens). Supported: `google`, `github`, `apple`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/auth/oauth/:provider` | redirect to the provider's consent screen |
| `GET` | `/auth/oauth/:provider/callback` | exchange the code, link the account, issue tokens |

Set `OAUTH_CALLBACK_BASE_URL` and each provider's `clientIdEnv` / `clientSecretEnv`.

---

## Authorization (RBAC & permissions)

### Role hierarchy

Roles inherit transitively — a role automatically gains everything it `inherits`:

```ts
roles: [
  { name: 'admin',    inherits: ['manager'] },
  { name: 'manager',  inherits: ['staff'] },
  { name: 'staff',    inherits: ['customer'] },
  { name: 'customer' },
]
```

### Per-resource guards

```ts
{
  name: 'Product',
  fields: { /* … */ },
  rbac: {
    read:   ['customer'],   // customer and everything that inherits it
    write:  ['manager'],
    delete: ['admin'],
  },
}
```

A `customer` calling `DELETE /products/:id` gets `403`; an `admin` succeeds (admin inherits manager → staff → customer).

### Row-level ownership

`spec.permissions` expresses rules declaratively, including row-level ownership via `ownOnly` — a requester can only touch rows they own:

```ts
permissions: [
  {
    resource: 'Order',
    rules: [
      { role: 'customer', actions: ['create', 'read'], ownOnly: true },
      { role: 'admin',    actions: ['create', 'read', 'update', 'delete'] },
    ],
  },
]
```

### Multi-tenant scope

`scope` generalises `ownOnly` from a hard-coded `userId` to **any column matched against a JWT claim** — the declarative way to isolate tenants (organisations, workspaces…):

```ts
permissions: [
  {
    resource: 'Document',
    rules: [
      { role: 'member', actions: ['create', 'read', 'update', 'delete'],
        scope: { column: 'organizationId', claim: 'org' } },
    ],
  },
]
// ownOnly is just sugar for: scope: { column: 'userId', claim: 'sub' }
```

For that role the runtime then:

- **read / list** — returns only rows where `organizationId` equals the token's `org` claim;
- **create** — forces `organizationId` to the claim (a member of org A cannot write into org B, even if the body says so);
- **update / delete** — a row outside the caller's scope returns **404** (existence is never leaked);
- a token missing the `org` claim is rejected with **403**.

In Prisma mode the scope is pushed into the SQL `WHERE`, so other tenants' rows never leave the database.

---

## State machines (workflows)

Declare a `stateMachine` over an **enum** field to enforce a workflow — which `from → to` transitions are allowed and which roles may perform them.

```ts
{
  name: 'Post',
  fields: { status: { type: 'enum', values: ['draft', 'published', 'archived'], default: 'draft' } },
  stateMachine: {
    field: 'status',
    initial: 'draft',
    transitions: [
      { from: 'draft',     to: 'published', roles: ['editor', 'admin'] },
      { from: 'published', to: 'archived',  roles: ['admin'] },
    ],
  },
}
```

- **create** forces the field to `initial` — a client cannot create a row directly in a later state.
- **update** that changes the field validates the transition: an unlisted transition returns `409`, a listed transition the caller's role may not perform returns `403`.

```bash
curl -X PUT http://localhost:3000/posts/clt9 -d '{ "status": "archived" }'
# 409 → { "error": "Illegal transition draft → archived" }
```

---

## Aggregates

Declare read-only aggregates over a `oneToMany` relation. They are **opt-in** — computed only when their name appears in `?include=`, so plain reads stay lean.

```ts
{
  name: 'User',
  relations: [{ type: 'oneToMany', resource: 'Order' }],
  aggregates: [
    { name: 'orderCount', op: 'count', relation: 'orders' },
    { name: 'totalSpent', op: 'sum',   relation: 'orders', field: 'total' },
    { name: 'avgOrder',   op: 'avg',   relation: 'orders', field: 'total' },
  ],
}
```

```bash
curl 'http://localhost:3000/users/usr_1?include=orderCount,totalSpent'
```

```jsonc
// 200 OK
{ "data": { "id": "usr_1", "name": "Ada", "orderCount": 3, "totalSpent": 60 } }
```

Operators: `count` / `sum` / `avg` / `min` / `max`. Aggregates are **batched** — for a list of N rows each relation is resolved with a single `groupBy`, so the query count never grows with N. Rows with no children return `0` for `count`/`sum` and `null` for `avg`/`min`/`max`.

---

## Transactions

Declare atomic, spec-level side effects that fire on a given HTTP verb. If any operation fails, the whole request rolls back and returns `409 Conflict`. The canonical example: creating a `Purchase` decrements the product's stock.

```ts
{
  name: 'Purchase',
  fields: {
    productId: { type: 'uuid',    required: true },
    quantity:  { type: 'integer', required: true, min: 1 },
  },
  transactions: [
    {
      trigger: 'POST',
      operations: [
        { action: 'decrement', resource: 'product', idFrom: 'productId', field: 'stock', amountFrom: 'quantity' },
      ],
    },
  ],
}
```

```bash
# Product has stock = 1
curl -X POST http://localhost:3000/purchases -d '{ "productId": "p1", "quantity": 1 }'
# 201 → purchase created, product.stock is now 0

curl -X POST http://localhost:3000/purchases -d '{ "productId": "p1", "quantity": 1 }'
# 409 → { "error": "Operation failed: stock would go negative" }  (nothing was written)
```

Supported actions: `create`, `update`, `delete`, `increment`, `decrement`. Amounts are static (`amount`) or read from the body (`amountFrom`). In Prisma mode the operations run inside a real `$transaction` (ACID); in memory mode they are serialized to prevent interleaving.

---

## File upload & storage

Enable uploads via `features.fileUpload` and declare `file` / `file[]` fields. Clients send `multipart/form-data`; the runtime validates MIME type and size, stores the file, and persists a URL.

```ts
features: { fileUpload: { enabled: true, provider: 'local', maxSizeMB: 5, allowedTypes: ['image/jpeg', 'image/png'] } }

// on the resource:
fields: { image: { type: 'file', accept: ['image/jpeg', 'image/png'], maxSize: '5MB', storage: 'local' } }
```

```bash
curl -X POST http://localhost:3000/products \
  -F 'name=Wireless mouse' \
  -F 'price=29.9' \
  -F 'image=@./mouse.png'
# 201 → { "data": { "id": "...", "name": "Wireless mouse", "image": "/uploads/abc123.png" } }
```

A file that violates the rules returns `422`:

```jsonc
{ "error": "File validation failed", "details": [ "image: type application/pdf not allowed" ] }
```

**Providers:** `local` writes to `uploadDir` (default `./uploads`) and serves files at `GET /uploads/:key` — it warns loudly in production because files are lost on ephemeral containers. `s3` / `r2` require `@aws-sdk/client-s3` and read `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (+ optional `S3_ENDPOINT`, `S3_REGION`, `S3_PUBLIC_URL`).

---

## Webhooks

Enable via `features.webhooks`:

```ts
features: {
  webhooks: {
    outbound: ['order.created', 'order.updated'],  // events the API emits
    inbound:  ['stripe.payment'],                  // signed events the API receives
  },
}
```

### Outbound

Register an endpoint (its secret is shown only at creation):

```bash
curl -X POST http://localhost:3000/admin/webhooks \
  -H 'Authorization: Bearer <admin-token>' \
  -d '{ "url": "https://hooks.example.com/zeroapi", "events": ["order.created"] }'
# 201 → { "data": { "id": "wh_1", "secret": "whsec_…shown-once" } }
```

When an `order.created` event fires, the runtime POSTs to that URL with signature headers:

```http
POST /zeroapi HTTP/1.1
X-Webhook-Event: order.created
X-Webhook-Id: evt_abc
X-Webhook-Signature: sha256=<HMAC of the JSON body>
Content-Type: application/json

{ "event": "order.created", "data": { "id": "ord_1", "totalCents": 4990 } }
```

Failed deliveries retry with exponential backoff (30s → 30min cap, 5 attempts by default). In Prisma mode endpoints and the delivery queue **persist to the database** — they survive a restart, the worker resumes pending deliveries, and running multiple replicas **never double-delivers** an event (the claim is locked atomically). Set `WEBHOOK_SECRET_ENCRYPTION_KEY` to store signing secrets **AES-256-GCM-encrypted at rest**.

`GET /admin/webhooks/:id/deliveries` shows the delivery log. Stop the worker cleanly with `await runtime.shutdown()`.

### Inbound

Mounts `POST /webhooks/inbound/:source` per declared source and verifies the HMAC signature against `${SOURCE}_WEBHOOK_SECRET` (mismatch → `401`).

---

## Lifecycle hooks & custom endpoints

### Hooks

Attach business logic to a resource's lifecycle. Hook IDs reference functions in the `handlers` map passed to `createRuntime`.

```ts
// spec
hooks: { beforeCreate: 'purchaseBeforeCreate', afterCreate: 'purchaseAfterCreate' }

// runtime
createRuntime(spec, {
  handlers: {
    purchaseBeforeCreate: ({ input }) => {
      if ((input.quantity as number) <= 0) throw new Error('quantity must be > 0')  // throwing cancels the op
      input.processedAt = new Date().toISOString()  // mutate input IN PLACE to change what is persisted
    },
    purchaseAfterCreate: ({ input }) => { /* fire-and-forget side effect (audit, analytics) */ },
  },
})
```

- `beforeCreate` / `beforeUpdate` / `beforeDelete` — may **throw** to cancel; mutate `input` **in place** to alter what is stored (reassigning the parameter has no effect).
- `afterCreate` / `afterUpdate` / `afterDelete` — fire-and-forget; failures are swallowed.

### Custom endpoints

Add fully custom routes onto a resource's router:

```ts
// spec
customEndpoints: [{ method: 'GET', path: '/bestsellers', handler: 'productBestsellers' }]

// runtime — the handler receives the store + the Hono context
handlers: {
  productBestsellers: ({ store, ctx }) => {
    const products = Array.from(store.get('product')?.values() ?? [])
      .sort((a, b) => (b.price as number) - (a.price as number))
      .slice(0, 3)
    return ctx.json({ data: products, count: products.length })
  },
}
```

This mounts `GET /products/bestsellers`. Custom endpoints can require auth/roles via `auth: true` / `roles: [...]`.

---

## Security

Security middleware is on by default and configured from the spec:

```ts
{
  cors: {
    origins: ['https://app.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  security: { hsts: true, noSniff: true, frameguard: 'DENY', contentSecurityPolicy: true, referrerPolicy: 'no-referrer' },
  rateLimit: { windowMs: 15 * 60 * 1000, max: 100, byUser: true },
}
```

| Layer | Default | Toggle |
|---|---|---|
| Helmet security headers | on | `createRuntime(spec, { enableHelmet: false })` |
| CORS | on | `{ enableCors: false }` |
| Rate limiting | on when `spec.rateLimit` is set | `{ rateLimitStore }` for Redis |
| JSON injection sanitisation | on | `{ enableSanitize: false }` |

`/auth/login` and `/auth/register` are additionally rate-limited per IP. For multi-instance deployments pass a shared store:

```ts
import { RedisRateLimitStore } from '@ludagg/zeroapi-runtime'
createRuntime(spec, { rateLimitStore: new RedisRateLimitStore(redisClient) })
```

---

## Observability

Always-on, zero-config:

```bash
curl http://localhost:3000/health
```

```jsonc
// 200 OK
{
  "status": "ok",
  "name": "blog-api",
  "version": "1.0.0",
  "uptime": 42,
  "configCheck": { "allRequiredPresent": true, "missing": [] }
}
```

- **`GET /ready`** is a real readiness probe: in Prisma mode it runs a light `SELECT 1` and returns **`503`** when the database is unreachable, so an orchestrator stops routing to a broken instance (memory mode → `200`).
- **Request ID** — every request gets a correlation ID (response header + log context).
- **Graceful shutdown** — `await runtime.shutdown()` stops the webhook worker (in-flight deliveries finish) and disconnects Prisma. Pass `handleSignals: true` to bind `SIGTERM`/`SIGINT` automatically.

---

## Environment variables

Declare the env vars your API needs and ZeroAPI manages them:

```ts
env: [
  { name: 'JWT_SECRET',   required: true, generate: true },          // auto-generated if missing
  { name: 'DATABASE_URL', required: true, example: 'postgres://…' },
  { name: 'S3_BUCKET',    required: false, description: 'Upload bucket' },
]
```

- `getRequiredEnvVars(spec)` — aggregate every required var (declared + implied by features).
- `generateEnvExample(spec)` — produce a ready-to-commit `.env.example`.
- At boot, validation runs automatically: it generates values for `generate: true` vars, warns in dev, and **fails fast in production** on missing required vars.

---

## Persistence: in-memory vs Prisma

By default the runtime uses an **in-memory `Map` store** — perfect for prototyping, tests and CI, but all data is lost on restart.

For production, the runtime auto-detects a Prisma client (when `DATABASE_URL` is set and `@prisma/client` is installed) and uses Prisma-backed stores for resources, API keys, users, refresh tokens and OAuth accounts. In `NODE_ENV=production` it **refuses to silently fall back to memory** for auth — provide Prisma or explicit stores.

```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

createRuntime(spec, { prisma, prismaJwt: prisma })
```

### Applying the schema (opt-in, never destructive)

`createRuntime` **never touches the database on its own**. Helpers make applying the generated schema safe:

```ts
import { writePrismaSchema, pushPrismaSchema, deployPrismaMigrations } from '@ludagg/zeroapi-runtime'

writePrismaSchema(spec, 'prisma/schema.prisma')        // pure I/O
await pushPrismaSchema({ spec })                        // DEV — sync DB to schema (refused in prod)
await deployPrismaMigrations({ schemaPath: 'prisma/schema.prisma' })  // PROD — apply committed migrations
```

Use `pushPrismaSchema` for dev/prototyping; for production, commit migrations and ship them with `deployPrismaMigrations` (`prisma migrate deploy`).

---

## Tutorial: a production e-commerce API

This second tutorial assembles most features into one realistic spec: roles, relations, a many-to-many, file upload, a stock-decrement transaction, lifecycle hooks, a custom endpoint, and auth flows.

```ts
import { parseSpec, createRuntime, type HandlerFn } from '@ludagg/zeroapi-runtime'
import { serve } from '@hono/node-server'

const spec = parseSpec({
  version: '1.0.0',
  name: 'shop-api',
  auth: { strategy: 'jwt', secret: process.env.JWT_SECRET ?? 'dev-secret' },
  roles: [
    { name: 'admin',    inherits: ['manager'] },
    { name: 'manager',  inherits: ['staff'] },
    { name: 'staff',    inherits: ['customer'] },
    { name: 'customer' },
  ],
  rateLimit: { windowMs: 60_000, max: 60, byUser: true },
  authFlows: { passwordReset: true, refreshTokens: true, revocation: true, lockout: { maxAttempts: 5, windowMs: 900_000 } },
  resources: [
    { name: 'Category', fields: { name: { type: 'string', required: true, unique: true } }, rbac: { write: ['manager'], delete: ['admin'] } },
    { name: 'Tag',      fields: { label: { type: 'string', required: true, unique: true } }, rbac: { write: ['manager'], delete: ['admin'] } },
    {
      name: 'Product',
      fields: {
        name:  { type: 'string',  required: true, maxLength: 200 },
        price: { type: 'number',  required: true, min: 0 },
        stock: { type: 'integer', required: true, min: 0 },
        image: { type: 'file',    accept: ['image/jpeg', 'image/png'], maxSize: '5MB', storage: 'local' },
      },
      relations: [
        { type: 'manyToOne',  resource: 'Category', field: 'categoryId', onDelete: 'SetNull' },
        { type: 'manyToMany', resource: 'Tag', through: 'product_tags' },
      ],
      rbac: { read: ['customer'], write: ['manager'], delete: ['admin'] },
      customEndpoints: [{ method: 'GET', path: '/bestsellers', handler: 'productBestsellers' }],
    },
    {
      name: 'Purchase',
      fields: { productId: { type: 'uuid', required: true }, quantity: { type: 'integer', required: true, min: 1 } },
      hooks: { beforeCreate: 'purchaseBeforeCreate' },
      transactions: [{ trigger: 'POST', operations: [
        { action: 'decrement', resource: 'product', idFrom: 'productId', field: 'stock', amountFrom: 'quantity' },
      ] }],
      rbac: { read: ['staff'], write: ['customer'], delete: ['manager'] },
    },
  ],
})

const handlers: Record<string, HandlerFn> = {
  purchaseBeforeCreate: ({ input }) => {
    if ((input.quantity as number) <= 0) throw new Error('quantity must be > 0')
  },
  productBestsellers: ({ store, ctx }) =>
    ctx.json({ data: Array.from(store.get('product')?.values() ?? []).slice(0, 3) }),
}

const { app, ready } = createRuntime(spec, { handlers, uploadDir: './uploads' })
await ready                  // wait for async boot (e.g. bootstrap keys) before serving
serve({ fetch: app.fetch, port: 3000 })
```

A `customer` can register, browse products, and buy (which atomically decrements stock); a `manager` can manage the catalogue; only an `admin` can delete. Everything — validation, RBAC, the transaction, the docs — comes from that one object. To go to production, wire Prisma (`{ prisma }`) and apply the generated schema as shown above.

---

## `createRuntime` options reference

```ts
createRuntime(spec, {
  // Middleware toggles
  enableLogging: true, enableCors: true, enableHelmet: true, enableSanitize: true, enableDocs: true,
  // Hooks & custom endpoints
  handlers: { /* handlerId → fn */ },
  // Storage / uploads
  uploadDir: './uploads', storageProvider,
  // Observability & lifecycle
  logLevel: 'info', handleSignals: false,
  // Querying
  maxIncludeDepth: 4,
  // Rate limiting
  rateLimitStore, authRateLimit: { windowMs: 900_000, max: 20 },
  // Env validation
  validateEnv: false,
  // Persistence (Prisma)
  prisma, prismaJwt,
  apiKeyStore, userStore, refreshTokenStore, revocationStore, oauthAccountStore, oauthStateStore,
  // Webhooks
  webhookStore, webhookWorkerOptions, webhookInboundSources, webhookSecretEncryptionKey,
})
```

| Returned field | Type | Description |
|---|---|---|
| `app` | `Hono` | the wired application |
| `prismaSchema` | `string` | generated Prisma schema |
| `zodSchemas` | `Record<string, ResourceSchemas>` | per-resource validators |
| `openApiSpec` | `OpenAPISpec` | OpenAPI 3.0.3 document |
| `testSuite` | `string` | generated Vitest suite |
| `spec` | `ZeroAPISpec` | the parsed spec |
| `ready` | `Promise<void>` | resolves once async boot completes |
| `shutdown` | `() => Promise<void>` | graceful shutdown (idempotent) |

> When using a Prisma store, `await result.ready` before serving traffic so the bootstrap key is persisted first.

---

## Built-in endpoints

Beyond per-resource CRUD, the runtime mounts:

| Path | Enabled by | Purpose |
|---|---|---|
| `GET /health` | always | liveness + uptime + config check |
| `GET /ready` | always | readiness probe (real DB probe in Prisma mode) |
| `GET /docs` | `enableDocs` | Scalar API reference UI |
| `GET /openapi.json` | `enableDocs` | OpenAPI 3.0.3 document |
| `GET /uploads/:key` | local file upload | serve uploaded files |
| `/auth/*` | JWT / auth flows | register, login, refresh, logout, me, … |
| `/auth/oauth/*` | OAuth | provider redirect + callback |
| `/admin/api-keys*` | API-key auth | key management |
| `/admin/webhooks*` | outbound webhooks | endpoint management |
| `/webhooks/inbound/:source` | inbound webhooks | receive signed events |

---

## Deploying your API

`createRuntime` returns the generated `prismaSchema`, `openApiSpec` and `testSuite` so you can commit them. The runtime also ships deploy-config generators:

```ts
import { generateRailwayConfig, generateRenderConfig, generateVercelConfig, generateFlyConfig } from '@ludagg/zeroapi-runtime'

generateRailwayConfig(spec)  // → railway.toml
generateRenderConfig(spec)   // → render.yaml
generateVercelConfig(spec)   // → vercel.json
generateFlyConfig(spec)      // → fly.toml
```

Because the app is a portable Hono app, deployment is just "run a Node/Bun/Deno process" or "deploy a Cloudflare Worker". For production: set `DATABASE_URL`, install `@prisma/client`, apply the schema with `deployPrismaMigrations`, set `JWT_SECRET` (and `WEBHOOK_SECRET_ENCRYPTION_KEY` if you use webhooks), and front it with the `/ready` probe as your health check.

> Building on the **ZeroAPI platform**? You describe the API in natural language, the platform generates the spec, runs this runtime, and can deploy it for you — no manual wiring.

---

## Known limitations

These are current design boundaries, not bugs.

1. **Many-to-many filtering is membership-only.** You can filter by a related id (`?tag=<tagId>`), but operator filters (`?tag[contains]=…`) on join-table data aren't resolved. *Workaround:* `?include=Tag` and filter client-side.
2. **Cursor pagination with non-unique sort keys** can reorder equals at a page boundary. *Fix:* add `id` as a secondary sort.
3. **Nested creation: depth 1, manyToMany only.** Recursive creation of new related resources isn't supported.
4. **In-memory store by default.** Data is lost on restart unless you wire Prisma.
5. **Local upload writes to disk** — use S3/R2 on ephemeral containers.
6. **Hook mutations must be in place** — reassigning the `input` parameter has no effect.
7. **After-hooks are fire-and-forget** — pair with a job queue if you need guaranteed delivery.
8. **Default rate limiter is single-instance** — use `RedisRateLimitStore` for multiple replicas.

---

## FAQ

**Do I have to use Prisma/Postgres?** No — the runtime works fully in memory for prototyping and tests. Wire Prisma when you need durability.

**Which runtimes are supported?** Any that accept a `fetch` handler: Node.js (`@hono/node-server`), Bun, Deno, and Cloudflare Workers — the same `app` runs on all of them.

**Can I add logic the spec can't express?** Yes — `hooks` for lifecycle logic, `customEndpoints` for arbitrary routes. Conditional rules and side effects live there, not in the spec.

**Is it tested?** 1075 tests across 70 files, with every database-mode feature verified against a **real PostgreSQL** database (not a mock).

**What licence?** MIT.
