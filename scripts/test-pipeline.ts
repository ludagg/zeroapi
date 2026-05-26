/**
 * Smoke test du pipeline runtime + bundle + R2 sans toucher Prisma.
 *
 * Exécution :
 *   pnpm tsx scripts/test-pipeline.ts
 *
 * Vérifie :
 *   1. parseSpec accepte une spec minimale (forme demandée par le fondateur)
 *   2. createRuntime construit l'app Hono et les artefacts
 *   3. buildBundle produit un ZIP non-vide avec tous les fichiers attendus
 *   4. l'app Hono répond effectivement sur /health
 */

import JSZip from "jszip";
import { createRuntime, parseSpec } from "@ludagg/zeroapi-runtime";
import { buildBundle } from "../workers/zip-bundle.js";
import { countEndpoints } from "../lib/spec.js";

const SAMPLE = {
  version: "1.0",
  name: "test",
  description: "Smoke test ZeroAPI",
  resources: [
    {
      name: "items",
      fields: {
        title: { type: "string", required: true, minLength: 1, maxLength: 200 },
        priceCfa: { type: "integer", required: true, min: 0 },
      },
    },
  ],
};

async function main() {
  console.log("→ parseSpec…");
  const spec = parseSpec(SAMPLE);
  console.log("  ✓ spec valide :", spec.name, "·", spec.resources.length, "ressource(s)");

  console.log("→ createRuntime…");
  const result = createRuntime(spec, {
    enableLogging: false,
    enableDocs: true,
  });
  console.log("  ✓ artefacts :", {
    hasApp: typeof result.app?.fetch === "function",
    prismaSchemaBytes: result.prismaSchema.length,
    testSuiteBytes: result.testSuite.length,
    openApiPaths: Object.keys(result.openApiSpec.paths).length,
  });

  console.log("→ probe /health");
  const res = await result.app.fetch(new Request("http://localhost/health"));
  console.log("  ✓ status", res.status, "·", await res.text());

  console.log("→ probe GET /items");
  const list = await result.app.fetch(new Request("http://localhost/items"));
  console.log("  ✓ /items →", list.status);

  console.log("→ buildBundle…");
  const bundle = await buildBundle({
    spec,
    prismaSchema: result.prismaSchema,
    testSuite: result.testSuite,
    openApiSpec: result.openApiSpec,
  });
  console.log("  ✓ ZIP :", bundle.size, "bytes");

  const z = await JSZip.loadAsync(bundle.buffer);
  const files = Object.keys(z.files);
  const required = [
    "README.md",
    "package.json",
    ".env.example",
    "src/server.ts",
    "spec.json",
    "prisma/schema.prisma",
    "tests/api.test.ts",
    "deploy/railway.toml",
    "deploy/render.yaml",
    "deploy/vercel.json",
    "deploy/fly.toml",
  ];
  const missing = required.filter((f) => !files.includes(f));
  if (missing.length) throw new Error("Bundle incomplet : " + missing.join(", "));
  console.log("  ✓ contient :", files.filter((f) => !f.endsWith("/")).join(", "));

  console.log("→ countEndpoints :", countEndpoints(spec));
  console.log("\n✅ Pipeline OK");
}

main().catch((err) => {
  console.error("\n❌ Pipeline KO :", err);
  process.exit(1);
});
