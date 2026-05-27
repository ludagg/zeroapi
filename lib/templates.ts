export type Template = {
  id: string;
  emoji: string;
  name: string;
  prompt: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "ecommerce-momo",
    emoji: "🛒",
    name: "E-commerce Mobile Money",
    prompt:
      "API e-commerce avec produits, commandes, paiement MTN MoMo et Orange Money, gestion des livraisons. Auth JWT + rôles admin/client. Rate limit 120 req/min.",
  },
  {
    id: "delivery",
    emoji: "🚗",
    name: "Application de livraison",
    prompt:
      "API de livraison avec restaurants, livreurs, commandes en temps réel, tracking GPS et notifications SMS. Rôles admin/restaurant/livreur/client.",
  },
  {
    id: "saas-b2b",
    emoji: "💼",
    name: "SaaS B2B multi-tenant",
    prompt:
      "API SaaS multi-tenant avec workspaces, membres, abonnements, facturation Stripe, webhooks et portail admin. Auth JWT + RBAC owner/admin/member.",
  },
  {
    id: "lms",
    emoji: "📚",
    name: "Plateforme LMS",
    prompt:
      "API e-learning avec cours, leçons, quiz, certificats, progression et paiements. Rôles teacher/student/admin.",
  },
  {
    id: "medical",
    emoji: "🏥",
    name: "Réservation médicale",
    prompt:
      "API de réservation avec médecins, patients, rendez-vous, ordonnances et dossiers médicaux. Auth JWT + RBAC doctor/patient/admin.",
  },
  {
    id: "hotel",
    emoji: "🏨",
    name: "Gestion hôtelière",
    prompt:
      "API hôtel avec chambres, réservations, check-in/check-out, paiements et services. Rôles admin/staff/client.",
  },
];
