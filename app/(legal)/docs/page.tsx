import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation — ZeroAPI",
  description:
    "Tout ce qu'il faut pour générer, héberger et faire évoluer un backend ZeroAPI. Getting started, guides et référence API.",
};

const CARDS = [
  {
    href: "/docs/getting-started",
    title: "Getting Started",
    desc: "Du compte gratuit à ton premier endpoint en ligne — en moins de 5 minutes.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    items: [
      "Créer un compte",
      "Écrire ton premier prompt",
      "Tester avec la console intégrée",
      "Déployer sur Railway en un clic",
    ],
    cta: "Démarrer",
  },
  {
    href: "/docs/guides",
    title: "Guides",
    desc: "Patterns concrets — auth, paiements Mobile Money, RBAC, webhooks, multi-tenant.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    items: [
      "Authentification JWT et OAuth",
      "Intégrer Wave & Orange Money",
      "RBAC fin par rôle et ressource",
      "Webhooks, queues, cron",
    ],
    cta: "Parcourir les guides",
  },
  {
    href: "/docs/api",
    title: "API Reference",
    desc: "Référence complète des endpoints REST exposés par les backends générés.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    items: [
      "Endpoints CRUD générés",
      "Authentification et tokens",
      "Filtres, tri, pagination cursor",
      "Codes erreur HTTP et JSON",
    ],
    cta: "Voir la référence",
  },
];

export default function DocsIndexPage() {
  return (
    <article className="docs-wrap">
      <header className="docs-head">
        <div className="eyebrow-row">Documentation</div>
        <h1>
          Tout pour <em>builder</em> avec ZeroAPI.
        </h1>
        <p>
          Trois entrées : démarrer vite, plonger dans un cas concret, ou chercher un
          endpoint précis. La doc évolue avec le produit — dernière mise à jour le
          26 mai 2026.
        </p>
      </header>

      <div className="docs-grid">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="docs-card">
            <span className="docs-card-icon">{c.icon}</span>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
            <ul>
              {c.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
            <span className="docs-card-link">
              <span>{c.cta}</span>
              <span>→</span>
            </span>
          </Link>
        ))}
      </div>
    </article>
  );
}
