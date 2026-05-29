/**
 * Suite de tests du MOTEUR D'OPÉRATIONS (lib/operations/).
 *
 *   pnpm tsx scripts/test-operations.ts
 *
 * Prouve, pour chaque opération du catalogue OPERATIONS.md :
 *   1. qu'elle fait EXACTEMENT ce qu'elle doit (bon élément ajouté/retiré/modifié) ;
 *   2. que le RESTE de la spec ne change jamais (non-régression : diff de chemins) ;
 *   3. que la spec d'origine n'est jamais mutée (immuabilité) ;
 *   4. que les opérations dangereuses gèrent orphelins/dépendances sans casser ;
 *   5. qu'une opération rendant la spec invalide est REJETÉE (origine préservée) ;
 *   6. que applyOperations est atomique (rollback si une échoue).
 *
 * Aucun accès réseau / DB : pures fonctions + le gate de validation existant.
 */

import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import {
  applyOperation,
  applyOperations,
  runValidationGate,
  OPERATION_COUNT,
  OPERATION_DANGER,
  type ApplyResult,
  type Operation,
} from "../lib/operations/index.js";

// ── Test harness ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let assertions = 0;
const failures: string[] = [];

function assert(cond: unknown, label: string): asserts cond {
  assertions++;
  if (!cond) throw new Error(`assertion échouée: ${label}`);
}

function test(label: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    failures.push(`✗ ${label}\n    ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── Deep equality + path diff (for non-regression proofs) ───────────────────

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

/** Dot/bracket paths where `a` and `b` differ (added, removed, or changed). */
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

/** Asserts the set of changed paths between before/after equals `expected`. */
function assertChangedPaths(
  before: unknown,
  after: unknown,
  expected: string[],
  label: string,
): void {
  const actual = diffPaths(before, after).sort();
  const exp = [...expected].sort();
  assert(
    deepEqual(actual, exp),
    `${label} — chemins modifiés attendus ${JSON.stringify(exp)}, obtenus ${JSON.stringify(actual)}`,
  );
}

/** Runs op via applyOperation, asserting success + immutability of the input. */
function ok(spec: ZeroAPISpec, op: Operation, label: string): ZeroAPISpec {
  const snapshot = structuredClone(spec);
  const res = applyOperation(spec, op);
  assert(res.ok, `${label} — devait réussir mais a échoué: ${res.ok ? "" : res.error}`);
  assert(deepEqual(spec, snapshot), `${label} — la spec d'origine a été mutée (non immuable)`);
  return (res as Extract<ApplyResult, { ok: true }>).spec;
}

/** Runs op expecting failure; asserts input untouched; returns the result. */
function ko(spec: ZeroAPISpec, op: Operation, label: string): Extract<ApplyResult, { ok: false }> {
  const snapshot = structuredClone(spec);
  const res = applyOperation(spec, op);
  assert(!res.ok, `${label} — devait échouer mais a réussi`);
  assert(deepEqual(spec, snapshot), `${label} — la spec d'origine a été mutée malgré l'échec`);
  return res as Extract<ApplyResult, { ok: false }>;
}

// ── Fixtures ────────────────────────────────────────────────────────────────

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
    env: [
      { name: "JWT_SECRET", required: true, generate: true, managedByCloud: true },
      { name: "STRIPE_SECRET_KEY", required: false },
    ],
    features: {
      fileUpload: { enabled: true, provider: "r2", maxSizeMB: 5, allowedTypes: ["image/png"] },
      search: { enabled: true, fuzzy: true },
      pagination: { defaultLimit: 20, maxLimit: 100 },
    },
    authFlows: { passwordReset: true, refreshTokens: true },
  }) as unknown as ZeroAPISpec;
}

/** A minimal spec with no auth — useful for clean enable/disable tests. */
function minimalSpec(): ZeroAPISpec {
  return structuredClone({
    version: "1.0",
    name: "todo",
    resources: [
      { name: "Task", fields: { title: { type: "string", required: true }, done: { type: "boolean" } } },
    ],
  }) as unknown as ZeroAPISpec;
}

const PRODUCT = "resources[0]";
const ORDER = "resources[1]";

// ════════════════════════════════════════════════════════════════════════════
// 0. Sanity: the fixtures pass the gate
// ════════════════════════════════════════════════════════════════════════════

test("fixture baseSpec passe le gate de validation", () => {
  assert(runValidationGate(baseSpec()) === null, "baseSpec doit être valide");
  assert(runValidationGate(minimalSpec()) === null, "minimalSpec doit être valide");
});

// ════════════════════════════════════════════════════════════════════════════
// 1. Méta (§2.1)
// ════════════════════════════════════════════════════════════════════════════

test("setApiName — change name, rien d'autre", () => {
  const b = baseSpec();
  const r = ok(b, { type: "setApiName", name: "boutique" }, "setApiName");
  assert(r.name === "boutique", "name mis à jour");
  assertChangedPaths(b, r, ["name"], "setApiName");
});

test("setApiDescription — set puis clear", () => {
  const b = baseSpec();
  const r1 = ok(b, { type: "setApiDescription", description: "Nouvelle" }, "setApiDescription set");
  assert(r1.description === "Nouvelle", "description mise à jour");
  assertChangedPaths(b, r1, ["description"], "setApiDescription set");
  const r2 = ok(b, { type: "setApiDescription" }, "setApiDescription clear");
  assert(r2.description === undefined, "description supprimée");
  assertChangedPaths(b, r2, ["description"], "setApiDescription clear");
});

