/**
 * Verbatim French conversation from the landing hero
 * (components/landing/hero.tsx) plus the live-spec data, so the promo
 * reproduces the real /generate experience.
 */

export type ChatStep =
  | { kind: "user"; text: string }
  | { kind: "kia"; text: string };

export const CHAT: ChatStep[] = [
  {
    kind: "user",
    text: "API pour une app de réservation de bus interurbain en Côte d'Ivoire. Wave + Orange Money.",
  },
  {
    kind: "kia",
    text: "Compris. Je pars sur Trajet, Siège, Réservation, Paiement et User. Qui réserve : un compte client, ou aussi des guichets ?",
  },
  {
    kind: "user",
    text: "Client + guichet. Et un rôle admin pour la compagnie.",
  },
  {
    kind: "kia",
    text: "Parfait — RBAC client / guichet / admin, JWT, et webhooks Wave + Orange Money. La spec est prête. On lance ?",
  },
];

/** Resources that populate the "Spec en direct" panel, in reveal order. */
export const RESOURCES = [
  "User",
  "Trajet",
  "Siège",
  "Réservation",
  "Paiement",
] as const;

export const ENDPOINTS_TOTAL = 24;

/** Deliverables that cascade in during the generation scene. */
export const DELIVERABLES = [
  { label: "Code Hono.js", sub: "routes + handlers" },
  { label: "Tests Vitest", sub: "couverture auto" },
  { label: "OpenAPI 3.1", sub: "docs interactives" },
  { label: "SDK TypeScript", sub: "typé de bout en bout" },
  { label: "Schéma Prisma", sub: "migrations incluses" },
  { label: "Collection Postman", sub: "prête à tester" },
] as const;

/** Punchy value props for scene 4. */
export const VALUE_PROPS = [
  { label: "Multi-IA", sub: "Claude · Mistral · Gemini, avec failover" },
  { label: "Mobile Money", sub: "Wave · Orange Money, intégrés" },
  { label: "Code 100 % exportable", sub: "tu possèdes ton backend" },
  { label: "Déploie partout", sub: "aucun vendor lock-in" },
] as const;

/** Short Hono route typed out in the code block (scene 3). */
export const CODE_SNIPPET = `app.post(
  "/reservations",
  zValidator("json", reservationSchema),
  authGuard(["client", "guichet"]),
  async (c) => {
    const data = c.req.valid("json");
    const resa = await db.reservation.create({ data });
    return c.json(resa, 201);
  },
);`;
