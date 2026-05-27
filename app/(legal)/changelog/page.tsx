import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — ZeroAPI",
  description:
    "Historique des évolutions de ZeroAPI : releases, nouveautés, corrections et changements importants.",
};

type Section = {
  kind: "added" | "fixed" | "changed";
  title: string;
  items: string[];
};

type Release = {
  version: string;
  date: string;
  tag: "major" | "minor" | "patch";
  title: string;
  sections: Section[];
};

const RELEASES: Release[] = [
  {
    version: "0.9.0",
    date: "26 mai 2026",
    tag: "minor",
    title: "Pré-lancement : crédibilité, docs et templates",
    sections: [
      {
        kind: "added",
        title: "Nouveautés",
        items: [
          "Section comparaison ZeroAPI vs Supabase vs Firebase sur la landing.",
          "Vidéo screencast intégrée — démo en 3 chapitres.",
          "Documentation publique : Getting Started, Guides, API Reference.",
          "Galerie de 6 templates prêts à cloner.",
          "Page /changelog avec versionnement sémantique.",
        ],
      },
      {
        kind: "changed",
        title: "Évolutions",
        items: [
          "Footer : les liens Ressources pointent vers les nouvelles pages internes.",
          "Refonte du visuel « Comment ça marche » avec animations cycliques.",
        ],
      },
    ],
  },
  {
    version: "0.8.2",
    date: "12 mai 2026",
    tag: "patch",
    title: "Corrections du générateur",
    sections: [
      {
        kind: "fixed",
        title: "Bugs",
        items: [
          "Les relations N-N étaient parfois inversées dans le schéma Prisma.",
          "Les tests Vitest générés ne couvraient pas les routes DELETE soft.",
          "L'export Git ratait sur les noms de projet avec espaces.",
        ],
      },
    ],
  },
  {
    version: "0.8.0",
    date: "28 avril 2026",
    tag: "minor",
    title: "Paiements Mobile Money en bêta",
    sections: [
      {
        kind: "added",
        title: "Nouveautés",
        items: [
          "Intégration Wave Sénégal — webhooks signés, vérification HMAC.",
          "Intégration Orange Money CI / SN / ML — sandbox et production.",
          "Module de réconciliation quotidienne avec rapport exportable.",
          "Nouveau type de champ `money` avec devise et précision décimale.",
        ],
      },
      {
        kind: "changed",
        title: "Évolutions",
        items: [
          "Le prompt accepte désormais des montants en FCFA et EUR sans conversion manuelle.",
          "Les webhooks sortants gagnent un retry exponentiel jusqu'à 6 tentatives.",
        ],
      },
    ],
  },
  {
    version: "0.7.0",
    date: "5 avril 2026",
    tag: "minor",
    title: "Génération asynchrone",
    sections: [
      {
        kind: "added",
        title: "Nouveautés",
        items: [
          "Files d'attente Trigger.dev : tu peux fermer l'onglet pendant la génération.",
          "Notifications email + push web à la fin du job.",
          "Webhook Slack et Discord configurables par workspace.",
          "Console /jobs : suivi temps réel des générations en cours.",
        ],
      },
      {
        kind: "changed",
        title: "Évolutions",
        items: [
          "Temps moyen de génération réduit de 4 min à 2 min sur un backend de taille moyenne.",
        ],
      },
    ],
  },
  {
    version: "0.6.1",
    date: "18 mars 2026",
    tag: "patch",
    title: "Robustesse de la sécurité par défaut",
    sections: [
      {
        kind: "fixed",
        title: "Bugs",
        items: [
          "Les en-têtes CSP étaient trop permissifs sur les uploads.",
          "Le rate limiter ne respectait pas le préfixe `/admin/*`.",
        ],
      },
      {
        kind: "changed",
        title: "Évolutions",
        items: [
          "Hash des mots de passe migré de bcrypt vers argon2id.",
          "Cookies de session : Secure + HttpOnly + SameSite=Lax par défaut.",
        ],
      },
    ],
  },
  {
    version: "0.6.0",
    date: "1er mars 2026",
    tag: "minor",
    title: "Multi-langue : pidgin et wolof acceptés",
    sections: [
      {
        kind: "added",
        title: "Nouveautés",
        items: [
          "Le prompt comprend désormais le pidgin nigerian et le wolof courant.",
          "Détection automatique de la langue dominante du prompt.",
          "Suggestions de complétion dans la langue de l'utilisateur.",
        ],
      },
    ],
  },
  {
    version: "0.5.0",
    date: "10 février 2026",
    tag: "major",
    title: "Bêta publique",
    sections: [
      {
        kind: "added",
        title: "Nouveautés",
        items: [
          "Ouverture des inscriptions au grand public.",
          "Plan Gratuit avec 3 générations / mois.",
          "Plan Pro à 15 000 FCFA / mois (hébergement inclus).",
          "Tableau de bord workspace avec invitations d'équipe.",
          "Templates : e-commerce, blog, réservation, chat, marketplace, CRM.",
        ],
      },
      {
        kind: "changed",
        title: "Évolutions",
        items: [
          "Sortie de la bêta privée — merci aux 124 premiers builders ❤︎",
        ],
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <article className="changelog-wrap">
      <header className="changelog-head">
        <div className="eyebrow-row">Changelog</div>
        <h1>
          Ce qui a <em>changé</em>.
        </h1>
        <p>
          On versionne sémantiquement. Tu peux nous suivre par RSS (
          <a href="/changelog.rss" style={{ color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "var(--accent)" }}>
            flux
          </a>
          ) ou par email — réglages dans ton profil.
        </p>
      </header>

      <div className="changelog-list">
        {RELEASES.map((r) => (
          <article key={r.version} className="changelog-entry">
            <div className="changelog-meta">
              <div className="changelog-version">v{r.version}</div>
              <div className="changelog-date">{r.date}</div>
              <span className={`changelog-tag ${r.tag}`}>{r.tag}</span>
            </div>
            <div className="changelog-body">
              <h3>{r.title}</h3>
              {r.sections.map((s) => (
                <div key={s.title} className={`changelog-section ${s.kind}`}>
                  <h4>{s.title}</h4>
                  <ul>
                    {s.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </article>
  );
}