test("setGlobalRateLimit + clearGlobalRateLimit", () => {
  const b = baseSpec();
  const r = ok(b, { type: "setGlobalRateLimit", windowMs: 1000, max: 5 }, "setGlobalRateLimit");
  assert(r.rateLimit?.windowMs === 1000 && r.rateLimit?.max === 5, "rateLimit mis à jour");
  assertChangedPaths(b, r, ["rateLimit.windowMs", "rateLimit.max"], "setGlobalRateLimit");
  const r2 = ok(b, { type: "clearGlobalRateLimit" }, "clearGlobalRateLimit");
  assert(r2.rateLimit === undefined, "rateLimit supprimé");
  assertChangedPaths(b, r2, ["rateLimit"], "clearGlobalRateLimit");
});

test("setGlobalRateLimit — rejette valeurs invalides", () => {
  ko(baseSpec(), { type: "setGlobalRateLimit", windowMs: 0, max: 5 }, "windowMs<=0");
  ko(baseSpec(), { type: "setGlobalRateLimit", windowMs: 1000, max: -1 }, "max<=0");
});

// ════════════════════════════════════════════════════════════════════════════
// 2. Ressources (§2.2)
// ════════════════════════════════════════════════════════════════════════════

test("addResource — ajoute une ressource, rien d'autre", () => {
  const b = baseSpec();
  const r = ok(
    b,
    { type: "addResource", name: "Category", fields: { name: { type: "string", required: true } } },
    "addResource",
  );
  assert(r.resources.length === 3, "3 ressources");
  assert(r.resources[2].name === "Category", "Category ajoutée");
  assertChangedPaths(b, r, ["resources[2]"], "addResource");
});

test("addResource — défaut champ id quand fields omis", () => {
  const r = ok(baseSpec(), { type: "addResource", name: "Tag" }, "addResource sans fields");
  assert(r.resources[2].fields.id?.type === "uuid", "champ id par défaut");
});

test("addResource — rejette collision de nom", () => {
  const res = ko(baseSpec(), { type: "addResource", name: "Product", fields: { x: { type: "string" } } }, "collision");
  assert(/existe déjà/.test(res.error), "message collision");
});

test("addResource — rejette nom réservé (User sous JWT)", () => {
  ko(baseSpec(), { type: "addResource", name: "User", fields: { x: { type: "string" } } }, "réservé User");
});

test("addResource — rejette enum sans values", () => {
  ko(
    baseSpec(),
    { type: "addResource", name: "Z", fields: { s: { type: "enum" } } },
    "enum sans values",
  );
});

test("removeResource — sans référence : retire proprement", () => {
  const b = ok(baseSpec(), { type: "addResource", name: "Tag", fields: { label: { type: "string", required: true } } }, "prep Tag");
  const r = ok(b, { type: "removeResource", name: "Tag" }, "removeResource sans ref");
  assert(!r.resources.some((x) => x.name === "Tag"), "Tag retiré");
  assertChangedPaths(b, r, ["resources[2]"], "removeResource sans ref");
});

test("removeResource — avec références : exige confirmation puis cascade", () => {
  const b = baseSpec();
  // Product est référencé par la relation top-level Order→Product.
  const refused = ko(b, { type: "removeResource", name: "Product" }, "removeResource non confirmé");
  assert(refused.requiresConfirmation !== undefined, "requiresConfirmation présent");
  assert(refused.requiresConfirmation!.impact.length >= 1, "impact listé");
  // Confirmé → cascade les relations/permissions, garde Order intact.
  const r = ok(b, { type: "removeResource", name: "Product", confirmed: true }, "removeResource confirmé");
  assert(!r.resources.some((x) => x.name === "Product"), "Product retiré");
  assert(r.resources.some((x) => x.name === "Order"), "Order conservé");
  assert(!(r.relations ?? []).some((rel) => rel.to === "Product" || rel.from === "Product"), "relations Product retirées");
});

test("removeResource — ressource inexistante rejetée", () => {
  ko(baseSpec(), { type: "removeResource", name: "Ghost" }, "removeResource inexistant");
});

test("renameResource — renomme + propage relations & permissions", () => {
  const b = baseSpec();
  const r = ok(b, { type: "renameResource", oldName: "Order", newName: "Purchase" }, "renameResource");
  assert(r.resources.some((x) => x.name === "Purchase"), "Purchase existe");
  assert(!r.resources.some((x) => x.name === "Order"), "Order disparu");
  assert((r.relations ?? []).every((rel) => rel.from !== "Order"), "relation propagée (from)");
  assert(r.relations![0].from === "Purchase", "relation from = Purchase");
  assert(r.permissions![0].resource === "Purchase", "permission propagée");
  // Changements: nom ressource + relations[0].from + permissions[0].resource
  assertChangedPaths(
    b,
    r,
    [`${ORDER}.name`, "relations[0].from", "permissions[0].resource"],
    "renameResource",
  );
});

test("renameResource — rejette collision et nom réservé", () => {
  ko(baseSpec(), { type: "renameResource", oldName: "Order", newName: "Product" }, "rename collision");
  ko(baseSpec(), { type: "renameResource", oldName: "Order", newName: "User" }, "rename vers réservé");
});

test("setResourceDescription — change la description de la bonne ressource", () => {
  const b = baseSpec();
  const r = ok(b, { type: "setResourceDescription", name: "Product", description: "X" }, "setResourceDescription");
  assert(r.resources[0].description === "X", "description Product mise à jour");
  assertChangedPaths(b, r, [`${PRODUCT}.description`], "setResourceDescription");
});

