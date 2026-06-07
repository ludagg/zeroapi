"use client";

import { useRef, useState } from "react";
import { Reveal } from "@/components/landing/reveal";

const ITEMS = [
  {
    q: "Qu'est-ce que ZeroAPI exactement ?",
    a: "ZeroAPI génère des backends complets à partir d'une conversation. Tu discutes avec Kia, notre architecte d'API : elle pose des questions, construit une spec structurée en direct, puis on génère le code Hono.js correspondant — routes, modèles, validations, tests Vitest, docs OpenAPI et SDK TypeScript. Le résultat est un projet complet, prêt à déployer ou à éditer dans ton IDE.",
  },
  {
    q: "Pourquoi une conversation plutôt qu'un simple prompt ?",
    a: "Un backend sérieux a des détails qui comptent : rôles, relations, règles métier, cas limites. Au lieu de deviner à partir d'une seule phrase, Kia te pose les bonnes questions et affine la spec ressource par ressource — tu la vois se construire à mesure que tu réponds. Tu peux écrire en français, anglais ou pidgin, et modifier la spec en continuant simplement à parler.",
  },
  {
    q: "C'est quoi la génération asynchrone ?",
    a: "Quand tu lances la génération, on met le job en file et on te libère immédiatement. Tu peux fermer ton navigateur, couper ta connexion, partir manger — le job continue côté serveur. Quand c'est prêt, tu reçois une notification (email, push web, ou webhook Slack/Discord) avec un lien direct vers ton API. Particulièrement utile sur connexions lentes ou instables.",
  },
  {
    q: "Le playground et la marketplace, ça sert à quoi ?",
    a: "Le playground est un client HTTP intégré : tu testes chaque endpoint de ton API (params, body, en-têtes, auth) directement dans le navigateur et tu vois la réponse, le status et la latence. La marketplace te laisse partir d'un template — officiel ou créé par la communauté — au lieu d'une page blanche, et publier les tiens en privé (ton équipe) ou en public.",
  },
  {
    q: "Quelle IA fait la génération ?",
    a: "Plusieurs. ZeroAPI route les requêtes entre Claude, Mistral et Gemini selon ton plan, avec bascule automatique si un fournisseur tombe. Les plans gratuits utilisent Mistral et Gemini ; Claude premium est réservé aux plans Pro et au-dessus. Tu n'es jamais bloqué sur un seul modèle.",
  },
  {
    q: "Puis-je exporter et modifier le code généré ?",
    a: "Oui, à 100 %. Le code est à toi — même sur le plan gratuit. Tu obtiens un repo Git avec un projet Hono.js standard, sans dépendance propriétaire ZeroAPI, plus les exports Dev Mode (OpenAPI, SDK, Postman, Prisma, ZIP). Tu peux le cloner, l'éditer, le déployer où tu veux. Aucun vendor lock-in.",
  },
  {
    q: "Quelles garanties de sécurité ?",
    a: "Chaque API générée intègre : authentification JWT et OAuth, RBAC, rate limiting, validation Zod sur toutes les entrées, échappement contre XSS et SQL injection, en-têtes Helmet, CORS configuré, et tests automatiques. La spec passe par une validation stricte avant génération. Sur les plans payants, audit log et SSO sont disponibles.",
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
          <p>Si tu en as une autre, écris-nous : bonjour@zeroapi.app.</p>
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
