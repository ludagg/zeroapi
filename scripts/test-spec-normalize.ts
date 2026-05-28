/**
 * Smoke test for the LLM → parseSpec() normalization pipeline.
 *
 * Exécution :
 *   pnpm tsx scripts/test-spec-normalize.ts
 *
 * Vérifie que safeParseSpec accepte :
 *   1. La spec minimale du fondateur (auth.strategy = "apiKey" → "apikey")
 *   2. Des dérives LLM courantes (fields en array, type "int", "varchar", etc.)
 *   3. auth.strategy = "none" (doit être ignoré, pas crasher)
 *   4. Une spec valide sans aucune dérive (no-op)
 *   5. Les 3 cas v0.14 demandés : todo simple, e-commerce OAuth, blog relations
 * Et que les erreurs sortent un message français lisible.
 */

import { safeParseSpec } from "../lib/spec.js";
import {
  detectAuthFeatures,
  detectFeatures,
  summarizeRelations,
} from "../lib/conversation-helpers.js";

type Case = { label: string; input: string; expect: "ok" | "fail" };

const CASES: Case[] = [
  {
    label: "spec minimale du fondateur (auth.strategy = 'apiKey')",
    input: JSON.stringify({
      version: "1.0",
      name: "blog",
      auth: { strategy: "apiKey" },
      resources: [
        {
          name: "articles",
          fields: {
            titre: { type: "string", required: true },
            contenu: { type: "string", required: true },
            statut: { type: "string", required: false },
          },
        },
      ],
    }),
    expect: "ok",
  },
  {
    label: "dérives LLM (int/varchar/bool, auth.strategy='API_KEY')",
    input: JSON.stringify({
      version: "1.0",
      name: "shop",
      auth: { strategy: "API_KEY" },
      resources: [
        {
          name: "Product",
          fields: {
            label: { type: "varchar", required: true, length: 200 },
            price: { type: "int", required: true, min: 0 },
            inStock: { type: "bool" },
          },
        },
      ],
    }),
    expect: "ok",
  },
  {
    label: "auth.strategy = 'none' → doit être supprimé (pas d'erreur)",
    input: JSON.stringify({
      version: "1.0",
      name: "public-api",
      auth: { strategy: "none" },
      resources: [{ name: "Items", fields: { name: { type: "string", required: true } } }],
    }),
    expect: "ok",
  },
  {
    label: "JSON wrappé dans des fences markdown",
    input:
      "```json\n" +
      JSON.stringify({
        version: "1.0",
        name: "fenced",
        resources: [{ name: "X", fields: { id: { type: "uuid" } } }],
      }) +
      "\n```",
    expect: "ok",
  },
  {
    label: "version manquante → défaut '1.0'",
    input: JSON.stringify({
      name: "noversion",
      resources: [{ name: "X", fields: { id: { type: "uuid" } } }],
    }),
    expect: "ok",
  },
  {
    label: "fields vide → doit échouer avec message français",
    input: JSON.stringify({
      version: "1.0",
      name: "broken",
      resources: [{ name: "Empty", fields: {} }],
    }),
    expect: "fail",
  },
  {
    label: "type inconnu (foo) → doit échouer avec message français",
    input: JSON.stringify({
      version: "1.0",
      name: "broken",
      resources: [{ name: "Bad", fields: { x: { type: "foo" } } }],
    }),
    expect: "fail",
  },
  {
    label: "JSON syntaxiquement invalide → message clair",
    input: "{not json",
    expect: "fail",
  },
  // ============================================================================
  // v0.14 — 3 cas représentatifs du clarifier mis à jour
  // ============================================================================
  {
    label: "v0.14 · API todo simple → Spec minimale CRUD (pas d'auth)",
    input: JSON.stringify({
      version: "1.0",
      name: "todo-api",
      description: "Liste de tâches simple",
      resources: [
        {
          name: "Todo",
          fields: {
            title: { type: "string", required: true, minLength: 1, maxLength: 200 },
            done: { type: "boolean", default: false },
            dueAt: { type: "datetime" },
          },
        },
      ],
    }),
    expect: "ok",
  },
  {
    label: "v0.14 · API e-commerce avec auth Google → OAuth + relations + upload",
    input: JSON.stringify({
      version: "1.0",
      name: "shop-api",
      description: "API e-commerce avec connexion Google",
      auth: {
        enabled: true,
        strategies: ["jwt", "oauth"],
        jwt: { enabled: true, secretEnv: "JWT_SECRET" },
        oauth: {
          providers: [
            {
              name: "google",
              clientIdEnv: "GOOGLE_CLIENT_ID",
              clientSecretEnv: "GOOGLE_CLIENT_SECRET",
              scopes: ["openid", "email", "profile"],
            },
          ],
        },
        emailVerification: true,
        passwordReset: true,
      },
      roles: [{ name: "admin" }, { name: "user" }],
      resources: [
        {
          name: "Product",
          fields: {
            title: { type: "string", required: true, minLength: 1 },
            description: { type: "text" },
            priceCfa: { type: "integer", required: true, min: 0 },
            image: { type: "file", accept: ["image/*"], maxSize: "5MB", storage: "r2" },
            status: { type: "enum", values: ["draft", "published", "archived"] },
          },
          searchable: ["title", "description"],
        },
        {
          name: "Order",
          fields: {
            userId: { type: "uuid", required: true },
            totalCfa: { type: "integer", required: true, min: 0 },
            status: { type: "enum", values: ["pending", "paid", "shipped"] },
          },
          relations: [
            { type: "manyToOne", resource: "Product", field: "productId", onDelete: "Restrict" },
          ],
        },
      ],
      permissions: [
        {
          resource: "Order",
          rules: [
            { role: "user", actions: ["create", "read", "update"], ownOnly: true },
            { role: "admin", actions: ["create", "read", "update", "delete"] },
          ],
        },
      ],
      features: {
        fileUpload: {
          enabled: true,
          provider: "r2",
          maxSizeMB: 5,
          allowedTypes: ["image/jpeg", "image/png", "image/webp"],
        },
        search: { enabled: true, fuzzy: true },
        pagination: { defaultLimit: 20, maxLimit: 100 },
      },
      env: [
        { name: "JWT_SECRET", required: true, generate: true, managedByCloud: true },
        { name: "GOOGLE_CLIENT_ID", required: true },
        { name: "GOOGLE_CLIENT_SECRET", required: true },
      ],
    }),
    expect: "ok",
  },
  {
    label: "v0.14 · API blog → relations Article/Comment (oneToMany)",
    input: JSON.stringify({
      version: "1.0",
      name: "blog-api",
      description: "Blog avec articles et commentaires imbriqués",
      auth: {
        enabled: true,
        strategies: ["jwt"],
        jwt: { enabled: true, secretEnv: "JWT_SECRET" },
      },
      roles: [{ name: "admin" }, { name: "user" }],
      resources: [
        {
          name: "Article",
          fields: {
            title: { type: "string", required: true, minLength: 1, maxLength: 200 },
            body: { type: "text", required: true },
            authorId: { type: "uuid", required: true },
            published: { type: "boolean", default: false },
          },
          searchable: ["title", "body"],
          relations: [
            { type: "oneToMany", resource: "Comment" },
          ],
        },
        {
          name: "Comment",
          fields: {
            body: { type: "text", required: true, minLength: 1, maxLength: 2000 },
            articleId: { type: "uuid", required: true },
            authorId: { type: "uuid", required: true },
          },
          relations: [
            { type: "manyToOne", resource: "Article", field: "articleId", onDelete: "Cascade" },
          ],
        },
      ],
      permissions: [
        {
          resource: "Article",
          rules: [
            { role: "user", actions: ["create", "read", "update"], ownOnly: true },
            { role: "admin", actions: ["create", "read", "update", "delete"] },
          ],
        },
      ],
      features: {
        search: { enabled: true, fuzzy: true },
        pagination: { defaultLimit: 20, maxLimit: 100 },
      },
    }),
    expect: "ok",
  },
  // ============================================================================
  // v0.14 — erreurs sémantiques attendues
  // ============================================================================
  {
    label: "v0.14 · ownOnly sans auth.jwt.enabled → erreur sémantique FR",
    input: JSON.stringify({
      version: "1.0",
      name: "broken-ownonly",
      auth: { strategy: "apikey" },
      resources: [{ name: "X", fields: { id: { type: "uuid" } } }],
      permissions: [
        {
          resource: "X",
          rules: [{ role: "user", actions: ["read"], ownOnly: true }],
        },
      ],
    }),
    expect: "fail",
  },
  {
    label: "v0.14 · oauth sans jwt.enabled → erreur sémantique FR",
    input: JSON.stringify({
      version: "1.0",
      name: "broken-oauth",
      auth: {
        enabled: true,
        strategies: ["oauth"],
        oauth: {
          providers: [
            {
              name: "google",
              clientIdEnv: "GOOGLE_CLIENT_ID",
              clientSecretEnv: "GOOGLE_CLIENT_SECRET",
            },
          ],
        },
      },
      resources: [{ name: "X", fields: { id: { type: "uuid" } } }],
    }),
    expect: "fail",
  },
  {
    label: "v0.14 · manyToMany sans through → erreur sémantique FR",
    input: JSON.stringify({
      version: "1.0",
      name: "broken-m2m",
      resources: [
        { name: "A", fields: { id: { type: "uuid" } }, relations: [{ type: "manyToMany", resource: "B" }] },
        { name: "B", fields: { id: { type: "uuid" } } },
      ],
    }),
    expect: "fail",
  },
  {
    label: "v0.14 · relation vers ressource inexistante → erreur sémantique FR",
    input: JSON.stringify({
      version: "1.0",
      name: "broken-rel",
      resources: [
        { name: "A", fields: { id: { type: "uuid" } }, relations: [{ type: "manyToOne", resource: "Missing", field: "x" }] },
      ],
    }),
    expect: "fail",
  },
];

let failed = 0;
for (const c of CASES) {
  try {
    const spec = safeParseSpec(c.input);
    if (c.expect === "ok") {
      const authFeatures = detectAuthFeatures(spec);
      const features = detectFeatures(spec);
      const relations = summarizeRelations(spec);
      const authPart =
        authFeatures.length > 0 ? `, auth=[${authFeatures.join(",")}]` : ", no auth";
      const relPart = relations.length > 0 ? `, rels=${relations.length}` : "";
      const featPart = features.length > 0 ? `, features=[${features.join(",")}]` : "";
      console.log(
        `  ✓ ${c.label} → ${spec.name} (${spec.resources.length} resource(s)` +
          authPart +
          relPart +
          featPart +
          `)`,
      );
    } else {
      failed++;
      console.error(`  ✗ ${c.label} — attendu un échec, mais ça a passé`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (c.expect === "fail") {
      console.log(`  ✓ ${c.label} → ${msg}`);
    } else {
      failed++;
      console.error(`  ✗ ${c.label} — ${msg}`);
    }
  }
}

if (failed > 0) {
  console.error(`\n❌ ${failed} cas en échec`);
  process.exit(1);
}
console.log(`\n✅ ${CASES.length} cas OK`);