test("setResourceEndpoints — restreint le CRUD", () => {
  const b = baseSpec();
  const r = ok(b, { type: "setResourceEndpoints", name: "Product", endpoints: ["list", "read"] }, "setResourceEndpoints");
  assert(deepEqual(r.resources[0].endpoints, ["list", "read"]), "endpoints restreints");
  // ["list","create","read","update","delete"] → ["list","read"] : index 1..4 diffèrent
  assertChangedPaths(
    b,
    r,
    [`${PRODUCT}.endpoints[1]`, `${PRODUCT}.endpoints[2]`, `${PRODUCT}.endpoints[3]`, `${PRODUCT}.endpoints[4]`],
    "setResourceEndpoints",
  );
});

test("setResourceEndpoints — rejette CRUD invalide", () => {
  ko(baseSpec(), { type: "setResourceEndpoints", name: "Product", endpoints: ["fly" as never] }, "endpoint invalide");
});

test("setResourceRbac — remplace le rbac", () => {
  const b = baseSpec();
  const rbac = { read: ["admin"], write: ["admin"], delete: ["admin"] };
  const r = ok(b, { type: "setResourceRbac", name: "Product", rbac }, "setResourceRbac");
  assert(deepEqual(r.resources[0].rbac, rbac), "rbac remplacé");
  // read ["user","admin"] → ["admin"] : index 0 change, index 1 disparaît
  assertChangedPaths(b, r, [`${PRODUCT}.rbac.read[0]`, `${PRODUCT}.rbac.read[1]`], "setResourceRbac");
});

test("setSearchableFields — set + rejet champ inexistant", () => {
  const b = baseSpec();
  const r = ok(b, { type: "setSearchableFields", name: "Order", fields: ["ref"] }, "setSearchableFields");
  assert(deepEqual(r.resources[1].searchable, ["ref"]), "searchable mis");
  assertChangedPaths(b, r, [`${ORDER}.searchable`], "setSearchableFields");
  ko(b, { type: "setSearchableFields", name: "Order", fields: ["nope"] }, "champ searchable inexistant");
});

// ════════════════════════════════════════════════════════════════════════════
// 3. Champs (§2.3)
// ════════════════════════════════════════════════════════════════════════════

test("addField — ajoute un champ ciblé", () => {
  const b = baseSpec();
  const r = ok(b, { type: "addField", resource: "Product", field: "sku", fieldType: "string", options: { required: true } }, "addField");
  assert(r.resources[0].fields.sku?.type === "string", "champ ajouté");
  assert(r.resources[0].fields.sku?.required === true, "option appliquée");
  assertChangedPaths(b, r, [`${PRODUCT}.fields.sku`], "addField");
});

test("addField — rejette doublon et enum sans values", () => {
  ko(baseSpec(), { type: "addField", resource: "Product", field: "title", fieldType: "string" }, "champ doublon");
  ko(baseSpec(), { type: "addField", resource: "Product", field: "kind", fieldType: "enum" }, "enum sans values");
});

test("modifyFieldOptions — merge partiel des options", () => {
  const b = baseSpec();
  const r = ok(b, { type: "modifyFieldOptions", resource: "Product", field: "title", options: { maxLength: 50 } }, "modifyFieldOptions");
  assert(r.resources[0].fields.title.maxLength === 50, "maxLength changé");
  assert(r.resources[0].fields.title.required === true, "required conservé");
  assertChangedPaths(b, r, [`${PRODUCT}.fields.title.maxLength`], "modifyFieldOptions");
});

test("setFieldType — élargissement autorisé sans confirmation", () => {
  const b = baseSpec();
  const r = ok(b, { type: "setFieldType", resource: "Product", field: "price", fieldType: "string" }, "setFieldType widening");
  assert(r.resources[0].fields.price.type === "string", "type élargi");
  assertChangedPaths(b, r, [`${PRODUCT}.fields.price.type`], "setFieldType widening");
});

test("setFieldType — rétrécissement exige confirmation", () => {
  const b = baseSpec();
  const refused = ko(b, { type: "setFieldType", resource: "Product", field: "title", fieldType: "integer" }, "narrowing non confirmé");
  assert(refused.requiresConfirmation !== undefined, "confirmation requise");
  const r = ok(b, { type: "setFieldType", resource: "Product", field: "title", fieldType: "integer", confirmed: true }, "narrowing confirmé");
  assert(r.resources[0].fields.title.type === "integer", "type rétréci appliqué");
});

test("setFieldType — quitter enum supprime values", () => {
  const r = ok(baseSpec(), { type: "setFieldType", resource: "Product", field: "status", fieldType: "string", confirmed: true }, "enum→string");
  assert(r.resources[0].fields.status.type === "string", "type changé");
  assert(r.resources[0].fields.status.values === undefined, "values supprimées");
});

test("setFieldRequired — bascule le flag required", () => {
  const b = baseSpec();
  const r = ok(b, { type: "setFieldRequired", resource: "Order", field: "ref", required: true }, "setFieldRequired");
  assert(r.resources[1].fields.ref.required === true, "required = true");
  assertChangedPaths(b, r, [`${ORDER}.fields.ref.required`], "setFieldRequired");
});

test("renameField — sans référence : renomme la clé", () => {
  const b = baseSpec();
  const r = ok(b, { type: "renameField", resource: "Order", oldName: "ref", newName: "reference" }, "renameField simple");
  assert(r.resources[1].fields.reference !== undefined, "nouvelle clé");
  assert(r.resources[1].fields.ref === undefined, "ancienne clé retirée");
  assertChangedPaths(b, r, [`${ORDER}.fields.ref`, `${ORDER}.fields.reference`], "renameField simple");
});

