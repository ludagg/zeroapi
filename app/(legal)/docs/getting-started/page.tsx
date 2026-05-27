import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Getting Started — ZeroAPI",
  description:
    "Du compte gratuit à ton premier endpoint déployé en moins de cinq minutes avec ZeroAPI.",
};

export default function GettingStartedPage() {
  return (
    <article className="docs-wrap">
      <header className="docs-head" style={{ textAlign: "left", marginBottom: 40 }}>
        <div className="eyebrow-row">
          <Link href="/docs">Documentation</Link> · Getting Started
        </div>
        <h1>
          Ton <em>premier backend</em> en cinq minutes.
        </h1>
        <p style={{ margin: 0 }}>
          Aucune installation locale. Un navigateur et l&apos;envie d&apos;écrire une
          phrase suffisent.
        </p>
      </header>

      <div className="docs-article">
        <aside className="docs-sidebar">
          <h4>Sur cette page</h4>
          <ul>
            <li>
              <a href="#account" className="active">
                1. Crée un compte
              </a>
            </li>
            <li>
              <a href="#prompt">2. Décris ton API</a>
            </li>
            <li>
              <a href="#review">3. Inspecte le code</a>
            </li>
            <li>
              <a href="#deploy">4. Déploie</a>
            </li>
            <li>
              <a href="#next">5. Et après ?</a>
            </li>
          </ul>
          <div className="docs-side-group">
            <h4>Aller plus loin</h4>
            <ul>
              <li>
                <Link href="/docs/guides">Guides</Link>
              </li>
              <li>
                <Link href="/docs/api">Référence API</Link>
              </li>
              <li>
                <Link href="/templates">Templates</Link>
              </li>
            </ul>
          </div>
        </aside>

        <div className="docs-body">
          <div className="docs-callout">
            <span className="docs-callout-icon">i</span>
            <div>
              <strong>Pas de carte bancaire requise.</strong> Le plan gratuit autorise
              3 générations par mois et l&apos;export Git complet.
            </div>
          </div>

          <h2 id="account">1. Crée un compte</h2>
          <p>
            Va sur <a href="/register">app.zeroapi.app/register</a>. Trois options
            d&apos;inscription :
          </p>
          <ul>
            <li>Email + mot de passe (vérification par lien magique)&nbsp;;</li>
            <li>OAuth Google&nbsp;;</li>
            <li>OAuth GitHub.</li>
          </ul>
          <p>
            La création du workspace par défaut se fait automatiquement. Tu peux inviter
            d&apos;autres membres plus tard depuis <code>Paramètres → Équipe</code>.
          </p>

          <h2 id="prompt">2. Décris ton API</h2>
          <p>
            Dans le dashboard, clique sur <strong>Nouvelle génération</strong>. Tu
            tombes sur l&apos;éditeur de prompt. Quelques règles utiles :
          </p>
          <ul>
            <li>Écris en français, anglais ou pidgin — ZeroAPI comprend les trois.</li>
            <li>
              Liste les <em>entités</em>, leurs <em>relations</em>, puis les{" "}
              <em>règles métier</em>.
            </li>
            <li>
              Précise les contraintes : auth, rôles, paiements, notifications, fichiers.
            </li>
          </ul>
          <p>Un exemple qui marche bien :</p>
          <pre className="docs-code">
            <span className="c"># Backend pour une app de livraison</span>
            {"\n"}
            <span className="k">Entités</span> : users, restaurants, plats,
            commandes, livreurs.
            {"\n"}
            <span className="k">Relations</span> : une commande appartient à un user,
            contient plusieurs plats, est assignée à un livreur.
            {"\n"}
            <span className="k">Règles</span> : seul l&apos;admin peut créer un
            restaurant. Un livreur ne voit que ses commandes en cours.
            {"\n"}
            <span className="k">Paiement</span> : Wave + Orange Money via webhook.
            {"\n"}
            <span className="k">Notifications</span> : push au client à chaque
            changement de statut.
          </pre>

          <h2 id="review">3. Inspecte le code généré</h2>
          <p>
            La génération est asynchrone — tu peux fermer l&apos;onglet, on te
            notifiera par email. Compte environ deux minutes pour un projet de taille
            moyenne. Quand c&apos;est prêt, tu accèdes à un explorateur de fichiers
            avec :
          </p>
          <ul>
            <li>Le schéma Prisma complet&nbsp;;</li>
            <li>
              Les routes Hono.js typées, regroupées par ressource (<code>routes/users.ts</code>,{" "}
              <code>routes/orders.ts</code>...)&nbsp;;
            </li>
            <li>Les tests Vitest générés en miroir des routes&nbsp;;</li>
            <li>
              La spec <strong>OpenAPI 3.1</strong> et un Swagger UI prêt à
              l&apos;emploi.
            </li>
          </ul>
          <p>
            Tu peux modifier directement dans la console, ou télécharger le repo Git en
            zip / git push.
          </p>

          <h2 id="deploy">4. Déploie</h2>
          <p>
            Trois chemins. Choisis selon ton confort :
          </p>
          <ul>
            <li>
              <strong>Hébergement ZeroAPI</strong> (plan Pro) : un clic, un sous-domaine{" "}
              <code>*.zeroapi.app</code>, c&apos;est en ligne.
            </li>
            <li>
              <strong>Déploiement chez un partenaire</strong> : connecte ton compte
              Railway, Render, Fly.io ou Vercel. ZeroAPI génère le{" "}
              <code>Dockerfile</code> et le manifest associé.
            </li>
            <li>
              <strong>Export Git</strong> : récupère le repo, fais ce que tu veux.
              Aucun lien magique avec ZeroAPI — tu pars libre.
            </li>
          </ul>

          <h2 id="next">5. Et après ?</h2>
          <p>
            Lis les <Link href="/docs/guides">guides</Link> pour les cas avancés
            (paiements, SSO, multi-tenant, webhooks signés), parcours la{" "}
            <Link href="/docs/api">référence API</Link> pour les détails endpoint par
            endpoint, ou regarde nos <Link href="/templates">templates</Link> si tu
            préfères partir d&apos;une base existante.
          </p>
          <p>
            Une question ? Écris-nous à{" "}
            <a href="mailto:bonjour@zeroapi.app">bonjour@zeroapi.app</a> — on répond
            sous 24h en semaine.
          </p>
        </div>
      </div>
    </article>
  );
}
