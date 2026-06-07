/**
 * Use-case grid (scene 6) — shows ZeroAPI generalises far past the bus-booking
 * demo. Each domain lists the resources Kia would actually scaffold, so it
 * reads as concrete, not slideware.
 */
export type IconKey = "bag" | "card" | "truck" | "ticket" | "layers" | "heart";

export const USE_CASES: { icon: IconKey; title: string; models: string[] }[] = [
  { icon: "bag", title: "E-commerce", models: ["Produit", "Panier", "Commande", "Paiement"] },
  { icon: "card", title: "Fintech", models: ["Compte", "Transaction", "KYC", "Wallet"] },
  { icon: "truck", title: "Logistique", models: ["Colis", "Tournée", "Entrepôt", "Tracking"] },
  { icon: "ticket", title: "Réservation", models: ["Trajet", "Siège", "Billet", "Paiement"] },
  { icon: "layers", title: "SaaS B2B", models: ["Org", "Membre", "Abonnement", "Webhook"] },
  { icon: "heart", title: "Santé", models: ["Patient", "RDV", "Dossier", "Ordonnance"] },
];
