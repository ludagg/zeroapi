import Link from "next/link";
import { Reveal } from "@/components/landing/reveal";

type Tpl = {
  emoji: string;
  title: string;
  category: string;
  uses: string;
  official?: boolean;
  author?: string;
};

const TEMPLATES: Tpl[] = [
  { emoji: "🛒", title: "E-commerce Mobile Money", category: "Commerce", uses: "1,2k", official: true },
  { emoji: "🚌", title: "Réservation de transport", category: "Mobilité", uses: "840", official: true },
  { emoji: "🏥", title: "Prise de rendez-vous clinique", category: "Santé", uses: "610", official: true },
  { emoji: "💬", title: "Chat & messagerie temps réel", category: "Social", uses: "590", author: "aminata.k" },
  { emoji: "📦", title: "Gestion de stock multi-entrepôts", category: "Logistique", uses: "430", author: "kofi.dev" },
  { emoji: "🎓", title: "Plateforme e-learning", category: "Éducation", uses: "380", author: "ENSEA" },
];

function TemplateCard({ t }: { t: Tpl }) {
  return (
    <article className="mkt-card">
      <div className="mkt-card-top">
        <span className="mkt-emoji" aria-hidden="true">
          {t.emoji}
        </span>
        <span className={`mkt-badge${t.official ? " official" : ""}`}>
          {t.official ? "★ Officiel" : "Communauté"}
        </span>
      </div>
      <h3 className="mkt-title">{t.title}</h3>
      <div className="mkt-meta">
        <span className="mkt-cat">{t.category}</span>
        <span className="mkt-uses">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          {t.uses} utilisations
        </span>
      </div>
      <div className="mkt-foot">
        {t.author ? (
          <span className="mkt-author">par {t.author}</span>
        ) : (
          <span className="mkt-author">par ZeroAPI</span>
        )}
        <span className="mkt-use">Utiliser →</span>
      </div>
    </article>
  );
}

export function Marketplace() {
  return (
    <section id="marketplace" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">Marketplace</span>
          <h2 className="display">
            Pars d&apos;un <em>template</em>,
            <br />
            pas d&apos;une page blanche.
          </h2>
          <p>
            Templates officiels et créations de la communauté. Charge-en un dans le chat,
            adapte-le à ton besoin avec Kia, génère. Et publie les tiens — en privé pour
            ton équipe, ou en public pour tout le monde.
          </p>
        </Reveal>

        <Reveal as="div" className="mkt-grid" delay={80}>
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.title} t={t} />
          ))}
        </Reveal>

        <Reveal as="div" className="mkt-cta" delay={120}>
          <div className="mkt-publish">
            <div className="mkt-publish-toggle">
              <span className="mkt-pub-opt">🔒 Privé</span>
              <span className="mkt-pub-opt on">🌍 Public</span>
            </div>
            <p>
              Transforme n&apos;importe quel job en template publiable. Tu choisis qui peut
              le réutiliser.
            </p>
          </div>
          <Link href="/templates" className="btn btn-ghost">
            Explorer la marketplace
            <svg
              className="arrow"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
