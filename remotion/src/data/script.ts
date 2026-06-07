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

/**
 * "En production" dashboard data (scene 4). A coherent snapshot of the
 * generated backend running live — nothing here is random, it ties back to
 * the booking API the user described.
 */

/** Requests/min time-series — a believable ramp that settles high. */
export const REQ_SERIES = [
  120, 180, 240, 360, 520, 700, 980, 1300, 1750, 2300, 3100, 4200, 5400,
  6800, 8100, 9200, 10100, 10800, 11400, 11900, 12100, 12300, 12350, 12400,
] as const;

export const REQ_PEAK = 12400;

/** Endpoints per resource (sums to ENDPOINTS_TOTAL = 24). */
export const ENDPOINTS_BY_MODEL = [
  { label: "Réservation", value: 7 },
  { label: "Paiement", value: 5 },
  { label: "User", value: 5 },
  { label: "Trajet", value: 4 },
  { label: "Siège", value: 3 },
] as const;

/** Headline KPIs shown as counters. */
export const PROD_KPIS = [
  { value: 99.98, label: "disponibilité", suffix: " %", decimals: 2 },
  { value: 42, label: "latence p95", suffix: " ms", decimals: 0 },
  { value: 100, label: "tests verts", suffix: " %", decimals: 0 },
] as const;

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
