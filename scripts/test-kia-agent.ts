/**
 * Tests de l'AGENT KIA (lib/agent/).
 *
 *   pnpm tsx scripts/test-kia-agent.ts
 *
 * Deux niveaux, 100% hors-ligne (aucun réseau / DB / clé) :
 *
 *  A. TOOLSET généré depuis le registry — on appelle directement les tools et on
 *     prouve, sur une spec réelle :
 *       → "ajoute une ressource X" → addResource : SEULE X ajoutée, reste intact ;
 *       → "ajoute un champ à X"     → addField ciblé ;
 *       → "multi-tenant"            → setPermissionScope ;
 *       → "workflow draft→published"→ setStateMachine ;
 *       → opération dangereuse      → requiresConfirmation, spec inchangée,
 *                                     puis appliquée APRÈS approbation ;
 *       → demande invalide          → rejetée, spec d'origine préservée.
 *
 *  B. BOUCLE d'agent (generateText + stopWhen + tools) pilotée par un
 *     MockLanguageModelV3 qui émet de vrais appels d'opérations :
 *       → le LLM émet addResource → la spec finale contient X ;
 *       → opération destructive → confirmation remontée, rien appliqué ;
 *       → appel MALFORMÉ (zod rejette) → erreur renvoyée + RETRY → op valide
 *         appliquée (anti-blocage).
 */

import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { MockLanguageModelV3 } from "ai/test";
import type { LanguageModel } from "ai";
import {
  createOperationToolset,
  type OperationToolset,
} from "../lib/agent/tools";
import { runKiaAgent } from "../lib/agent/kia-agent";
import { OPERATION_COUNT, OPERATION_DANGER } from "../lib/operations/registry";
import type { ConfirmationImpact, OperationType } from "../lib/operations/types";
import {
  describeOperation,
  summarizeAppliedOperations,
} from "../lib/agent/operation-descriptions";

// ── Harness ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let assertions = 0;
const failures: string[] = [];

function assert(cond: unknown, label: string): asserts cond {
  assertions++;
  if (!cond) throw new Error(`assertion échouée: ${label}`);
}

const registered: Array<[string, () => void | Promise<void>]> = [];
function test(label: string, fn: () => void | Promise<void>): void {
  registered.push([label, fn]);
}

// ── Deep equality + path diff (non-régression) ───────────────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => k in b && deepEqual(a[k], b[k]));
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
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      out.push(...diffPaths(a[k], b[k], prefix ? `${prefix}.${k}` : k));
    }
    return out;
  }
  return [prefix || "(root)"];
}

// ── Fixture : une spec réelle (e-commerce) ───────────────────────────────────

function baseSpec(): ZeroAPISpec {
  return structuredClone({
    version: "1.0",
    name: "shop",
    description: "Boutique en ligne",
    roles: [{ name: "admin" }, { name: "user" }],
    rateLimit: { windowMs: 60000, max: 120 },
    auth: {
      enabled: true,
      strategies: ["jwt"],
      jwt: { enabled: true, secretEnv: "JWT_SECRET" },
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
        },
        relations: [{ type: "manyToOne", resource: "User", field: "userId", onDelete: "Cascade" }],
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
    env: [{ name: "JWT_SECRET", required: true, generate: true, managedByCloud: true }],
  }) as unknown as ZeroAPISpec;
}

// ── Tool invocation helper (bypasse le LLM : appel direct du tool) ───────────

interface ToolOutcome {
  ok: boolean;
  error?: string;
  requiresConfirmation?: true;
  impact?: ConfirmationImpact;
  applied?: OperationType;
}

async function callTool(
  toolset: OperationToolset,
  type: OperationType,
  input: Record<string, unknown>,
): Promise<ToolOutcome> {
  const t = toolset.tools[type];
  assert(t, `tool "${type}" doit exister`);
  const exec = t.execute;
  assert(exec, `tool "${type}" doit avoir un execute`);
  // The SDK passes (input, ToolCallOptions); only a stub is needed here.
  const out = await exec(input, { toolCallId: "test", messages: [] } as never);
  return out as ToolOutcome;
}

// ── Mock model : émet une séquence d'étapes (tool-calls puis texte final) ─────

type MockStep =
  | { tool: string; input: unknown }
  | { tool: string; input: unknown; invalid: true }
  | { text: string };