test("renameField — FK référencé : exige confirmation puis propage", () => {
  const b = baseSpec();
  // userId est la FK de la relation Order→User et de la relation top-level.
  const refused = ko(b, { type: "renameField", resource: "Order", oldName: "userId", newName: "ownerId" }, "renameField FK non confirmé");
  assert(refused.requiresConfirmation !== undefined, "confirmation requise");
  const r = ok(b, { type: "renameField", resource: "Order", oldName: "userId", newName: "ownerId", confirmed: true }, "renameField FK confirmé");
  assert(r.resources[1].relations![0].field === "ownerId", "FK relation par-ressource propagée");
  assert(r.relations![0].field === "ownerId", "FK relation top-level propagée");
});

test("removeField — sans référence : retire + nettoie searchable", () => {
  const b = baseSpec();
  const r = ok(b, { type: "removeField", resource: "Product", field: "price" }, "removeField simple");
  assert(r.resources[0].fields.price === undefined, "champ retiré");
  assertChangedPaths(b, r, [`${PRODUCT}.fields.price`], "removeField simple");
});

test("removeField — champ searchable : retire aussi l'entrée searchable", () => {
  const b = baseSpec();
  const r = ok(b, { type: "removeField", resource: "Product", field: "title", confirmed: true }, "removeField searchable");
  assert(r.resources[0].fields.title === undefined, "champ retiré");
  assert(!r.resources[0].searchable?.includes("title"), "searchable nettoyé");
});

test("removeField — FK relation : exige confirmation puis cascade la relation", () => {
  const b = baseSpec();
  const refused = ko(b, { type: "removeField", resource: "Order", field: "userId" }, "removeField FK non confirmé");
  assert(refused.requiresConfirmation !== undefined, "confirmation requise");
  const r = ok(b, { type: "removeField", resource: "Order", field: "userId", confirmed: true }, "removeField FK confirmé");
  assert(r.resources[1].fields.userId === undefined, "FK retirée");
  assert((r.resources[1].relations ?? []).every((rel) => rel.field !== "userId"), "relation FK retirée");
});

test("removeField — refuse de retirer le dernier champ", () => {
  const spec = structuredClone({ version: "1.0", name: "x", resources: [{ name: "A", fields: { only: { type: "string" } } }] }) as unknown as ZeroAPISpec;
  ko(spec, { type: "removeField", resource: "A", field: "only" }, "dernier champ");
});

test("addEnumValue — append idempotent", () => {
  const b = baseSpec();
  const r = ok(b, { type: "addEnumValue", resource: "Product", field: "status", value: "pending" }, "addEnumValue");
  assert(r.resources[0].fields.status.values?.includes("pending"), "valeur ajoutée");
  assertChangedPaths(b, r, [`${PRODUCT}.fields.status.values[3]`], "addEnumValue");
  // idempotence
  const r2 = ok(r, { type: "addEnumValue", resource: "Product", field: "status", value: "pending" }, "addEnumValue idempotent");
  assertChangedPaths(r, r2, [], "addEnumValue idempotent (no-op)");
});

test("addEnumValue — rejette champ non-enum", () => {
  ko(baseSpec(), { type: "addEnumValue", resource: "Product", field: "title", value: "x" }, "addEnumValue non-enum");
});

test("removeEnumValue — exige confirmation puis retire", () => {
  const b = baseSpec();
  const refused = ko(b, { type: "removeEnumValue", resource: "Product", field: "status", value: "archived" }, "removeEnumValue non confirmé");
  assert(refused.requiresConfirmation !== undefined, "confirmation requise");
  const r = ok(b, { type: "removeEnumValue", resource: "Product", field: "status", value: "archived", confirmed: true }, "removeEnumValue confirmé");
  assert(!r.resources[0].fields.status.values?.includes("archived"), "valeur retirée");
});

test("removeEnumValue — rejette valeur inexistante et dernière valeur", () => {
  ko(baseSpec(), { type: "removeEnumValue", resource: "Product", field: "status", value: "nope", confirmed: true }, "valeur inexistante");
  const single = structuredClone({ version: "1.0", name: "x", resources: [{ name: "A", fields: { s: { type: "enum", values: ["only"] } } }] }) as unknown as ZeroAPISpec;
  ko(single, { type: "removeEnumValue", resource: "A", field: "s", value: "only", confirmed: true }, "dernière valeur enum");
});

