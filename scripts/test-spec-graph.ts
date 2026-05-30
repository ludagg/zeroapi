/**
 * Tests de la dérivation spec → graphe (lib/spec-graph.ts).
 *
 *   pnpm tsx scripts/test-spec-graph.ts
 *
 * Pur, hors-ligne. Prouve, sur une spec e-commerce réelle :
 *   → un nœud par ressource (+ nœuds « système » pour les cibles non-ressources) ;
 *   → champs dérivés avec PK synthétique, FK détectées, enum repérés ;
 *   → badges stateMachine / aggregates / softDelete / timestamps ;
 *   → arêtes depuis relations par-ressource ET top-level, dé-dupliquées ;
 *   → labels 1-1 / 1-N / N-1 / N-N ;
 *   → self-M2M (follow) → arête en boucle (selfLoop) ;
 *   → spec vide → modèle vide ; layout → positions distinctes.
 */

import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { buildSpecGraph, layoutGraph } from "../lib/spec-graph";

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

function ecommerceSpec(): ZeroAPISpec {
  return structuredClone({
    version: "1.0",
    name: "shop",
    resources: [
      {
        name: "Product",
        fields: {
          title: { type: "string", required: true },
          price: { type: "integer", required: true },
          status: { type: "enum", values: ["draft", "published", "archived"] },
        },
        stateMachine: {
          field: "status",
          initial: "draft",
          transitions: [{ from: "draft", to: "published" }],
        },
        aggregates: [{ name: "reviewCount", op: "count", relation: "reviews" }],
        softDelete: true,
        timestamps: true,
      },
      {
        name: "Order",
        fields: {
          userId: { type: "uuid", required: true },
          total: { type: "integer", required: true },
        },
        relations: [
          { type: "manyToOne", resource: "User", field: "userId", onDelete: "Cascade" },
          { type: "manyToOne", resource: "Product", field: "productId" },
        ],
      },
      {
        name: "Member",
        fields: { handle: { type: "string", required: true } },
        relations: [
          {
            type: "manyToMany",
            resource: "Member",
            field: "memberId",
            through: "Follows",
            as: "following",
            reverseAs: "followers",
          },
        ],
      },
    ],
    // Top-level mirror of Order → Product (must be de-duplicated, not doubled).
    relations: [{ from: "Order", to: "Product", type: "many-to-one", field: "productId" }],
  }) as unknown as ZeroAPISpec;
}

test("nœuds — un par ressource + nœud système pour User", () => {
  const { nodes } = buildSpecGraph(ecommerceSpec());
  const names = nodes.map((n) => n.name).sort();
  assert(names.join(",") === "Member,Order,Product,User", `nœuds attendus, obtenu ${names.join(",")}`);
  const user = nodes.find((n) => n.name === "User");
  assert(user?.system === true, "User doit être un nœud système (cible non-ressource)");
  const product = nodes.find((n) => n.name === "Product");
  assert(product?.system === false, "Product est une vraie ressource");
});

test("champs — PK synthétique, FK détectée, enum repéré", () => {
  const { nodes } = buildSpecGraph(ecommerceSpec());
  const order = nodes.find((n) => n.name === "Order")!;
  assert(order.fields[0].name === "id" && order.fields[0].kind === "pk", "première colonne = id (PK)");
  const userId = order.fields.find((f) => f.name === "userId")!;
  assert(userId.kind === "fk", "userId doit être détecté comme FK (relation.field)");

  const product = nodes.find((n) => n.name === "Product")!;
  const status = product.fields.find((f) => f.name === "status")!;
  assert(status.kind === "enum" && status.type.startsWith("enum"), "status doit être un enum");
});

test("badges — stateMachine, aggregates, softDelete, timestamps", () => {
  const { nodes } = buildSpecGraph(ecommerceSpec());
  const product = nodes.find((n) => n.name === "Product")!;
  assert(product.badges.stateMachine, "Product a une stateMachine");
  assert(product.badges.aggregates === 1, "Product a 1 agrégat");
  assert(product.badges.softDelete, "Product a softDelete");
  assert(product.badges.timestamps, "Product a timestamps");
  const order = nodes.find((n) => n.name === "Order")!;
  assert(!order.badges.stateMachine && order.badges.aggregates === 0, "Order n'a pas de badges");
});

test("arêtes — relations + labels + dé-duplication top-level/par-ressource", () => {
  const { edges } = buildSpecGraph(ecommerceSpec());
  const orderUser = edges.find((e) => e.source === "Order" && e.target === "User");
  assert(orderUser?.label === "N-1", "Order → User doit être N-1");

  // Order → Product décrit en per-resource ET en top-level (même field) → 1 seule arête.
  const orderProduct = edges.filter((e) => e.source === "Order" && e.target === "Product");
  assert(orderProduct.length === 1, `Order → Product ne doit pas être dupliqué, obtenu ${orderProduct.length}`);
});

test("self-M2M — Member → Member en boucle (selfLoop, N-N)", () => {
  const { edges } = buildSpecGraph(ecommerceSpec());
  const self = edges.find((e) => e.source === "Member" && e.target === "Member");
  assert(self, "une arête Member → Member doit exister");
  assert(self!.selfLoop === true, "elle doit être marquée selfLoop");
  assert(self!.label === "N-N", "self-M2M doit être labellisée N-N");
});

test("spec vide / sans ressources → modèle vide", () => {
  assert(buildSpecGraph(null).nodes.length === 0, "null → 0 nœud");
  const empty = { version: "1.0", name: "x", resources: [] } as unknown as ZeroAPISpec;
  const m = buildSpecGraph(empty);
  assert(m.nodes.length === 0 && m.edges.length === 0, "resources vide → modèle vide");
});

test("layout — positions distinctes (pas tous empilés)", () => {
  const { nodes } = buildSpecGraph(ecommerceSpec());
  const pos = layoutGraph(nodes);
  assert(pos.size === nodes.length, "une position par nœud");
  const keys = new Set([...pos.values()].map((p) => `${p.x},${p.y}`));
  assert(keys.size === nodes.length, "toutes les positions doivent être distinctes");
});

console.log(`\nspec → graphe — ${passed} passés, ${failed} échoués, ${assertions} assertions.`);
if (failures.length) {
  console.log("\n" + failures.join("\n\n"));
  process.exit(1);
}
process.exit(0);