function mockModel(steps: MockStep[]): LanguageModel {
  const usage = {
    inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 0, text: 0, reasoning: 0 },
  };
  let i = 0;
  return new MockLanguageModelV3({
    doGenerate: async () => {
      const step = steps[Math.min(i, steps.length - 1)];
      i++;
      if ("text" in step) {
        return {
          content: [{ type: "text" as const, text: step.text }],
          finishReason: { unified: "stop" as const, raw: "stop" },
          usage,
          warnings: [],
        };
      }
      return {
        content: [
          {
            type: "tool-call" as const,
            toolCallId: `call_${i}`,
            toolName: step.tool,
            input: JSON.stringify(step.input),
          },
        ],
        finishReason: { unified: "tool-calls" as const, raw: "tool_calls" },
        usage,
        warnings: [],
      };
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 0. Le toolset est GÉNÉRÉ depuis le registry (source unique)
// ════════════════════════════════════════════════════════════════════════════

test("toolset — un tool par opération du registry (66), aucun en trop/manquant", () => {
  const toolset = createOperationToolset(baseSpec());
  const toolNames = Object.keys(toolset.tools).sort();
  const opNames = Object.keys(OPERATION_DANGER).sort();
  assert(toolNames.length === OPERATION_COUNT, `attendu ${OPERATION_COUNT} tools, obtenu ${toolNames.length}`);
  assert(deepEqual(toolNames, opNames), "les noms de tools doivent être EXACTEMENT les types d'opérations du registry");
});

test("toolset — chaque tool a une description taguée par dangerosité + un schéma", () => {
  const toolset = createOperationToolset(baseSpec());
  for (const [name, t] of Object.entries(toolset.tools)) {
    const danger = OPERATION_DANGER[name as OperationType];
    assert(typeof t.description === "string" && t.description.includes(danger), `${name} doit décrire sa dangerosité`);
    assert(t.inputSchema != null, `${name} doit exposer un inputSchema`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// A. Tools directs sur une spec réelle (pas de dérive)
// ════════════════════════════════════════════════════════════════════════════

test("ajoute une ressource X → addResource : SEULE X ajoutée, reste intact", async () => {
  const before = baseSpec();
  const toolset = createOperationToolset(structuredClone(before));
  const r = await callTool(toolset, "addResource", {
    name: "Invoice",
    fields: { amount: { type: "decimal", required: true }, paid: { type: "boolean" } },
  });
  assert(r.ok, `addResource doit réussir: ${r.error ?? ""}`);

  const after = toolset.getSpec();
  // Exactement une nouvelle ressource à l'index 2, rien d'autre.
  assert(after.resources.length === 3, "3 ressources attendues");
  assert(after.resources[2].name === "Invoice", "la 3e ressource est Invoice");
  const changed = diffPaths(before, after).sort();
  assert(deepEqual(changed, ["resources[2]"]), `seul resources[2] doit changer, obtenu ${JSON.stringify(changed)}`);

  // Log : une opération appliquée.
  const log = toolset.getLog();
  assert(log.length === 1 && log[0].type === "addResource" && log[0].outcome === "applied", "log doit montrer addResource appliquée");
});

test("ajoute un champ à Product → addField ciblé (seul ce champ change)", async () => {
  const before = baseSpec();
  const toolset = createOperationToolset(structuredClone(before));
  const r = await callTool(toolset, "addField", {
    resource: "Product",
    field: "sku",
    fieldType: "string",
    options: { unique: true },
  });
  assert(r.ok, `addField doit réussir: ${r.error ?? ""}`);

  const after = toolset.getSpec();
  const changed = diffPaths(before, after).sort();
  assert(deepEqual(changed, ["resources[0].fields.sku"]), `seul le champ sku doit apparaître, obtenu ${JSON.stringify(changed)}`);
  const sku = (after.resources[0].fields as Record<string, { type: string; unique?: boolean }>).sku;
  assert(sku && sku.type === "string" && sku.unique === true, "sku doit être string unique");
});

test("ajoute du multi-tenant → setPermissionScope (scope ajouté sur la règle)", async () => {
  const before = baseSpec();
  const toolset = createOperationToolset(structuredClone(before));
  const r = await callTool(toolset, "setPermissionScope", {
    resource: "Order",
    role: "admin",
    column: "organizationId",
    claim: "org",
  });
  assert(r.ok, `setPermissionScope doit réussir: ${r.error ?? ""}`);

  const after = toolset.getSpec();
  const adminRule = after.permissions?.[0].rules.find((x) => x.role === "admin");
  assert(adminRule?.scope?.column === "organizationId" && adminRule.scope.claim === "org", "scope multi-tenant posé sur la règle admin");
  // Aucune ressource touchée.
  assert(deepEqual(before.resources, after.resources), "aucune ressource ne doit changer");
});

test("ajoute un workflow draft→published → setStateMachine", async () => {
  const before = baseSpec();
  const toolset = createOperationToolset(structuredClone(before));
  const r = await callTool(toolset, "setStateMachine", {
    resource: "Product",
    field: "status",
    initial: "draft",
    transitions: [
      { from: "draft", to: "published", roles: ["admin"] },
      { from: "published", to: "archived" },
    ],
  });
  assert(r.ok, `setStateMachine doit réussir: ${r.error ?? ""}`);

  const after = toolset.getSpec();
  const sm = (after.resources[0] as { stateMachine?: { field: string; initial: string; transitions: unknown[] } }).stateMachine;
  assert(sm?.field === "status" && sm.initial === "draft" && sm.transitions.length === 2, "state machine draft→published posée sur Product");
  const changed = diffPaths(before, after).sort();
  assert(deepEqual(changed, ["resources[0].stateMachine"]), `seul resources[0].stateMachine doit changer, obtenu ${JSON.stringify(changed)}`);
});

test("opération dangereuse (removeResource) → confirmation requise, spec inchangée", async () => {
  const before = baseSpec();
  const toolset = createOperationToolset(structuredClone(before));
  const r = await callTool(toolset, "removeResource", { name: "Order" });
  assert(!r.ok, "removeResource non confirmée ne doit PAS réussir");
  assert(r.requiresConfirmation === true, "doit demander confirmation");
  assert(r.impact?.operation === "removeResource", "l'impact doit décrire removeResource");
  assert((r.impact?.impact.length ?? 0) > 0, "l'impact doit lister ce qui sera affecté");

  // Spec d'origine préservée + confirmation en attente exposée.
  assert(deepEqual(before, toolset.getSpec()), "la spec ne doit pas changer sans confirmation");
  assert(toolset.getPendingConfirmations().length === 1, "une confirmation en attente");
});

test("opération dangereuse APRÈS approbation explicite → appliquée", async () => {
  const before = baseSpec();
  const toolset = createOperationToolset(structuredClone(before), {
    approvedConfirmations: ["removeResource"],
  });
  const r = await callTool(toolset, "removeResource", { name: "Order" });
  assert(r.ok, `removeResource approuvée doit réussir: ${r.error ?? ""}`);
  const after = toolset.getSpec();
  assert(after.resources.length === 1 && after.resources[0].name === "Product", "Order doit être retirée, Product conservée");
});

test("demande invalide (ressource dupliquée) → rejetée, spec d'origine préservée", async () => {
  const before = baseSpec();
  const toolset = createOperationToolset(structuredClone(before));
  const r = await callTool(toolset, "addResource", { name: "Product" }); // collision
  assert(!r.ok, "ajouter une ressource déjà existante doit échouer");
  assert(!r.requiresConfirmation, "ce n'est pas une demande de confirmation mais une erreur");
  assert(deepEqual(before, toolset.getSpec()), "la spec d'origine doit être préservée après rejet");
  const log = toolset.getLog();
  assert(log.length === 1 && log[0].outcome === "rejected", "le rejet doit être loggé");
});

// ════════════════════════════════════════════════════════════════════════════
// B. Boucle d'agent complète, pilotée par un mock model
// ════════════════════════════════════════════════════════════════════════════

test("boucle — le LLM émet addResource → spec finale contient X, log applied", async () => {
  const spec = baseSpec();
  const result = await runKiaAgent({
    model: mockModel([
      { tool: "addResource", input: { name: "Coupon", fields: { code: { type: "string", required: true } } } },
      { text: "J'ai ajouté la ressource Coupon." },
    ]),
    spec,
    messages: [{ role: "user", content: "Ajoute une ressource Coupon avec un champ code." }],
    maxSteps: 6,
  });
  assert(result.changed, "le résultat doit être marqué changed");
  assert(result.appliedCount === 1, "1 opération appliquée");
  assert(result.spec.resources.some((x) => x.name === "Coupon"), "la spec finale contient Coupon");
  assert(deepEqual(spec, baseSpec()), "la spec d'ENTRÉE ne doit pas être mutée");
  assert(result.steps >= 2, "au moins 2 étapes (call + résumé)");
  assert(result.operations[0].type === "addResource" && result.operations[0].outcome === "applied", "log opération");
});

test("boucle — opération destructive : confirmation remontée, rien appliqué", async () => {
  const spec = baseSpec();
  const result = await runKiaAgent({
    model: mockModel([
      { tool: "removeResource", input: { name: "Order" } },
      { text: "Cette suppression nécessite ta confirmation." },
    ]),
    spec,
    messages: [{ role: "user", content: "Supprime la ressource Order." }],
    maxSteps: 6,
  });
  assert(!result.changed, "rien ne doit être appliqué sans confirmation");
  assert(result.pendingConfirmations.length === 1, "une confirmation en attente remontée");
  assert(result.pendingConfirmations[0].operation === "removeResource", "impact removeResource");
  assert(result.spec.resources.some((x) => x.name === "Order"), "Order toujours présente");
});

test("boucle — appel MALFORMÉ (zod rejette) → erreur + RETRY → op valide appliquée", async () => {
  const spec = baseSpec();
  const result = await runKiaAgent({
    model: mockModel([
      // 1) addField sans `field` ni `fieldType` → l'inputSchema zod rejette.
      { tool: "addField", input: { resource: "Product" } },
      // 2) le modèle se corrige.
      { tool: "addField", input: { resource: "Product", field: "sku", fieldType: "string" } },
      { text: "Champ sku ajouté après correction." },
    ]),
    spec,
    messages: [{ role: "user", content: "Ajoute un champ sku à Product." }],
    maxSteps: 8,
  });
  assert(result.steps >= 3, `le retry doit produire ≥3 étapes, obtenu ${result.steps}`);
  assert(result.appliedCount === 1, "exactement 1 opération valide appliquée");
  const sku = (result.spec.resources[0].fields as Record<string, { type: string }>).sku;
  assert(sku?.type === "string", "le champ sku valide doit être appliqué après retry");
});

// ════════════════════════════════════════════════════════════════════════════
// C. Contrat d'affichage du chat — opérations rendues LISIBLES (pas de JSON)
// ════════════════════════════════════════════════════════════════════════════

test("describeOperation — phrases lisibles en français (pas de JSON brut)", () => {
  assert(
    describeOperation("addResource", { name: "Avis" }) === "Ajouté la ressource Avis",
    "addResource doit se lire « Ajouté la ressource Avis »",
  );
  assert(
    describeOperation("addField", { resource: "Avis", field: "note" }) === "Ajouté le champ note à Avis",
    "addField doit se lire « Ajouté le champ note à Avis »",
  );
  assert(
    describeOperation("setPermissionScope", { resource: "Order", role: "user", column: "orgId" }).startsWith("Activé le multi-tenant"),
    "setPermissionScope doit parler de multi-tenant",
  );
  assert(
    describeOperation("setStateMachine", { resource: "Product", field: "status" }).startsWith("Ajouté un workflow d'états"),
    "setStateMachine doit parler de workflow d'états",
  );
});

test("flux chat — la boucle produit des opérations rendues en résumé lisible", async () => {
  const result = await runKiaAgent({
    model: mockModel([
      { tool: "addResource", input: { name: "Avis", fields: { note: { type: "integer" } } } },
      { tool: "addField", input: { resource: "Avis", field: "comment", fieldType: "text" } },
      { text: "Fait." },
    ]),
    spec: baseSpec(),
    messages: [{ role: "user", content: "Ajoute une ressource Avis avec une note et un commentaire." }],
    maxSteps: 8,
  });
  // C'est exactement ce que le chat affiche (chips) et persiste (markdown).
  const summary = summarizeAppliedOperations(result.operations);
  assert(summary.includes("✓ Ajouté la ressource Avis"), "résumé doit lister l'ajout de la ressource");
  assert(summary.includes("✓ Ajouté le champ comment à Avis"), "résumé doit lister l'ajout du champ");
  assert(!summary.includes("{") && !summary.includes('"type"'), "le résumé ne doit JAMAIS contenir de JSON brut");
});

// ── Run ──────────────────────────────────────────────────────────────────────

async function main() {
  for (const [label, fn] of registered) {
    try {
      await fn();
      passed++;
    } catch (e) {
      failed++;
      failures.push(`✗ ${label}\n    ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`\nKIA agent — ${passed} passés, ${failed} échoués, ${assertions} assertions.`);
  if (failures.length) {
    console.log("\n" + failures.join("\n\n"));
    process.exit(1);
  }
  process.exit(0);
}

void main();
