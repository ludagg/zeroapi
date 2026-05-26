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
 * Et que les erreurs sortent un message français lisible.
 */

import { safeParseSpec } from "../lib/spec.js";

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
];

let failed = 0;
for (const c of CASES) {
  try {
    const spec = safeParseSpec(c.input);
    if (c.expect === "ok") {
      console.log(
        `  ✓ ${c.label} → ${spec.name} (${spec.resources.length} resource(s)` +
          (spec.auth ? `, auth=${spec.auth.strategy}` : ", no auth") +
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