test("setEnumValues — ajout pur sans confirmation, retrait avec confirmation", () => {
  const b = baseSpec();
  const r = ok(b, { type: "setEnumValues", resource: "Product", field: "status", values: ["draft", "published", "archived", "sold"] }, "setEnumValues ajout");
  assert(r.resources[0].fields.status.values?.length === 4, "valeurs étendues");
  const refused = ko(b, { type: "setEnumValues", resource: "Product", field: "status", values: ["draft"] }, "setEnumValues retrait non confirmé");
  assert(refused.requiresConfirmation !== undefined, "confirmation requise pour retrait");
  const r2 = ok(b, { type: "setEnumValues", resource: "Product", field: "status", values: ["draft"], confirmed: true }, "setEnumValues retrait confirmé");
  assert(deepEqual(r2.resources[0].fields.status.values, ["draft"]), "valeurs remplacées");
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Relations (§2.4)
// ════════════════════════════════════════════════════════════════════════════

test("addRelation — top-level, cible existante", () => {
  const b = ok(baseSpec(), { type: "addResource", name: "Category", fields: { name: { type: "string", required: true } } }, "prep Category");
  const withFk = ok(b, { type: "addField", resource: "Product", field: "categoryId", fieldType: "uuid" }, "prep FK");
  const r = ok(
    withFk,
    { type: "addRelation", from: "Product", to: "Category", relationType: "many-to-one", field: "categoryId", onDelete: "cascade" },
    "addRelation",
  );
  assert(r.relations!.some((rel) => rel.from === "Product" && rel.to === "Category"), "relation ajoutée");
  const idx = r.relations!.length - 1;
  assertChangedPaths(withFk, r, [`relations[${idx}]`], "addRelation");
});

test("addRelation — rejette cible inconnue, m2m sans through, doublon", () => {
  ko(baseSpec(), { type: "addRelation", from: "Order", to: "Ghost", relationType: "many-to-one" }, "cible inconnue");
  ko(baseSpec(), { type: "addRelation", from: "Order", to: "Product", relationType: "many-to-many" }, "m2m sans through");
  ko(baseSpec(), { type: "addRelation", from: "Order", to: "Product", relationType: "many-to-one", field: "userId" }, "relation doublon");
});

test("addRelation — rejette FK inexistante sur la source", () => {
  ko(baseSpec(), { type: "addRelation", from: "Order", to: "Product", relationType: "one-to-one", field: "ghostFk" }, "FK inexistante");
});

test("removeRelation — retire la relation top-level", () => {
  const b = baseSpec();
  const r = ok(b, { type: "removeRelation", from: "Order", to: "Product" }, "removeRelation");
  assert((r.relations ?? []).length === 0, "relation retirée");
  assertChangedPaths(b, r, ["relations"], "removeRelation");
  ko(b, { type: "removeRelation", from: "Order", to: "Ghost" }, "removeRelation inexistante");
});

test("setRelationOnDelete — change onDelete d'une relation top-level", () => {
  const b = baseSpec();
  const r = ok(b, { type: "setRelationOnDelete", from: "Order", to: "Product", onDelete: "set-null" }, "setRelationOnDelete");
  assert(r.relations![0].onDelete === "set-null", "onDelete mis");
  assertChangedPaths(b, r, ["relations[0].onDelete"], "setRelationOnDelete");
});

test("addResourceRelation — relation par-ressource", () => {
  const b = ok(baseSpec(), { type: "addField", resource: "Product", field: "ownerId", fieldType: "uuid" }, "prep FK");
  const r = ok(
    b,
    { type: "addResourceRelation", resource: "Product", target: "User", relationType: "manyToOne", field: "ownerId", onDelete: "Cascade" },
    "addResourceRelation",
  );
  assert(r.resources[0].relations?.some((rel) => rel.resource === "User"), "relation par-ressource ajoutée");
  assertChangedPaths(b, r, [`${PRODUCT}.relations`], "addResourceRelation");
});

test("removeResourceRelation — retire la relation par-ressource", () => {
  const b = baseSpec();
  const r = ok(b, { type: "removeResourceRelation", resource: "Order", target: "User" }, "removeResourceRelation");
  assert((r.resources[1].relations ?? []).length === 0, "relation retirée");
  assertChangedPaths(b, r, [`${ORDER}.relations`], "removeResourceRelation");
});

// ════════════════════════════════════════════════════════════════════════════
// 5. Auth (§2.5)
// ════════════════════════════════════════════════════════════════════════════

test("enableJwt — active jwt sur spec sans auth", () => {
  const b = minimalSpec();
  const r = ok(b, { type: "enableJwt", secretEnv: "JWT_SECRET" }, "enableJwt");
  assert(r.auth?.jwt?.enabled === true, "jwt activé");
  assert(r.auth?.strategies?.includes("jwt"), "stratégie jwt ajoutée");
  assertChangedPaths(b, r, ["auth"], "enableJwt");
});

test("enableJwt — refuse si une ressource User existe", () => {
  const spec = structuredClone({ version: "1.0", name: "x", resources: [{ name: "User", fields: { s: { type: "string" } } }] }) as unknown as ZeroAPISpec;
  ko(spec, { type: "enableJwt" }, "enableJwt conflit User");
});

test("disableJwt — sans dépendance : retire jwt", () => {
  const withJwt = ok(minimalSpec(), { type: "enableJwt" }, "prep jwt");
  const r = ok(withJwt, { type: "disableJwt" }, "disableJwt");
  assert(r.auth === undefined, "auth supprimée (rien d'autre)");
});

test("disableJwt — avec dépendances : exige confirmation puis cascade", () => {
  const b = baseSpec(); // a oauth + ownOnly + relations→User
  const refused = ko(b, { type: "disableJwt" }, "disableJwt non confirmé");
  assert(refused.requiresConfirmation !== undefined, "confirmation requise");
  assert(refused.requiresConfirmation!.impact.length >= 3, "dépendances listées");
  const r = ok(b, { type: "disableJwt", confirmed: true }, "disableJwt confirmé");
  assert(r.auth?.jwt === undefined, "jwt retiré");
  assert(r.auth?.oauth === undefined, "oauth retiré (exige jwt)");
  assert(!(r.relations ?? []).some((rel) => rel.to === "User"), "relations→User retirées");
  for (const perm of r.permissions ?? []) for (const rule of perm.rules) assert(!rule.ownOnly, "ownOnly retiré");
  assert(runValidationGate(r) === null, "spec résultante valide");
});

test("enableApiKey / disableApiKey", () => {
  const r = ok(minimalSpec(), { type: "enableApiKey", header: "X-Key", prefix: "k_" }, "enableApiKey");
  assert(r.auth?.apikey?.enabled === true && r.auth?.apikey?.header === "X-Key", "apikey activé");
  const r2 = ok(baseSpec(), { type: "disableApiKey" }, "disableApiKey");
  assert(r2.auth?.apikey === undefined, "apikey retiré");
  assert(!r2.auth?.strategies?.includes("apikey"), "stratégie apikey retirée");
  ko(minimalSpec(), { type: "disableApiKey" }, "disableApiKey absent");
});

test("addOAuthProvider — exige jwt, ajoute le provider", () => {
  const b = baseSpec();
  const r = ok(b, { type: "addOAuthProvider", provider: "github" }, "addOAuthProvider");
  assert(r.auth?.oauth?.providers.some((p) => p.name === "github"), "provider github ajouté");
  assert(r.auth?.oauth?.providers.find((p) => p.name === "github")?.clientIdEnv === "GITHUB_CLIENT_ID", "env client id par défaut");
  // sans jwt → rejet
  ko(minimalSpec(), { type: "addOAuthProvider", provider: "google" }, "oauth sans jwt");
  // doublon
  ko(b, { type: "addOAuthProvider", provider: "google" }, "oauth doublon");
});

test("removeOAuthProvider — retire le provider et nettoie oauth si vide", () => {
  const b = baseSpec();
  const r = ok(b, { type: "removeOAuthProvider", provider: "google" }, "removeOAuthProvider");
  assert(r.auth?.oauth === undefined, "oauth supprimé (vide)");
  assert(!r.auth?.strategies?.includes("oauth"), "stratégie oauth retirée");
  ko(b, { type: "removeOAuthProvider", provider: "apple" }, "provider absent");
});

test("setAuthFlag — bascule emailVerification", () => {
  const b = baseSpec();
  const r = ok(b, { type: "setAuthFlag", flag: "emailVerification", value: false }, "setAuthFlag");
  assert(r.auth?.emailVerification === false, "flag mis à false");
  assertChangedPaths(b, r, ["auth.emailVerification"], "setAuthFlag");
});

test("disableAuth — avec dépendances : confirmation + cascade, spec valide", () => {
  const b = baseSpec();
  ko(b, { type: "disableAuth" }, "disableAuth non confirmé");
  const r = ok(b, { type: "disableAuth", confirmed: true }, "disableAuth confirmé");
  assert(r.auth === undefined, "auth supprimée");
  assert(runValidationGate(r) === null, "spec résultante valide");
});

test("setLegacyAuthStrategy — forme légacy", () => {
  const r = ok(minimalSpec(), { type: "setLegacyAuthStrategy", strategy: "apikey" }, "setLegacyAuthStrategy");
  assert((r.auth as { strategy?: string }).strategy === "apikey", "strategy légacy posée");
  ko(baseSpec(), { type: "setLegacyAuthStrategy", strategy: "bad" as never }, "stratégie invalide");
});

// ════════════════════════════════════════════════════════════════════════════
// 6. Rôles & permissions (§2.6)
// ════════════════════════════════════════════════════════════════════════════

test("addRole — ajoute un rôle", () => {
  const b = baseSpec();
  const r = ok(b, { type: "addRole", name: "vendor" }, "addRole");
  assert(r.roles?.some((x) => x.name === "vendor"), "rôle ajouté");
  assertChangedPaths(b, r, ["roles[2]"], "addRole");
  ko(b, { type: "addRole", name: "admin" }, "rôle doublon");
});

test("removeRole — référencé : confirmation + cascade rbac/permissions", () => {
  const b = baseSpec(); // user référencé par rbac Product + permission Order
  const refused = ko(b, { type: "removeRole", name: "user" }, "removeRole non confirmé");
  assert(refused.requiresConfirmation !== undefined, "confirmation requise");
  const r = ok(b, { type: "removeRole", name: "user", confirmed: true }, "removeRole confirmé");
  assert(!r.roles?.some((x) => x.name === "user"), "rôle retiré");
  assert(!r.resources[0].rbac?.read?.includes("user"), "rbac nettoyé");
  assert(!(r.permissions ?? []).some((p) => p.rules.some((rule) => rule.role === "user")), "permissions nettoyées");
  assert(runValidationGate(r) === null, "spec résultante valide");
});

test("renameRole — propage rbac + permissions", () => {
  const b = baseSpec();
  const r = ok(b, { type: "renameRole", oldName: "user", newName: "member" }, "renameRole");
  assert(r.roles?.some((x) => x.name === "member"), "rôle renommé");
  assert(r.resources[0].rbac?.read?.includes("member"), "rbac propagé");
  assert(r.permissions![0].rules.some((rule) => rule.role === "member"), "permission propagée");
});

test("setPermissionRule — upsert d'une règle", () => {
  const b = baseSpec();
  // nouvelle entrée pour Product
  const r = ok(b, { type: "setPermissionRule", resource: "Product", role: "user", actions: ["read"] }, "setPermissionRule new");
  assert(r.permissions?.some((p) => p.resource === "Product"), "entrée Product créée");
  // upsert règle existante (Order/user)
  const r2 = ok(b, { type: "setPermissionRule", resource: "Order", role: "user", actions: ["read"], ownOnly: true }, "setPermissionRule upsert");
  const rule = r2.permissions![0].rules.find((x) => x.role === "user")!;
  assert(deepEqual(rule.actions, ["read"]), "actions remplacées");
});

test("setPermissionRule — ownOnly sans jwt rejeté par le gate", () => {
  const spec = ok(minimalSpec(), { type: "addRole", name: "user" }, "prep role");
  ko(spec, { type: "setPermissionRule", resource: "Task", role: "user", actions: ["read"], ownOnly: true }, "ownOnly sans jwt");
});

test("removePermissionRule + removeResourcePermissions", () => {
  const b = baseSpec();
  const r = ok(b, { type: "removePermissionRule", resource: "Order", role: "user" }, "removePermissionRule");
  assert(!r.permissions![0].rules.some((x) => x.role === "user"), "règle user retirée");
  const r2 = ok(b, { type: "removeResourcePermissions", resource: "Order" }, "removeResourcePermissions");
  assert(r2.permissions === undefined, "permissions vidées");
  ko(b, { type: "removePermissionRule", resource: "Order", role: "ghost" }, "règle inexistante");
});

// ════════════════════════════════════════════════════════════════════════════
// 7. Features (§2.7)
// ════════════════════════════════════════════════════════════════════════════

test("enableFileUpload / disableFileUpload", () => {
  const r = ok(minimalSpec(), { type: "enableFileUpload", provider: "s3", maxSizeMB: 10 }, "enableFileUpload");
  assert(r.features?.fileUpload?.provider === "s3" && r.features?.fileUpload?.maxSizeMB === 10, "fileUpload configuré");
  const r2 = ok(baseSpec(), { type: "disableFileUpload" }, "disableFileUpload");
  assert(r2.features?.fileUpload === undefined, "fileUpload retiré");
  ko(baseSpec(), { type: "enableFileUpload", provider: "ftp" as never }, "provider invalide");
});

test("outbound/inbound webhooks — add/remove", () => {
  const b = baseSpec();
  const r = ok(b, { type: "addOutboundWebhook", event: "order.created" }, "addOutbound");
  assert(r.features?.webhooks?.outbound?.includes("order.created"), "outbound ajouté");
  const r2 = ok(r, { type: "addInboundWebhook", source: "stripe" }, "addInbound");
  assert(r2.features?.webhooks?.inbound?.includes("stripe"), "inbound ajouté");
  const r3 = ok(r2, { type: "removeOutboundWebhook", event: "order.created" }, "removeOutbound");
  assert(!r3.features?.webhooks?.outbound?.includes("order.created"), "outbound retiré");
  ko(b, { type: "removeInboundWebhook", source: "ghost" }, "inbound inexistant");
});

test("setSearch / setPagination / setFeatureRateLimit", () => {
  const b = baseSpec();
  const r = ok(b, { type: "setSearch", enabled: false }, "setSearch");
  assert(r.features?.search?.enabled === false, "search basculé");
  const r2 = ok(b, { type: "setPagination", defaultLimit: 10, maxLimit: 50 }, "setPagination");
  assert(r2.features?.pagination?.defaultLimit === 10, "pagination mise");
  assertChangedPaths(b, r2, ["features.pagination.defaultLimit", "features.pagination.maxLimit"], "setPagination");
  const r3 = ok(b, { type: "setFeatureRateLimit", perKey: "1000/min" }, "setFeatureRateLimit");
  assert(r3.features?.rateLimit?.perKey === "1000/min", "rateLimit feature mis");
  ko(b, { type: "setPagination", defaultLimit: 100, maxLimit: 10 }, "pagination incohérente");
});

// ════════════════════════════════════════════════════════════════════════════
// 8. authFlows (§2.8)
// ════════════════════════════════════════════════════════════════════════════

test("setAuthFlow — bascule un flow (jwt requis)", () => {
  const b = baseSpec();
  const r = ok(b, { type: "setAuthFlow", flow: "revocation", value: true }, "setAuthFlow");
  assert(r.authFlows?.revocation === true, "flow activé");
  assertChangedPaths(b, r, ["authFlows.revocation"], "setAuthFlow");
  ko(minimalSpec(), { type: "setAuthFlow", flow: "passwordReset", value: true }, "flow sans jwt");
});

// ════════════════════════════════════════════════════════════════════════════
// 9. Env (§2.9)
// ════════════════════════════════════════════════════════════════════════════

test("addEnvVar — ajoute une variable", () => {
  const b = baseSpec();
  const r = ok(b, { type: "addEnvVar", name: "TWILIO_KEY", required: true, description: "Twilio" }, "addEnvVar");
  assert(r.env?.some((e) => e.name === "TWILIO_KEY"), "env ajoutée");
  assertChangedPaths(b, r, ["env[2]"], "addEnvVar");
  ko(b, { type: "addEnvVar", name: "JWT_SECRET" }, "env doublon");
});

test("modifyEnvVar — merge sur une variable existante", () => {
  const b = baseSpec();
  const r = ok(b, { type: "modifyEnvVar", name: "STRIPE_SECRET_KEY", required: true }, "modifyEnvVar");
  assert(r.env?.find((e) => e.name === "STRIPE_SECRET_KEY")?.required === true, "required modifié");
  assertChangedPaths(b, r, ["env[1].required"], "modifyEnvVar");
  ko(b, { type: "modifyEnvVar", name: "GHOST", required: true }, "modify inexistante");
});

test("removeEnvVar — référencée par auth : confirmation requise", () => {
  const b = baseSpec();
  const refused = ko(b, { type: "removeEnvVar", name: "JWT_SECRET" }, "removeEnvVar référencée");
  assert(refused.requiresConfirmation !== undefined, "confirmation requise");
  const r = ok(b, { type: "removeEnvVar", name: "STRIPE_SECRET_KEY" }, "removeEnvVar libre");
  assert(!r.env?.some((e) => e.name === "STRIPE_SECRET_KEY"), "env retirée");
  const r2 = ok(b, { type: "removeEnvVar", name: "JWT_SECRET", confirmed: true }, "removeEnvVar confirmée");
  assert(!r2.env?.some((e) => e.name === "JWT_SECRET"), "env référencée retirée après confirmation");
});

// ════════════════════════════════════════════════════════════════════════════
// 10. Endpoints custom (§2.10)
// ════════════════════════════════════════════════════════════════════════════

test("addCustomEndpoint / removeCustomEndpoint", () => {
  const b = baseSpec();
  const def = { method: "POST" as const, path: "/:id/publish", handler: "publishProduct" };
  const r = ok(b, { type: "addCustomEndpoint", resource: "Product", definition: def }, "addCustomEndpoint");
  assert(r.resources[0].customEndpoints?.some((e) => e.path === "/:id/publish"), "endpoint custom ajouté");
  assertChangedPaths(b, r, [`${PRODUCT}.customEndpoints`], "addCustomEndpoint");
  const r2 = ok(r, { type: "removeCustomEndpoint", resource: "Product", path: "/:id/publish" }, "removeCustomEndpoint");
  assert(r2.resources[0].customEndpoints === undefined, "endpoint custom retiré");
  ko(b, { type: "addCustomEndpoint", resource: "Product", definition: { method: "GET" as const, path: "", handler: "h" } }, "path vide");
  ko(b, { type: "removeCustomEndpoint", resource: "Product", path: "/ghost" }, "endpoint inexistant");
});

// ════════════════════════════════════════════════════════════════════════════
// 11. Le GATE : une opération rendant la spec invalide est REJETÉE
// ════════════════════════════════════════════════════════════════════════════

test("gate — opération produisant une cible de relation inconnue rejetée", () => {
  const b = baseSpec();
  const res = applyOperation(b, { type: "addRelation", from: "Order", to: "Ghost", relationType: "many-to-one" });
  assert(!res.ok, "relation vers cible inconnue rejetée");
});

test("gate — la spec d'origine est préservée quand le gate échoue", () => {
  // Construire une op qui passe les pré-checks mais viole une règle sémantique.
  // setPermissionRule avec ownOnly:true exige JWT — sur une spec sans jwt, le
  // pré-check ne bloque pas (resource existe) mais le gate refuse.
  const noJwt = ok(minimalSpec(), { type: "addRole", name: "user" }, "prep");
  const snap = structuredClone(noJwt);
  const res = applyOperation(noJwt, { type: "setPermissionRule", resource: "Task", role: "user", actions: ["read"], ownOnly: true });
  assert(!res.ok, "op rejetée par le gate");
  assert(deepEqual(noJwt, snap), "spec d'origine intacte après rejet");
});

// ════════════════════════════════════════════════════════════════════════════
// 12. applyOperations — transactionnel (atomicité / rollback)
// ════════════════════════════════════════════════════════════════════════════

test("applyOperations — séquence valide appliquée entièrement", () => {
  const b = minimalSpec();
  const snap = structuredClone(b);
  const res = applyOperations(b, [
    { type: "enableJwt", secretEnv: "JWT_SECRET" },
    { type: "addRole", name: "user" },
    { type: "addField", resource: "Task", field: "userId", fieldType: "uuid", options: { required: true } },
    { type: "addResourceRelation", resource: "Task", target: "User", relationType: "manyToOne", field: "userId", onDelete: "Cascade" },
    { type: "setPermissionRule", resource: "Task", role: "user", actions: ["create", "read", "update"], ownOnly: true },
  ]);
  assert(res.ok, `séquence devait réussir: ${res.ok ? "" : res.error}`);
  assert(deepEqual(b, snap), "spec d'origine non mutée");
  const out = (res as Extract<ApplyResult, { ok: true }>).spec;
  assert(out.auth?.jwt?.enabled === true, "jwt activé");
  assert(out.resources[0].fields.userId !== undefined, "champ userId ajouté");
  assert(out.resources[0].relations?.some((rel) => rel.resource === "User"), "relation ajoutée");
  assert(out.permissions?.some((p) => p.resource === "Task"), "permission ajoutée");
  assert(runValidationGate(out) === null, "spec finale valide");
});

test("applyOperations — rollback total si une opération échoue", () => {
  const b = minimalSpec();
  const snap = structuredClone(b);
  const res = applyOperations(b, [
    { type: "addRole", name: "user" }, // OK
    { type: "addField", resource: "Task", field: "priority", fieldType: "integer" }, // OK
    { type: "setPermissionRule", resource: "Task", role: "user", actions: ["read"], ownOnly: true }, // ÉCHEC (pas de jwt) → gate
    { type: "addRole", name: "vendor" }, // jamais atteint
  ]);
  assert(!res.ok, "la transaction doit échouer");
  assert(/annulée/.test(res.error), "message d'annulation");
  assert(deepEqual(b, snap), "spec d'origine entièrement préservée (rollback)");
});

test("applyOperations — propage requiresConfirmation depuis une op destructive", () => {
  const b = baseSpec();
  const res = applyOperations(b, [
    { type: "addRole", name: "vendor" },
    { type: "removeResource", name: "Product" }, // destructive, non confirmé
  ]);
  assert(!res.ok, "transaction stoppée");
  assert(res.requiresConfirmation !== undefined, "confirmation propagée");
});

test("applyOperations — séquence vide renvoie la spec inchangée", () => {
  const b = baseSpec();
  const res = applyOperations(b, []);
  assert(res.ok, "séquence vide OK");
  assert(deepEqual((res as Extract<ApplyResult, { ok: true }>).spec, b), "spec inchangée");
});

// ════════════════════════════════════════════════════════════════════════════
// 13. Catalogue : couverture complète
// ════════════════════════════════════════════════════════════════════════════

test("catalogue — toutes les opérations déclarées ont une classification danger", () => {
  assert(OPERATION_COUNT >= 50, `nombre d'opérations attendu ≥ 50, obtenu ${OPERATION_COUNT}`);
  const dangers = new Set(Object.values(OPERATION_DANGER));
  assert(dangers.has("safe") && dangers.has("guarded") && dangers.has("destructive"), "3 niveaux de danger présents");
});

// ── Run ─────────────────────────────────────────────────────────────────────

console.log(`\n  Moteur d'opérations — ${OPERATION_COUNT} opérations implémentées\n`);
for (const f of failures) console.log(f);
console.log(
  `\n  ${passed} tests OK, ${failed} échec(s), ${assertions} assertions.\n`,
);
if (failed > 0) process.exit(1);
