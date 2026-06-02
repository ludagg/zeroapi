/**
 * Marketplace categories (plain data, safe to import from client components).
 * Kept in sync with the categories used by the official templates.
 */
export const TEMPLATE_CATEGORIES = [
  "Blog",
  "E-commerce",
  "Réservation",
  "Livraison",
  "Paiements",
  "Social",
  "SaaS",
  "API",
  "Autre",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];
