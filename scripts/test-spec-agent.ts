/**
 * Tests de l'AGENT KIA (lib/agent/spec-agent.ts + operation-tools.ts).
 *
 *   pnpm tsx scripts/test-spec-agent.ts
 *
 * Deux niveaux, sans réseau ni DB :
 *
 *   1. COUCHE OUTILS (déterministe) — on appelle `executeOperationTool`
 *      exactement comme le runtime Vercel AI SDK appellerait `tool.execute`,
 *      et on prouve :
 *        → "ajoute une ressource X" → addResource, SEULE X ajoutée (pas de dérive)
 *        → "ajoute un champ Y à X" → addField ciblé
 *        → "ajoute une relation X-Z" → addRelation
 *        → opération dangereuse → confirmation demandée, RIEN exécuté
 *        → demande invalide → spec d'origine préservée
 *        → immuabilité de la spec passée à l'agent
 *
 *   2. BOUCLE COMPLÈTE (MockLanguageModelV3) — on scripte les tool calls du
 *      modèle et on prouve que `runSpecAgent` (generateText + stopWhen) applique
 *      l'opération de bout en bout et remonte les confirmations.
 */

import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { MockLanguageModelV3 } from "ai/test";

import { runSpecAgent } from "../lib/agent/spec-agent.js";
import {
  buildOperationTools,
  createAgentContext,
  executeOperationTool,
  OPERATION_TOOL_COUNT,
  type ToolCallResult,
} from "../lib/agent/operation-tools.js";
import { runValidationGate } from "../lib/operations/index.js";

// ── Harness (async-aware) ───────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let assertions = 0;
const failures: string[] = [];

function assert(cond: unknown, label: string): asserts cond {
  assertions++;
  if (!cond) throw new Error(`assertion échouée: ${label}`);
}

