"use client";

import { useRef, useState } from "react";
import { Reveal } from "@/components/landing/reveal";

const ITEMS = [
  {
    q: "Qu'est-ce que ZeroAPI exactement ?",
    a: "ZeroAPI est un générateur de backends asynchrone. Tu décris ton API en langage naturel ; on produit une spec structurée, puis on génère le code Hono.js correspondant — routes, modèles, validations, tests, docs OpenAPI. Le résultat est un projet TypeScript complet, prêt à déployer ou à éditer dans ton IDE.",
  },
  {
    q: "Pourquoi asynchrone ? Comment ça marche concrètement ?",
    a: "Générer un backend sérieux prend du temps : raisonnement IA, génération de code, exécution des tests, build. Plutôt que de te faire attendre 2 à 5 minutes devant un spinner, ZeroAPI met le job en file et te libère immédiatement. Tu peux fermer ton navigateur, couper ta connexion, partir manger. Quand le job est terminé, tu reçois une notification (email, push web, ou webhook Slack/Discord) avec un lien direct vers ton API. Particulièrement utile sur connexions lentes ou instables.",
  },
  {
    q: "Puis-je exporter et modifier le code généré ?",
    a: "Oui, à 100 %. Le code généré est à toi — même sur le plan gratuit. Tu obtiens un repo Git avec un projet Hono.js standard, sans dépendance propriétaire ZeroAPI. Tu peux le cloner, l'éditer, le déployer où tu veux. Aucun vendor lock-in.",
  },
  {
    q: "Quelles garanties de sécurité ?",
    a: "Chaque API générée intègre : authentification JWT et OAuth, RBAC, rate limiting, validation Zod sur toutes les entrées, échappement contre XSS et SQL injection, en-têtes Helmet, CORS configuré, et tests de sécurité automatiques. La spec passe par une revue statique avant génération. Sur les plans payants, audit log et SSO SAML sont disponibles.",
  },
  {
    q: "Support et communauté ?",
    a: "Discord communautaire ouvert à tous, docs en français et anglais. Support email pour les utilisateurs Pro (24 h) et canal Slack dédié pour Business. L'équipe est basée à Dakar et Abidjan — on parle français, anglais, wolof et lingala.",
  },
  {
    q: "Le paiement par Mobile Money est-il disponible ?",
    a: "Pas encore — intégration Orange Money, Wave, MTN MoMo et Moov Money prévue d'ici la fin du trimestre. En attendant : carte bancaire, Stripe, virement SEPA et virement local CFA (sur demande).",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);
  const maxHeight = open ? innerRef.current?.scrollHeight ?? 0 : 0;

  return (
    <div className={`faq-item${open ? " open" : ""}`}>
      <button
        type="button"
        className="faq-q"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{q}</span>
        <span className="plus" aria-hidden="true" />
      </button>
      <div className="faq-a" style={{ maxHeight: `${maxHeight}px` }}>
        <div className="faq-a-inner" ref={innerRef}>
          {a}
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  return (
    <section id="faq">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">FAQ</span>
          <h2 className="display">
            Questions <em>légitimes</em>.
          </h2>
          <p>Si tu en as une autre, écris-nous : bonjour@zeroapi.io.</p>
        </Reveal>

        <Reveal as="div" className="faq-wrap">
          {ITEMS.map((it) => (
            <FAQItem key={it.q} q={it.q} a={it.a} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
