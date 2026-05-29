/**
 * Tests de l'AGENT de modification de spec (lib/agent/).
 *
 *   pnpm tsx scripts/test-spec-agent.ts
 *
 * Le LLM est INJECTÉ via un mock scripté (`MockModel`) — aucun réseau, aucune
 * clé. On prouve que, sur une spec réelle :
 *   - "ajoute une ressource X" → l'agent émet addResource, SEULE X est ajoutée ;
 *   - "ajoute un champ Y à X" → addField ciblé ;
 *   - "ajoute une relation entre X et Z" → addRelation ;
 *   - une demande destructive → l'agent DEMANDE confirmation (n'exécute pas) ;
 *   - une demande invalide/impossible → la spec d'origine est préservée ;
 *   - robustesse : appel d'outil malformé, erreur modèle, boucle bornée.
 */

import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import {
  runSpecAgent,
  confirmAndApply,
  OPERATION_TOOLS,
  toolUseToOperation,
  type AgentAssistantBlock,
  type AgentMessage,
  type AgentToolResultBlock,
  type ModelResponse,
  type ToolCallingModel,
} from "../lib/agent/index.js";
import { OPERATION_DANGER } from "../lib/operations/index.js";

// ── Harness ───────────────────────────────────────────────────────────────

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

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => k in b && deepEqual(a[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

// ── Scripted mock model ───────────────────────────────────────────────────

let idSeq = 0;
const text = (t: string): AgentAssistantBlock => ({ type: "text", text: t });
const toolUse = (name: string, input: unknown): AgentAssistantBlock => ({
  type: "tool_use",
  id: `tu_${idSeq++}`,
  name,
  input,
});
const resp = (...content: AgentAssistantBlock[]): ModelResponse => ({
  content,
  usage: { inputTokens: 10, outputTokens: 5 },
});

/** Returns the scripted responses in order; records every call it received. */
class MockModel implements ToolCallingModel {
  readonly calls: Array<{ system: string; messages: AgentMessage[] }> = [];
  constructor(private readonly script: ModelResponse[]) {}
  async generate(input: { system: string; messages: AgentMessage[] }): Promise<ModelResponse> {
    this.calls.push({ system: input.system, messages: input.messages });
    const next = this.script.shift();
    if (!next) throw new Error("MockModel: script épuisé");
    return next;
  }
}

/** Always returns the same response (for the max-iterations test). */
class RepeatModel implements ToolCallingModel {
  count = 0;
  constructor(private readonly r: ModelResponse) {}
  async generate(): Promise<ModelResponse> {
    this.count++;
    return this.r;
  }
}

/** Throws on generate (transport failure). */
class ThrowingModel implements ToolCallingModel {
  async generate(): Promise<ModelResponse> {
    throw new Error("503 service indisponible");
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────

function baseSpec(): ZeroAPISpec {
  return structuredClone({
    version: "1.0",
    name: "shop",
    description: "Boutique",
    resources: [
      {
        name: "Product",
        fields: { title: { type: "string", required: true }, price: { type: "integer", required: true, min: 0 } },
        endpoints: ["list", "create", "read", "update", "delete"],
      },
      {
        name: "Order",
        fields: { userId: { type: "uuid", required: true }, total: { type: "integer", required: true } },
      },
    ],
  }) as unknown as ZeroAPISpec;
}

/** Base spec where Product is referenced by Order — removing it needs cascade. */
function specWithRef(): ZeroAPISpec {
  const s = baseSpec();
  s.resources[1].relations = [{ type: "manyToOne", resource: "Product", field: "userId" }];
  return s;
}

/** Collects every tool_result fed back to the model across the conversation. */
function allToolResults(m: MockModel): AgentToolResultBlock[] {
  // The agent mutates one shared messages array, so the last call holds the
  // full transcript. Gather all user messages whose content is a tool_result
  // batch.
  const msgs = m.calls.length ? m.calls[m.calls.length - 1].messages : [];
  const out: AgentToolResultBlock[] = [];
  for (const msg of msgs) {
    if (msg.role === "user" && Array.isArray(msg.content)) out.push(...msg.content);
  }
  return out;
}

async function main() {
// ════════════════════════════════════════════════════════════════════════════
// 1. "ajoute une ressource X" → addResource, seule X ajoutée
// ════════════════════════════════════════════════════════════════════════════

await test("ajoute une ressource → addResource ciblé, reste intact", async () => {
  const spec = baseSpec();
  const snap = structuredClone(spec);
  const model = new MockModel([
    resp(
      text("J'ajoute la ressource Avis."),
      toolUse("addResource", {
        name: "Avis",
        fields: { note: { type: "integer", min: 1, max: 5, required: true }, comment: { type: "text" } },
      }),
    ),
    resp(text("Ressource Avis ajoutée avec une note de 1 à 5.")),
  ]);

  const r = await runSpecAgent({ model, spec, userMessage: "ajoute une table Avis avec une note de 1 à 5" });

  assert(r.status === "applied", `status applied (obtenu ${r.status})`);
  assert(r.operations.length === 1 && r.operations[0].type === "addResource", "une opération addResource émise");
  assert(r.spec.resources.length === 3, "3 ressources");
  const avis = r.spec.resources.find((x) => x.name === "Avis");
  assert(avis?.fields.note?.type === "integer" && avis?.fields.note?.min === 1 && avis?.fields.note?.max === 5, "champ note 1..5");
  // Non-régression : les deux ressources d'origine sont identiques.
  assert(deepEqual(r.spec.resources.slice(0, 2), snap.resources), "ressources d'origine inchangées");
  assert(r.spec.name === "shop" && r.spec.description === "Boutique", "méta inchangée");
  // Immuabilité de l'entrée.
  assert(deepEqual(spec, snap), "spec d'origine non mutée");
  // Le modèle a bien reçu les 55 outils.
  assert(OPERATION_TOOLS.length === 55, "55 outils exposés");
  assert(r.assistantMessage.includes("Avis"), "message final résume le changement");
});

// ════════════════════════════════════════════════════════════════════════════
// 2. "ajoute un champ Y à X" → addField ciblé
// ════════════════════════════════════════════════════════════════════════════

await test("ajoute un champ → addField ciblé, autres champs/ressources intacts", async () => {
  const spec = baseSpec();
  const snap = structuredClone(spec);
  const model = new MockModel([
    resp(toolUse("addField", { resource: "Product", field: "sku", fieldType: "string", options: { required: true } })),
    resp(text("Champ sku ajouté à Product.")),
  ]);

  const r = await runSpecAgent({ model, spec, userMessage: "ajoute un champ sku à Product" });

  assert(r.status === "applied", "status applied");
  assert(r.operations.length === 1 && r.operations[0].type === "addField", "addField émis");
  const product = r.spec.resources.find((x) => x.name === "Product")!;
  assert(product.fields.sku?.type === "string" && product.fields.sku?.required === true, "champ sku ajouté");
  // Champs d'origine intacts + Order intact.
  assert(product.fields.title !== undefined && product.fields.price !== undefined, "champs existants conservés");
  assert(deepEqual(r.spec.resources[1], snap.resources[1]), "Order inchangé");
  assert(deepEqual(spec, snap), "spec d'origine non mutée");
});

// ════════════════════════════════════════════════════════════════════════════
// 3. "ajoute une relation entre X et Z" → addRelation
// ════════════════════════════════════════════════════════════════════════════

await test("ajoute une relation → addRelation", async () => {
  const spec = baseSpec();
  const snap = structuredClone(spec);
  const model = new MockModel([
    resp(toolUse("addRelation", { from: "Order", to: "Product", relationType: "many-to-one", field: "userId" })),
    resp(text("Relation Order → Product ajoutée.")),
  ]);

  const r = await runSpecAgent({ model, spec, userMessage: "relie chaque Order à un Product" });

  assert(r.status === "applied", "status applied");
  assert(r.operations.length === 1 && r.operations[0].type === "addRelation", "addRelation émis");
  assert((r.spec.relations ?? []).some((rel) => rel.from === "Order" && rel.to === "Product"), "relation présente");
  assert(deepEqual(r.spec.resources, snap.resources), "ressources inchangées");
  assert(deepEqual(spec, snap), "spec d'origine non mutée");
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Plusieurs opérations en un tour → transaction atomique
// ════════════════════════════════════════════════════════════════════════════

await test("plusieurs opérations en un tour → appliquées ensemble", async () => {
  const spec = baseSpec();
  const model = new MockModel([
    resp(
      toolUse("addField", { resource: "Order", field: "status", fieldType: "enum", options: { values: ["pending", "paid"] } }),
      toolUse("addField", { resource: "Order", field: "ref", fieldType: "string" }),
    ),
    resp(text("Deux champs ajoutés à Order.")),
  ]);

  const r = await runSpecAgent({ model, spec, userMessage: "ajoute status (enum) et ref à Order" });

  assert(r.status === "applied", "status applied");
  assert(r.operations.length === 2, "deux opérations appliquées");
  const order = r.spec.resources.find((x) => x.name === "Order")!;
  assert(order.fields.status?.type === "enum" && order.fields.ref?.type === "string", "deux champs présents");
});

// ════════════════════════════════════════════════════════════════════════════
// 5. Demande destructive → l'agent DEMANDE confirmation (n'exécute pas)
// ════════════════════════════════════════════════════════════════════════════

await test("opération destructive → confirmation demandée, spec inchangée", async () => {
  const spec = specWithRef();
  const snap = structuredClone(spec);
  const model = new MockModel([
    resp(text("Je vais supprimer Product."), toolUse("removeResource", { name: "Product" })),
  ]);

  const r = await runSpecAgent({ model, spec, userMessage: "supprime la table Product" });

  assert(r.status === "needs_confirmation", `status needs_confirmation (obtenu ${r.status})`);
  assert(deepEqual(r.spec, snap), "spec inchangée tant que non confirmée");
  assert(deepEqual(spec, snap), "spec d'origine non mutée");
  assert(r.operations.length === 0, "aucune opération appliquée");
  assert((r.confirmation?.impact.length ?? 0) >= 1, "impact calculé et remonté");
  assert(
    r.confirmation?.pendingOperations.some((o) => o.type === "removeResource"),
    "opération en attente exposée pour confirmation",
  );
  // L'agent n'a pas auto-confirmé : aucun appel n'a passé confirmed:true.
  assert(r.confirmation?.pendingOperations.every((o) => !("confirmed" in o)), "l'agent n'a pas auto-confirmé");

  // Flux de confirmation explicite : l'utilisateur approuve → application.
  const confirmed = confirmAndApply(spec, r.confirmation!.pendingOperations);
  assert(confirmed.ok, "application après confirmation réussit");
  assert(confirmed.ok && !confirmed.spec.resources.some((x) => x.name === "Product"), "Product supprimé après confirmation");
});

// ════════════════════════════════════════════════════════════════════════════
// 6. Demande invalide/impossible → spec préservée, erreur renvoyée au modèle
// ════════════════════════════════════════════════════════════════════════════

await test("opération invalide → rejetée, spec préservée, erreur renvoyée au LLM", async () => {
  const spec = baseSpec();
  const snap = structuredClone(spec);
  const model = new MockModel([
    resp(toolUse("addRelation", { from: "Order", to: "Ghost", relationType: "many-to-one" })),
    resp(text("Désolé, la ressource Ghost n'existe pas, je n'ai rien modifié.")),
  ]);

  const r = await runSpecAgent({ model, spec, userMessage: "relie Order à Ghost" });

  assert(r.status === "no_change", `status no_change (obtenu ${r.status})`);
  assert(r.operations.length === 0, "aucune opération appliquée");
  assert(deepEqual(r.spec, snap), "spec préservée");
  assert(deepEqual(spec, snap), "spec d'origine non mutée");
  // L'erreur a bien été renvoyée au modèle (tour 2) sous forme de tool_result.
  const results = allToolResults(model);
  assert(results.some((tr) => tr.is_error && /inconnue|Ghost/.test(tr.content)), "erreur de validation renvoyée au LLM");
});

// ════════════════════════════════════════════════════════════════════════════
// 7. Appel d'outil malformé → géré, spec préservée
// ════════════════════════════════════════════════════════════════════════════

await test("appel d'outil inconnu → géré sans casser, erreur renvoyée", async () => {
  const spec = baseSpec();
  const snap = structuredClone(spec);
  const model = new MockModel([
    resp(toolUse("frobnicate", { foo: 1 })),
    resp(text("Je ne peux pas faire cela.")),
  ]);

  const r = await runSpecAgent({ model, spec, userMessage: "fais un truc impossible" });

  assert(r.status === "no_change", "status no_change");
  assert(deepEqual(spec, snap), "spec d'origine non mutée");
  const results = allToolResults(model);
  assert(results.some((tr) => tr.is_error && /inconnu/i.test(tr.content)), "outil inconnu signalé au LLM");
});

await test("argument d'outil non-objet → géré", async () => {
  const spec = baseSpec();
  const model = new MockModel([
    resp(toolUse("addRole", "pas-un-objet")),
    resp(text("ok")),
  ]);
  const r = await runSpecAgent({ model, spec, userMessage: "x" });
  assert(r.status === "no_change", "non-objet géré → no_change");
});

// ════════════════════════════════════════════════════════════════════════════
// 8. Robustesse : erreur modèle + boucle bornée
// ════════════════════════════════════════════════════════════════════════════

await test("erreur de transport du modèle → status error, spec préservée", async () => {
  const spec = baseSpec();
  const snap = structuredClone(spec);
  const r = await runSpecAgent({ model: new ThrowingModel(), spec, userMessage: "ajoute X" });
  assert(r.status === "error", "status error");
  assert(r.error !== undefined && /503/.test(r.error), "message d'erreur propagé");
  assert(deepEqual(spec, snap), "spec préservée");
});

await test("boucle bornée → max_iterations sans casser la spec", async () => {
  const spec = baseSpec();
  const snap = structuredClone(spec);
  // Le modèle insiste avec une opération toujours invalide (nom de rôle vide).
  const model = new RepeatModel(resp(toolUse("addRole", { name: "" })));
  const r = await runSpecAgent({ model, spec, userMessage: "boucle", maxIterations: 3 });
  assert(r.status === "max_iterations", `status max_iterations (obtenu ${r.status})`);
  assert(model.count === 3, "borne d'itérations respectée");
  assert(r.operations.length === 0 && deepEqual(spec, snap), "spec préservée");
});

await test("modèle qui répond sans outil → no_change", async () => {
  const spec = baseSpec();
  const model = new MockModel([resp(text("Bonjour, que veux-tu modifier ?"))]);
  const r = await runSpecAgent({ model, spec, userMessage: "salut" });
  assert(r.status === "no_change", "no_change quand aucun outil n'est appelé");
  assert(r.assistantMessage.includes("Bonjour"), "message conservé");
});

// ════════════════════════════════════════════════════════════════════════════
// 9. Catalogue d'outils
// ════════════════════════════════════════════════════════════════════════════

await test("catalogue : 55 outils, noms = opérations, aucun n'expose 'confirmed'", () => {
  assert(OPERATION_TOOLS.length === 55, `55 outils (obtenu ${OPERATION_TOOLS.length})`);
  const toolNames = new Set(OPERATION_TOOLS.map((t) => t.name));
  const opNames = new Set(Object.keys(OPERATION_DANGER));
  assert(toolNames.size === opNames.size, "même nombre de noms");
  for (const n of opNames) assert(toolNames.has(n as never), `outil manquant pour l'opération ${n}`);
  for (const t of OPERATION_TOOLS) {
    assert(!("confirmed" in t.input_schema.properties), `${t.name} ne doit pas exposer 'confirmed'`);
    assert(t.input_schema.type === "object", `${t.name} input_schema est un objet`);
    for (const req of t.input_schema.required ?? []) {
      assert(req in t.input_schema.properties, `${t.name}: '${req}' requis doit être déclaré`);
    }
  }
});

await test("toolUseToOperation : conversion + garde-fous", () => {
  const ok = toolUseToOperation("addRole", { name: "vendor" });
  assert(ok.ok && ok.operation.type === "addRole", "conversion correcte");
  const bad = toolUseToOperation("nope", {});
  assert(!bad.ok, "outil inconnu rejeté");
  const arrInput = toolUseToOperation("addRole", ["x"]);
  assert(!arrInput.ok, "input tableau rejeté");
  // 'confirmed' injecté est retiré.
  const stripped = toolUseToOperation("removeResource", { name: "X", confirmed: true });
  assert(stripped.ok && !("confirmed" in stripped.operation), "'confirmed' retiré de l'opération");
});

// ── Run ─────────────────────────────────────────────────────────────────────

console.log(`\n  Agent de modification de spec — mock model, ${OPERATION_TOOLS.length} outils\n`);
for (const f of failures) console.log(f);
console.log(`\n  ${passed} tests OK, ${failed} échec(s), ${assertions} assertions.\n`);
if (failed > 0) process.exit(1);
}

void main();