async function test(label: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    failed++;
    failures.push(`✗ ${label}\n    ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── Deep equality + path diff (non-regression proofs) ───────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => k in b && deepEqual(a[k], b[k]));
  }
  return false;
}
function diffPaths(a: unknown, b: unknown, prefix = ""): string[] {
  if (deepEqual(a, b)) return [];
  if (Array.isArray(a) && Array.isArray(b)) {
    const out: string[] = [];
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) out.push(...diffPaths(a[i], b[i], `${prefix}[${i}]`));
    return out;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const out: string[] = [];
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
      out.push(...diffPaths(a[k], b[k], prefix ? `${prefix}.${k}` : k));
    return out;
  }
  return [prefix || "(root)"];
}
function assertChangedPaths(before: unknown, after: unknown, expected: string[], label: string): void {
  const actual = diffPaths(before, after).sort();
  const exp = [...expected].sort();
  assert(deepEqual(actual, exp), `${label} — chemins attendus ${JSON.stringify(exp)}, obtenus ${JSON.stringify(actual)}`);
}

function assertApplied(r: ToolCallResult, label: string): void {
  assert(r.ok === true, `${label} — devait être appliqué, obtenu ${JSON.stringify(r)}`);
}

// ── Fixture (spec valide, identique au style de test-operations.ts) ─────────

function baseSpec(): ZeroAPISpec {
  return structuredClone({
    version: "1.0",
    name: "shop",
    description: "Boutique en ligne",
    roles: [{ name: "admin" }, { name: "user" }],
    rateLimit: { windowMs: 60000, max: 120 },
    auth: {
      enabled: true,
      strategies: ["jwt", "apikey", "oauth"],
      jwt: { enabled: true, secretEnv: "JWT_SECRET" },
      apikey: { enabled: true, header: "X-API-Key", prefix: "sk_" },
      oauth: {
        providers: [
          { name: "google", clientIdEnv: "GOOGLE_CLIENT_ID", clientSecretEnv: "GOOGLE_CLIENT_SECRET" },
        ],
      },
      emailVerification: true,
    },
    resources: [
      {
        name: "Product",
        description: "Un produit",
        fields: {
          title: { type: "string", required: true, maxLength: 200 },
          price: { type: "integer", required: true, min: 0 },
          status: { type: "enum", values: ["draft", "published", "archived"] },
        },
        endpoints: ["list", "create", "read", "update", "delete"],
        rbac: { read: ["user", "admin"], write: ["admin"], delete: ["admin"] },
        searchable: ["title"],
      },
      {
        name: "Order",
        fields: {
          userId: { type: "uuid", required: true },
          total: { type: "integer", required: true },
          ref: { type: "string" },
        },
        relations: [{ type: "manyToOne", resource: "User", field: "userId", onDelete: "Cascade" }],
      },
    ],
    relations: [{ from: "Order", to: "Product", type: "many-to-one", field: "userId" }],
    permissions: [
      {
        resource: "Order",
        rules: [
          { role: "user", actions: ["create", "read", "update"], ownOnly: true },
          { role: "admin", actions: ["create", "read", "update", "delete"] },
        ],
      },
    ],
    env: [{ name: "JWT_SECRET", required: true, generate: true, managedByCloud: true }],
    features: { pagination: { defaultLimit: 20, maxLimit: 100 } },
    authFlows: { passwordReset: true, refreshTokens: true },
  }) as unknown as ZeroAPISpec;
}

// ── Mock model helpers (LanguageModelV3 generate results) ───────────────────

const USAGE = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
};
let callId = 0;
function toolCallStep(toolName: string, input: unknown) {
  return {
    content: [
      { type: "tool-call" as const, toolCallId: `call_${++callId}`, toolName, input: JSON.stringify(input) },
    ],
    finishReason: { unified: "tool-calls" as const, raw: "tool-calls" },
    usage: USAGE,
    warnings: [],
  };
}
function textStep(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    finishReason: { unified: "stop" as const, raw: "stop" },
    usage: USAGE,
    warnings: [],
  };
}
/**
 * A mock model that returns the scripted steps in order, one per `doGenerate`
 * call (the array overload is NOT sequential, so we drive it with a counter).
 */
function scriptedModel(steps: Array<ReturnType<typeof textStep> | ReturnType<typeof toolCallStep>>) {
  let i = 0;
  return new MockLanguageModelV3({
    doGenerate: async () => steps[Math.min(i++, steps.length - 1)],
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 1. COUCHE OUTILS (déterministe)
// ════════════════════════════════════════════════════════════════════════════

async function run(): Promise<void> {
  await test("catalogue — 55 outils d'opération exposés", () => {
    assert(OPERATION_TOOL_COUNT === 55, `attendu 55 outils, obtenu ${OPERATION_TOOL_COUNT}`);
    const tools = buildOperationTools(createAgentContext(baseSpec()));
    assert(Object.keys(tools).length === 55, "buildOperationTools doit produire 55 tools");
    assert("addResource" in tools && "removeResource" in tools, "tools nommés par type d'opération");
  });

  await test("fixture — baseSpec passe le gate", () => {
    assert(runValidationGate(baseSpec()) === null, "baseSpec doit être valide");
  });

  await test("addResource — ajoute SEULE la ressource X, rien d'autre", () => {
    const ctx = createAgentContext(baseSpec());
    const before = structuredClone(ctx.spec);
    const r = executeOperationTool(ctx, "addResource", {
      name: "Review",
      fields: { rating: { type: "integer", required: true, min: 1, max: 5 } },
    });
    assertApplied(r, "addResource");
    assert(ctx.spec.resources.some((x) => x.name === "Review"), "Review ajoutée");
    assert(ctx.appliedOperations.length === 1, "1 opération appliquée");
    assertChangedPaths(before, ctx.spec, ["resources[2]"], "addResource — pas de dérive");
  });

  await test("addField — ajoute un champ ciblé à X", () => {
    const ctx = createAgentContext(baseSpec());
    const before = structuredClone(ctx.spec);
    const r = executeOperationTool(ctx, "addField", {
      resource: "Product",
      field: "sku",
      fieldType: "string",
      options: { unique: true },
    });
    assertApplied(r, "addField");
    assert(ctx.spec.resources[0].fields.sku?.type === "string", "champ sku ajouté");
    assertChangedPaths(before, ctx.spec, ["resources[0].fields.sku"], "addField ciblé");
  });

  await test("addRelation — séquence addResource→addField→addRelation (build incrémental)", () => {
    const ctx = createAgentContext(baseSpec());
    assertApplied(
      executeOperationTool(ctx, "addResource", { name: "Category", fields: { name: { type: "string", required: true } } }),
      "prep Category",
    );
    assertApplied(
      executeOperationTool(ctx, "addField", { resource: "Product", field: "categoryId", fieldType: "uuid" }),
      "prep FK",
    );
    const r = executeOperationTool(ctx, "addRelation", {
      from: "Product",
      to: "Category",
      relationType: "many-to-one",
      field: "categoryId",
      onDelete: "cascade",
    });
    assertApplied(r, "addRelation");
    assert(
      (ctx.spec.relations ?? []).some((rel) => rel.from === "Product" && rel.to === "Category"),
      "relation Product→Category ajoutée",
    );
    assert(ctx.appliedOperations.length === 3, "3 opérations enchaînées");
  });

  await test("opération dangereuse — confirmation demandée, RIEN exécuté", () => {
    const ctx = createAgentContext(baseSpec());
    const before = structuredClone(ctx.spec);
    const r = executeOperationTool(ctx, "removeResource", { name: "Product" });
    assert(r.ok === false && "needsConfirmation" in r && r.needsConfirmation === true, "needsConfirmation renvoyé");
    assert(ctx.pendingConfirmations.length === 1, "impact enregistré pour l'utilisateur");
    assert(ctx.pendingConfirmations[0].impact.length >= 1, "impact détaillé");
    assert(ctx.appliedOperations.length === 0, "aucune opération appliquée");
    assert(deepEqual(ctx.spec, before), "spec inchangée (Product toujours là)");
  });

  await test("demande invalide — erreur outil, spec d'origine préservée", () => {
    const ctx = createAgentContext(baseSpec());
    const before = structuredClone(ctx.spec);
    const r = executeOperationTool(ctx, "addField", { resource: "Ghost", field: "x", fieldType: "string" });
    assert(r.ok === false && "error" in r, "erreur renvoyée au modèle");
    assert(ctx.appliedOperations.length === 0, "aucune opération appliquée");
    assert(deepEqual(ctx.spec, before), "spec préservée");
  });

  await test("immuabilité — la spec passée à l'agent n'est jamais mutée", () => {
    const original = baseSpec();
    const snapshot = structuredClone(original);
    const ctx = createAgentContext(original);
    executeOperationTool(ctx, "addResource", { name: "Z", fields: { a: { type: "string" } } });
    assert(deepEqual(original, snapshot), "spec d'origine intacte");
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. BOUCLE COMPLÈTE (MockLanguageModelV3)
  // ══════════════════════════════════════════════════════════════════════════

  await test("boucle (mock) — 'ajoute une table Avis notée 1 à 5' → addResource appliqué", async () => {
    const model = scriptedModel([
      toolCallStep("addResource", {
        name: "Review",
        fields: { rating: { type: "integer", required: true, min: 1, max: 5 } },
      }),
      textStep("J'ai ajouté la ressource Review avec un champ rating noté de 1 à 5."),
    ]);
    const res = await runSpecAgent({
      spec: baseSpec(),
      instruction: "ajoute une table Avis notée 1 à 5",
      plan: "FREE",
      model,
    });
    assert(res.status === "applied", `attendu applied, obtenu ${res.status} (${res.error ?? ""})`);
    assert(res.spec.resources.some((r) => r.name === "Review"), "Review dans la spec finale");
    assert(res.appliedOperations.length === 1 && res.appliedOperations[0].type === "addResource", "1 addResource loggué");
    assert(res.message.trim().length > 0, "résumé en langage naturel présent");
    assert(runValidationGate(res.spec) === null, "spec finale valide");
    // Le reste de la spec n'a pas dérivé : Product + Order toujours là.
    assert(res.spec.resources.some((r) => r.name === "Product") && res.spec.resources.some((r) => r.name === "Order"), "ressources existantes préservées");
  });

  await test("boucle (mock) — opération destructive → status needs_confirmation, spec intacte", async () => {
    const model = scriptedModel([
      toolCallStep("removeResource", { name: "Product" }),
      textStep("Supprimer Product casserait des relations existantes. Confirmes-tu ?"),
    ]);
    const res = await runSpecAgent({
      spec: baseSpec(),
      instruction: "supprime la ressource Product",
      plan: "FREE",
      model,
    });
    assert(res.status === "needs_confirmation", `attendu needs_confirmation, obtenu ${res.status}`);
    assert(res.pendingConfirmations.length >= 1, "confirmation remontée");
    assert(res.appliedOperations.length === 0, "aucune opération appliquée");
    assert(res.spec.resources.some((r) => r.name === "Product"), "Product toujours présent");
  });

  await test("boucle (mock) — tool call invalide puis correction → applied", async () => {
    const model = scriptedModel([
      toolCallStep("addField", { resource: "Ghost", field: "x", fieldType: "string" }), // rejeté
      toolCallStep("addField", { resource: "Product", field: "sku", fieldType: "string" }), // corrigé
      textStep("Le champ sku a été ajouté à Product."),
    ]);
    const res = await runSpecAgent({
      spec: baseSpec(),
      instruction: "ajoute un champ sku à Product",
      plan: "FREE",
      model,
    });
    assert(res.status === "applied", `attendu applied, obtenu ${res.status}`);
    assert(res.spec.resources[0].fields.sku?.type === "string", "sku ajouté après correction");
    assert(res.appliedOperations.length === 1, "seule l'opération valide est appliquée");
    assert(res.log.some((l) => l.outcome === "error"), "l'échec intermédiaire est loggué");
  });

  // ── Report ────────────────────────────────────────────────────────────────
  console.log(`\n  Agent Kia — ${OPERATION_TOOL_COUNT} outils d'opération\n`);
  for (const f of failures) console.log(f);
  console.log(`\n  ${passed} tests OK, ${failed} échec(s), ${assertions} assertions.\n`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
