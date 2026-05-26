import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique cookies — ZeroAPI",
  description:
    "Quels cookies utilise ZeroAPI, pourquoi, et comment les refuser ou les supprimer.",
};

export default function CookiesPage() {
  return (
    <article className="legal-wrap">
      <div className="eyebrow-row">Légal · Cookies</div>
      <h1>
        Politique <em style={{ fontStyle: "italic" }}>cookies</em>
      </h1>
      <div className="updated">Dernière mise à jour : 26 mai 2026</div>

      <div className="callout">
        Tu peux refuser tous les cookies non essentiels sans dégrader le
        fonctionnement du site. Aucun mur de consentement déguisé : un bouton
        « Refuser » est aussi visible que le bouton « Accepter ».
      </div>

      <h2>1. C&apos;est quoi un cookie ?</h2>
      <p>
        Un cookie est un petit fichier texte déposé par un site web sur ton appareil
        (ordinateur, mobile) via ton navigateur. Il peut contenir des informations
        comme un identifiant de session, une préférence d&apos;affichage, ou un
        compteur statistique. ZeroAPI utilise également des technologies similaires
        (localStorage, sessionStorage) — elles sont couvertes par cette politique.
      </p>

      <h2>2. Cookies utilisés par ZeroAPI</h2>

      <h3>2.1 Cookies strictement nécessaires</h3>
      <p>
        Ces cookies sont indispensables au fonctionnement du site. Ils ne nécessitent
        pas ton consentement.
      </p>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Finalité</th>
            <th>Durée</th>
            <th>Émetteur</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>zeroapi-session</code>
            </td>
            <td>Authentification (cookie httpOnly, secure, SameSite=Lax)</td>
            <td>30 jours</td>
            <td>ZeroAPI</td>
          </tr>
          <tr>
            <td>
              <code>zeroapi-csrf</code>
            </td>
            <td>Protection CSRF</td>
            <td>Session</td>
            <td>ZeroAPI</td>
          </tr>
          <tr>
            <td>
              <code>zeroapi-theme</code>
            </td>
            <td>Mémorise ta préférence clair / sombre (localStorage)</td>
            <td>1 an</td>
            <td>ZeroAPI</td>
          </tr>
          <tr>
            <td>
              <code>zeroapi-cookie-consent</code>
            </td>
            <td>Mémorise ton choix sur le bandeau cookies (localStorage)</td>
            <td>6 mois</td>
            <td>ZeroAPI</td>
          </tr>
        </tbody>
      </table>

      <h3>2.2 Cookies analytiques (consentement requis)</h3>
      <p>
        Si tu acceptes, nous utilisons un outil d&apos;analytique respectueux de la
        vie privée (Plausible Analytics, auto-hébergé en Europe). Aucune donnée
        personnelle n&apos;est collectée : pas d&apos;adresse IP complète, pas de
        fingerprint, pas de cookie cross-site. Plausible utilise un identifiant de
        session anonyme (haché par jour et par site) pour distinguer les visiteurs.
      </p>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Finalité</th>
            <th>Durée</th>
            <th>Émetteur</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>_pl_*</code>
            </td>
            <td>Mesure d&apos;audience anonyme (page vues, pays, referrer)</td>
            <td>24 h</td>
            <td>Plausible (auto-hébergé)</td>
          </tr>
        </tbody>
      </table>

      <h3>2.3 Cookies tiers</h3>
      <p>
        Si tu utilises l&apos;authentification Google ou GitHub OAuth, ces services
        peuvent déposer leurs propres cookies sur leurs domaines respectifs. Ils ne
        sont pas accessibles par ZeroAPI. Consulte leurs politiques :
      </p>
      <ul>
        <li>
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noreferrer"
          >
            Google — Politique de confidentialité
          </a>
        </li>
        <li>
          <a
            href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement"
            target="_blank"
            rel="noreferrer"
          >
            GitHub — Privacy Statement
          </a>
        </li>
      </ul>

      <h2>3. Gérer ton consentement</h2>
      <h3>3.1 Bandeau de consentement</h3>
      <p>
        Lors de ta première visite, un bandeau te propose d&apos;accepter ou de
        refuser les cookies non essentiels. Ton choix est mémorisé pendant 6 mois. Tu
        peux changer d&apos;avis à tout moment en :
      </p>
      <ul>
        <li>
          supprimant la clé <code>zeroapi-cookie-consent</code> dans le localStorage
          de ton navigateur, ou
        </li>
        <li>
          écrivant à <a href="mailto:dpo@zeroapi.io">dpo@zeroapi.io</a> qui prendra le
          relais.
        </li>
      </ul>
      <h3>3.2 Désactiver les cookies dans ton navigateur</h3>
      <p>
        Tu peux configurer ton navigateur pour bloquer ou supprimer les cookies. Les
        cookies strictement nécessaires sont indispensables au fonctionnement de
        l&apos;application : leur blocage empêchera la connexion.
      </p>
      <ul>
        <li>
          <a
            href="https://support.mozilla.org/fr/kb/cookies-informations-sites-enregistrent"
            target="_blank"
            rel="noreferrer"
          >
            Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noreferrer"
          >
            Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/fr-fr/guide/safari/sfri11471"
            target="_blank"
            rel="noreferrer"
          >
            Safari
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/fr-fr/microsoft-edge"
            target="_blank"
            rel="noreferrer"
          >
            Edge
          </a>
        </li>
      </ul>

      <h2>4. Pas de tracking publicitaire</h2>
      <p>
        ZeroAPI ne diffuse pas de publicité, ne s&apos;intègre à aucune régie publicitaire
        et ne partage aucun cookie à des fins de profilage marketing. Pas de Facebook
        Pixel, pas de Google Ads, pas de retargeting.
      </p>

      <h2>5. Évolution</h2>
      <p>
        Cette politique peut évoluer pour suivre nos pratiques et la réglementation.
        La date en haut de page indique la dernière mise à jour. En cas de
        modification significative, nous t&apos;en informerons par email ou via un
        nouveau bandeau de consentement.
      </p>

      <h2>6. Contact</h2>
      <p>
        Questions ? <a href="mailto:dpo@zeroapi.io">dpo@zeroapi.io</a>.
      </p>
    </article>
  );
}
