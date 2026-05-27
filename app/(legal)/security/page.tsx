import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sécurité — ZeroAPI",
  description:
    "Architecture de sécurité de ZeroAPI : chiffrement, authentification, code généré sécurisé, divulgation responsable.",
};

export default function SecurityPage() {
  return (
    <article className="legal-wrap">
      <div className="eyebrow-row">Sécurité</div>
      <h1>
        <em style={{ fontStyle: "italic" }}>Sécurité</em> chez ZeroAPI
      </h1>
      <div className="updated">Dernière mise à jour : 26 mai 2026</div>

      <div className="callout">
        On prend la sécurité au sérieux parce qu&apos;on génère du code qui ira en
        production. Voici comment on protège ta plateforme, tes données et le code
        qu&apos;on produit pour toi.
      </div>

      <h2>1. Chiffrement</h2>
      <ul>
        <li>
          <strong>En transit</strong> : toutes les communications utilisent TLS 1.3 (TLS
          1.2 minimum pour la rétro-compatibilité). HSTS activé, redirection automatique
          HTTPS.
        </li>
        <li>
          <strong>Au repos</strong> : bases de données et stockage objet chiffrés en
          AES-256. Les sauvegardes le sont aussi.
        </li>
        <li>
          <strong>Secrets</strong> : variables d&apos;environnement chiffrées,
          rotation trimestrielle des clés sensibles, séparation stricte des
          environnements (dev, staging, prod).
        </li>
      </ul>

      <h2>2. Authentification et accès</h2>
      <ul>
        <li>
          Mots de passe hachés avec <strong>argon2id</strong>, jamais stockés en clair.
        </li>
        <li>
          OAuth 2.0 avec Google et GitHub (le mot de passe n&apos;est jamais transmis à
          ZeroAPI).
        </li>
        <li>
          <strong>Double authentification (2FA)</strong> par TOTP (applications type
          Authy, Google Authenticator) disponible pour tous les comptes, obligatoire
          pour les plans Business.
        </li>
        <li>
          Sessions à expiration courte côté UI, refresh tokens rotatifs côté API.
        </li>
        <li>
          <strong>SSO SAML / OIDC</strong> disponible sur le plan Business pour les
          organisations.
        </li>
        <li>
          <strong>Accès du personnel</strong> : principe du moindre privilège, MFA
          obligatoire, audit log de toutes les actions admin.
        </li>
      </ul>

      <h2>3. Sécurité du code généré</h2>
      <p>
        Chaque backend généré par ZeroAPI inclut par défaut :
      </p>
      <ul>
        <li>
          Validation Zod sur toutes les entrées (body, params, query, headers)&nbsp;;
        </li>
        <li>
          Échappement contextuel anti-XSS et requêtes paramétrées anti-SQLi
          (Prisma)&nbsp;;
        </li>
        <li>
          En-têtes de sécurité HTTP (Helmet) : CSP, X-Frame-Options, Referrer-Policy,
          Permissions-Policy&nbsp;;
        </li>
        <li>
          CORS strict configuré explicitement, pas de wildcard sauf demande&nbsp;;
        </li>
        <li>
          Rate limiting par IP et par token, configurable par endpoint&nbsp;;
        </li>
        <li>
          Authentification JWT signée HS256 ou RS256, expiration courte et rotation des
          clés&nbsp;;
        </li>
        <li>RBAC fin par rôle et par ressource&nbsp;;</li>
        <li>
          Logging structuré avec masquage automatique des champs sensibles (mots de
          passe, tokens, numéros de carte).
        </li>
      </ul>
      <p>
        Une <strong>revue statique de sécurité</strong> (analyse AST + règles
        propriétaires) est exécutée avant la livraison du code, et toute alerte
        critique bloque la génération.
      </p>

      <h2>4. Infrastructure</h2>
      <ul>
        <li>
          Hébergement sur AWS (régions <code>eu-west-3</code>, <code>eu-central-1</code>
          ) et OVH (Roubaix, Strasbourg). Région Afrique (Dakar) en cours de
          déploiement.
        </li>
        <li>
          Cloudflare en frontal : protection DDoS, WAF, mitigation bot.
        </li>
        <li>
          Sauvegardes chiffrées toutes les 6 heures, conservation 30 jours, restauration
          testée mensuellement.
        </li>
        <li>
          Architecture multi-AZ, réplication automatique des données critiques.
        </li>
      </ul>

      <h2>5. Cycle de vie des secrets clients</h2>
      <p>
        Les secrets que tu fournis pour déployer (clés API Stripe, tokens cloud,
        identifiants base de données) sont :
      </p>
      <ul>
        <li>
          chiffrés côté client avec une clé dérivée par PBKDF2 avant transit&nbsp;;
        </li>
        <li>stockés dans un coffre dédié (Vault), jamais en clair en base&nbsp;;</li>
        <li>
          injectés en variables d&apos;environnement uniquement au moment du
          déploiement&nbsp;;
        </li>
        <li>supprimés du coffre 24 h après le déploiement réussi.</li>
      </ul>

      <h2>6. Gestion des incidents</h2>
      <p>
        Notre équipe de garde est joignable 24/7 pour les plans Business. En cas
        d&apos;incident affectant tes données :
      </p>
      <ul>
        <li>
          Notification par email et sur{" "}
          <a href="https://status.zeroapi.app" target="_blank" rel="noreferrer">
            status.zeroapi.app
          </a>{" "}
          dans les 4 heures.
        </li>
        <li>
          Notification CDP (Sénégal) et CNIL (France) dans les 72 heures en cas de
          violation de données personnelles, conformément au RGPD article 33.
        </li>
        <li>
          Rapport post-mortem public publié dans les 14 jours après résolution.
        </li>
      </ul>

      <h2>7. Programme de divulgation responsable</h2>
      <p>
        Tu as trouvé une faille ? Merci. Écris à{" "}
        <a href="mailto:security@zeroapi.app">security@zeroapi.app</a>{" "}
        (clé PGP disponible sur demande) avec :
      </p>
      <ul>
        <li>une description du problème et des étapes pour le reproduire&nbsp;;</li>
        <li>l&apos;impact estimé&nbsp;;</li>
        <li>tes coordonnées si tu souhaites être crédité.</li>
      </ul>
      <p>
        On accuse réception sous 48 h ouvrées. Pour les vulnérabilités confirmées,
        nous proposons des récompenses (« bug bounty ») selon la gravité, de 50 € à
        2 000 €. Toute découverte effectuée de bonne foi et dans le respect du
        périmètre ne donnera lieu à aucune poursuite.
      </p>
      <p>
        <strong>Hors périmètre</strong> : déni de service, ingénierie sociale, attaques
        physiques, vulnérabilités déjà reportées, tests sur les comptes
        d&apos;utilisateurs sans leur consentement.
      </p>

      <h2>8. Conformité et audits</h2>
      <ul>
        <li>
          Conformité RGPD et loi sénégalaise n° 2008-12 — voir{" "}
          <a href="/gdpr">notre page RGPD</a>.
        </li>
        <li>
          Certification ISO 27001 en cours (objectif Q4 2026).
        </li>
        <li>
          Tests d&apos;intrusion externes annuels, rapports résumés disponibles sur
          demande pour les clients Business.
        </li>
        <li>
          Revue de code obligatoire à deux pour toute modification touchant
          l&apos;authentification, le stockage, le paiement ou la génération.
        </li>
      </ul>

      <h2>9. Ton rôle</h2>
      <p>
        La sécurité est un travail d&apos;équipe. Quelques recommandations :
      </p>
      <ul>
        <li>active la 2FA, utilise un gestionnaire de mots de passe&nbsp;;</li>
        <li>
          ne mets pas de vrais secrets dans tes prompts (utilise des placeholders)&nbsp;;
        </li>
        <li>relis le code généré avant un déploiement en production&nbsp;;</li>
        <li>
          maintiens à jour les dépendances de ton projet — on intègre Dependabot par
          défaut dans le repo généré.
        </li>
      </ul>

      <h2>10. Contact</h2>
      <p>
        Questions techniques :{" "}
        <a href="mailto:security@zeroapi.app">security@zeroapi.app</a>
        <br />
        Conformité et données :{" "}
        <a href="mailto:dpo@zeroapi.app">dpo@zeroapi.app</a>
      </p>
    </article>
  );
}
