import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Templates — ZeroAPI",
  description:
    "Galerie de backends prêts à cloner — e-commerce mobile money, marketplace, réservation, chat, CRM, SaaS.",
};

type Template = {
  slug: string;
  name: string;
  category: string;
  glyph: string;
  blurb: string;
  tags: string[];
  endpoints: number;
  generations: string;
  rating: string;
};

const TEMPLATES: Template[] = [
  {
    slug: "ecommerce-mobile-money",
    name: "E-commerce Mobile Money",
    category: "Commerce",
    glyph: "🛒",
    blurb:
      "Boutique en ligne avec Wave, Orange Money et MTN MoMo. Gestion stock, livraisons et coupons promo.",
    tags: ["Wave", "OM", "MTN", "Stripe", "stock"],
    endpoints: 38,
    generations: "1 240",
    rating: "4.8",
  },
  {
    slug: "marketplace",
    name: "Marketplace multi-vendeurs",
    category: "Commerce",
    glyph: "🏪",
    blurb:
      "Plateforme à plusieurs vendeurs avec commission automatique, KYC vendeur et système de litige.",
    tags: ["multi-tenant", "KYC", "litiges", "commission"],
    endpoints: 52,
    generations: "640",
    rating: "4.7",
  },
  {
    slug: "transport-reservation",
    name: "Réservation interurbaine",
    category: "Mobilité",
    glyph: "🚌",
    blurb:
      "Réservation de sièges, trajets récurrents, billet QR code, suivi GPS chauffeur, paiement Mobile Money.",
    tags: ["réservation", "QR", "GPS", "FCFA"],
    endpoints: 28,
    generations: "510",
    rating: "4.9",
  },
  {
    slug: "chat-realtime",
    name: "Chat temps réel",
    category: "Social",
    glyph: "💬",
    blurb:
      "Salons publics et privés, presence, typing indicator, modération, push web. WebSocket sécurisé.",
    tags: ["WS", "presence", "modération", "push"],
    endpoints: 24,
    generations: "830",
    rating: "4.6",
  },
  {
    slug: "crm",
    name: "CRM petite équipe",
    category: "Business",
    glyph: "📇",
    blurb:
      "Pipeline commercial avec leads, deals, tâches, notes et historique d&apos;interactions. Vue Kanban.",
    tags: ["pipeline", "kanban", "notes", "RBAC"],
    endpoints: 33,
    generations: "390",
    rating: "4.5",
  },
  {
    slug: "saas-multi-tenant",
    name: "SaaS multi-tenant",
    category: "Business",
    glyph: "⚡",
    blurb:
      "Squelette SaaS B2B : workspaces, invitations, rôles, billing récurrent Stripe, audit log.",
    tags: ["SaaS", "billing", "audit", "invitations"],
    endpoints: 46,
    generations: "1 080",
    rating: "4.8",
  },
];

export default function TemplatesPage() {
  return (
    <article className="templates-wrap">
      <header className="templates-head">
        <div className="eyebrow-row">Templates</div>
        <h1>
          Démarre <em>plus vite</em>.
        </h1>
        <p>
          Six backends qu&apos;on a peaufinés — schémas, routes, tests, prompts. Clone,
          ajuste, déploie. Tu pars d&apos;un base qui tient en prod, pas d&apos;une
          feuille blanche.
        </p>
      </header>

      <div className="templates-grid">
        {TEMPLATES.map((t) => (
          <div key={t.slug} className="tpl-card">
            <div className="tpl-card-preview">
              <div className="tpl-card-glyph" aria-hidden>
                {t.glyph}
              </div>
            </div>
            <div className="tpl-card-body">
              <div className="tpl-card-head">
                <h3>{t.name}</h3>
                <span className="tpl-card-meta">{t.category}</span>
              </div>
              <p>{t.blurb}</p>
              <div className="tpl-card-tags">
                {t.tags.map((tag) => (
                  <span key={tag} className="tpl-card-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="tpl-card-foot">
              <div className="tpl-card-stats">
                <span>{t.endpoints} endpoints</span>
                <span>★ {t.rating}</span>
              </div>
              <Link
                href={`/register?template=${t.slug}`}
                className="tpl-card-use"
              >
                Utiliser <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          textAlign: "center",
          marginTop: 56,
          fontFamily: "var(--font-mono), monospace",
          fontSize: 13,
          color: "var(--muted)",
        }}
      >
        Une idée à partager ?{" "}
        <a
          href="mailto:bonjour@zeroapi.app"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            textDecorationColor: "var(--accent)",
          }}
        >
          Propose un template
        </a>{" "}
        — on rémunère les contributeurs publiés.
      </div>
    </article>
  );
}
