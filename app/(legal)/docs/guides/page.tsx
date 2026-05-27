import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guides — ZeroAPI",
  description:
    "Patterns concrets pour les backends ZeroAPI : authentification, Mobile Money, RBAC, webhooks, multi-tenant.",
};

const GUIDES = [
  {
    cat: "Authentification",
    items: [
      {
        slug: "jwt-oauth",
        title: "JWT + OAuth Google / GitHub",
        desc: "Activer la connexion par provider externe, gérer les refresh tokens rotatifs et lier plusieurs identités à un même compte.",
        time: "8 min",
      },
      {
        slug: "two-factor",
        title: "Double authentification (TOTP)",
        desc: "Forcer la 2FA pour les rôles admin, gérer les codes de récupération et les sessions de confiance.",
        time: "5 min",
      },
      {
        slug: "sso-saml",
        title: "SSO SAML / OIDC pour l'enterprise",
        desc: "Connecter Okta, Azure AD, Google Workspace. Auto-provisionnement et mapping des groupes.",
        time: "12 min",
      },
    ],
  },
  {
    cat: "Paiements Afrique",
    items: [
      {
        slug: "mobile-money",
        title: "Intégrer Wave, Orange Money, MTN MoMo",
        desc: "Webhook signé, statut idempotent, réconciliation quotidienne. Le code généré gère les trois en un seul flux.",
        time: "10 min",
      },
      {
        slug: "stripe",
        title: "Stripe pour les paiements carte",
        desc: "Checkout hosted, webhooks Stripe vérifiés, gestion des disputes et refunds.",
        time: "7 min",
      },
    ],
  },
  {
    cat: "Sécurité & permissions",
    items: [
      {
        slug: "rbac",
        title: "RBAC fin par rôle et ressource",
        desc: "Définir des rôles imbriqués, restreindre par champ, et générer des policies testées automatiquement.",
        time: "9 min",
      },
      {
        slug: "rate-limit",
        title: "Rate limiting par token et IP",
        desc: "Configurer des limites par endpoint, gérer les bursts et les exemptions pour partenaires de confiance.",
        time: "4 min",
      },
    ],
  },
  {
    cat: "Architecture",
    items: [
      {
        slug: "multi-tenant",
        title: "Multi-tenant : isoler les workspaces",
        desc: "Schéma partagé ou DB par tenant, middleware de contexte, garde-fous pour éviter les fuites cross-tenant.",
        time: "11 min",
      },
      {
        slug: "webhooks",
        title: "Webhooks sortants signés",
        desc: "Notifier des systèmes tiers avec retry exponentiel, signature HMAC et journal de livraison.",
        time: "6 min",
      },
      {
        slug: "cron",
        title: "Tâches planifiées (cron) et queues",
        desc: "Exécuter des jobs récurrents, gérer les rejouages et la dead-letter queue.",
        time: "8 min",
      },
    ],
  },
];

export default function GuidesIndexPage() {
  return (
    <article className="docs-wrap">
      <header className="docs-head" style={{ textAlign: "left", marginBottom: 40 }}>
        <div className="eyebrow-row">
          <Link href="/docs">Documentation</Link> · Guides
        </div>
        <h1>
          Guides <em>orientés pratique</em>.
        </h1>
        <p style={{ margin: 0 }}>
          Chaque guide part d&apos;un problème réel et finit par un backend qui le
          résout. Code commenté, captures d&apos;écran, prompt prêt à copier.
        </p>
      </header>

      <div className="docs-article" style={{ gridTemplateColumns: "1fr" }}>
        <div className="docs-body" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {GUIDES.map((cat) => (
            <section key={cat.cat}>
              <h2>{cat.cat}</h2>
              <ul style={{ listStyle: "none", padding: 0, gap: 10 }}>
                {cat.items.map((g) => (
                  <li key={g.slug}>
                    <div
                      className="docs-endpoint"
                      style={{ background: "var(--surface)", padding: 0 }}
                    >
                      <div className="docs-endpoint-head" style={{ background: "var(--surface)" }}>
                        <span
                          style={{
                            fontFamily: "var(--font-mono), monospace",
                            fontSize: 11,
                            color: "var(--muted)",
                          }}
                        >
                          {g.time}
                        </span>
                        <span
                          className="docs-endpoint-path"
                          style={{ fontFamily: "var(--font-serif), serif", fontStyle: "italic", fontSize: 18 }}
                        >
                          {g.title}
                        </span>
                      </div>
                      <div className="docs-endpoint-body">
                        <p>{g.desc}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
